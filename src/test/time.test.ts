import assert from 'node:assert/strict';
import { formatTimestamp } from '../time.js';

suite('Timestamp Formatter Test Suite', () => {
	const toNs = (date: Date): bigint => BigInt(date.getTime()) * 1_000_000n;
	const fixedDate = new Date(2026, 9, 29, 13, 59, 26, 557);
	const fixedNs = toNs(fixedDate);

	test('should format full ISO 8601 local timestamp with colon-separated offset', () => {
		const formatted = formatTimestamp(fixedNs, 'iso-8601');
		assert.ok(formatted !== undefined);
		assert.match(formatted, /^2026-10-29T13:59:26[+-]\d{2}:\d{2}$/);
		assert.ok(!formatted.endsWith('-00:00'));
	});

	test('should format UTC ISO 8601 timestamp independent of local timezone', () => {
		const utcNs = toNs(new Date('2026-11-16T01:43:22.999Z'));
		assert.strictEqual(formatTimestamp(utcNs, 'iso-utc'), '2026-11-16T01:43:22Z');
	});

	test('should format local datetime by default and with datetime', () => {
		assert.strictEqual(formatTimestamp(fixedNs), '2026-10-29 13:59:26');
		assert.strictEqual(formatTimestamp(fixedNs, 'datetime'), '2026-10-29 13:59:26');
	});

	test('should format local date and time presets', () => {
		assert.strictEqual(formatTimestamp(fixedNs, 'date'), '2026-10-29');
		assert.strictEqual(formatTimestamp(fixedNs, 'time'), '13:59:26');

		const earlyNs = toNs(new Date(2026, 0, 5, 0, 4, 9));
		assert.strictEqual(formatTimestamp(earlyNs, 'datetime'), '2026-01-05 00:04:09');
		assert.strictEqual(formatTimestamp(earlyNs, 'date'), '2026-01-05');
		assert.strictEqual(formatTimestamp(earlyNs, 'time'), '00:04:09');
	});

	test('should zero-pad years under 1000 and preserve negative years cleanly', () => {
		const lowYearLocal = new Date(2000, 0, 2, 3, 4, 5);
		lowYearLocal.setFullYear(5);
		assert.strictEqual(formatTimestamp(toNs(lowYearLocal), 'datetime'), '0005-01-02 03:04:05');
		assert.strictEqual(formatTimestamp(toNs(lowYearLocal), 'date'), '0005-01-02');

		const lowYearUtc = new Date('2000-01-02T03:04:05Z');
		lowYearUtc.setUTCFullYear(5);
		assert.strictEqual(formatTimestamp(toNs(lowYearUtc), 'iso-utc'), '0005-01-02T03:04:05Z');

		const negativeYearUtc = new Date('2000-01-02T03:04:05Z');
		negativeYearUtc.setUTCFullYear(-5);
		assert.strictEqual(formatTimestamp(toNs(negativeYearUtc), 'iso-utc'), '-0005-01-02T03:04:05Z');
	});

	test('should return undefined for out-of-range timestamps and unsupported formats', () => {
		assert.strictEqual(formatTimestamp(10n ** 30n), undefined);
		assert.strictEqual(formatTimestamp(10n ** 30n, 'iso-8601'), undefined);
		assert.strictEqual(formatTimestamp(-(10n ** 30n), 'iso-utc'), undefined);
		assert.strictEqual(formatTimestamp(10n ** 30n, 'gnu-full-iso'), undefined);

		for (const format of ['', 'invalid', 'iso-datetime', 'iso-date', 'iso-time', 'full-iso', 'iso-long', '%F']) {
			assert.strictEqual(formatTimestamp(fixedNs, format), undefined, format);
		}
	});

	test('should format gnu-full-iso nanosecond timestamps and pre-epoch sub-second values cleanly', () => {
		const baseSec = BigInt(Math.floor(fixedDate.getTime() / 1000));
		const ns = baseSec * 1_000_000_000n + 44n;
		const formattedNs = formatTimestamp(ns, 'gnu-full-iso');
		assert.ok(formattedNs !== undefined);
		assert.match(formattedNs, /^2026-10-29 13:59:26\.000000044 [+-]\d{4}$/);

		const formattedMs = formatTimestamp(fixedNs, 'gnu-full-iso');
		assert.ok(formattedMs !== undefined);
		assert.match(formattedMs, /^2026-10-29 13:59:26\.557000000 [+-]\d{4}$/);

		// Negative sub-second timestamp adjustment (-0.000000001s -> 1969-12-31 23:59:59.999999999 UTC).
		assert.strictEqual(formatTimestamp(-1n, 'iso-utc'), '1969-12-31T23:59:59Z');
		const preEpoch = formatTimestamp(-1n, 'gnu-full-iso');
		assert.ok(preEpoch !== undefined);
		assert.match(preEpoch, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:59\.999999999 [+-]\d{4}$/);
	});
});
