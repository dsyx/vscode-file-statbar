import assert from 'node:assert/strict';
import { formatNanosecondTimestamp, formatTimestamp } from '../time.js';

suite('timestamp formatter tests', () => {
	const fixedDate = new Date(2026, 9, 29, 13, 59, 26, 557);

	test('should format full ISO 8601 local timestamp with colon-separated offset', () => {
		const formatted = formatTimestamp(fixedDate, 'iso-8601');
		assert.ok(formatted !== undefined);
		assert.match(formatted, /^2026-10-29T13:59:26[+-]\d{2}:\d{2}$/);
		assert.ok(!formatted.endsWith('-00:00'));
	});

	test('should format UTC ISO 8601 timestamp independent of local timezone', () => {
		const utcDate = new Date('2026-11-16T01:43:22.999Z');
		assert.strictEqual(formatTimestamp(utcDate, 'iso-utc'), '2026-11-16T01:43:22Z');
	});

	test('should format local datetime by default and with iso-datetime', () => {
		assert.strictEqual(formatTimestamp(fixedDate), '2026-10-29 13:59:26');
		assert.strictEqual(formatTimestamp(fixedDate, 'iso-datetime'), '2026-10-29 13:59:26');
	});

	test('should format local date and time presets', () => {
		assert.strictEqual(formatTimestamp(fixedDate, 'iso-date'), '2026-10-29');
		assert.strictEqual(formatTimestamp(fixedDate, 'iso-time'), '13:59:26');

		const earlyDate = new Date(2026, 0, 5, 0, 4, 9);
		assert.strictEqual(formatTimestamp(earlyDate, 'iso-datetime'), '2026-01-05 00:04:09');
		assert.strictEqual(formatTimestamp(earlyDate, 'iso-date'), '2026-01-05');
		assert.strictEqual(formatTimestamp(earlyDate, 'iso-time'), '00:04:09');
	});

	test('should zero-pad years under 1000 and preserve negative years cleanly', () => {
		const lowYearLocal = new Date(2000, 0, 2, 3, 4, 5);
		lowYearLocal.setFullYear(5);
		assert.strictEqual(formatTimestamp(lowYearLocal, 'iso-datetime'), '0005-01-02 03:04:05');
		assert.strictEqual(formatTimestamp(lowYearLocal, 'iso-date'), '0005-01-02');

		const lowYearUtc = new Date('2000-01-02T03:04:05Z');
		lowYearUtc.setUTCFullYear(5);
		assert.strictEqual(formatTimestamp(lowYearUtc, 'iso-utc'), '0005-01-02T03:04:05Z');

		const negativeYearUtc = new Date('2000-01-02T03:04:05Z');
		negativeYearUtc.setUTCFullYear(-5);
		assert.strictEqual(formatTimestamp(negativeYearUtc, 'iso-utc'), '-0005-01-02T03:04:05Z');
	});

	test('should return undefined for invalid dates and unsupported formats', () => {
		assert.strictEqual(formatTimestamp(new Date('invalid')), undefined);
		assert.strictEqual(formatTimestamp(new Date('invalid'), 'iso-8601'), undefined);
		assert.strictEqual(formatTimestamp(new Date('invalid'), 'iso-utc'), undefined);

		for (const format of ['', 'invalid', 'full-iso', 'iso-long', '%F', 'toString', 'constructor']) {
			assert.strictEqual(formatTimestamp(fixedDate, format), undefined, format);
		}
	});

	test('should format nanosecond timestamps and fallback millisecond dates cleanly', () => {
		const baseSec = BigInt(Math.floor(fixedDate.getTime() / 1000));
		const ns = baseSec * 1_000_000_000n + 44n;
		const formattedNs = formatNanosecondTimestamp(ns, fixedDate);
		assert.ok(formattedNs !== undefined);
		assert.match(formattedNs, /^2026-10-29 13:59:26\.000000044 [+-]\d{4}$/);

		const formattedFallback = formatNanosecondTimestamp(undefined, fixedDate);
		assert.ok(formattedFallback !== undefined);
		assert.match(formattedFallback, /^2026-10-29 13:59:26\.557000000 [+-]\d{4}$/);

		// Negative sub-second timestamp adjustment (-0.000000001s -> 1969-12-31 23:59:59.999999999 UTC).
		const preEpoch = formatNanosecondTimestamp(-1n);
		assert.ok(preEpoch !== undefined);
		assert.match(preEpoch, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:59\.999999999 [+-]\d{4}$/);

		assert.strictEqual(formatNanosecondTimestamp(undefined, undefined), undefined);
		assert.strictEqual(formatNanosecondTimestamp(undefined, new Date('invalid')), undefined);
		assert.strictEqual(formatNanosecondTimestamp(10n ** 30n), undefined);
	});
});
