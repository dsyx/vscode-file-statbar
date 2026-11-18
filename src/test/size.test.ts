import assert from 'node:assert/strict';
import { formatSize } from '../size.js';

suite('size formatter tests', () => {
	test('should format raw bytes by default and explicitly', () => {
		assert.strictEqual(formatSize(0), '0 B');
		assert.strictEqual(formatSize(1178), '1178 B');
		assert.strictEqual(formatSize(1178, 'bytes'), '1178 B');
	});

	test('should format metric size (SI 1000-based) with lowercase kB', () => {
		assert.strictEqual(formatSize(0, 'si'), '0 B');
		assert.strictEqual(formatSize(500, 'si'), '500 B');
		assert.strictEqual(formatSize(1000, 'si'), '1.00 kB');
		assert.strictEqual(formatSize(1178, 'si'), '1.18 kB');
		assert.strictEqual(formatSize(1_000_000, 'si'), '1.00 MB');
	});

	test('should format binary size (IEC 1024-based)', () => {
		assert.strictEqual(formatSize(0, 'iec'), '0 B');
		assert.strictEqual(formatSize(512, 'iec'), '512 B');
		assert.strictEqual(formatSize(1024, 'iec'), '1.00 KiB');
		assert.strictEqual(formatSize(1178, 'iec'), '1.15 KiB');
		assert.strictEqual(formatSize(1024 * 1024, 'iec'), '1.00 MiB');
		assert.strictEqual(formatSize(1024 * 1024 * 1024, 'iec'), '1.00 GiB');
	});

	test('should correctly rollover when toFixed(2) rounds up to base', () => {
		assert.strictEqual(formatSize(999_999, 'si'), '1.00 MB');
		assert.strictEqual(formatSize(1_048_575, 'iec'), '1.00 MiB');
	});

	test('should saturate at the maximum unit without rolling over', () => {
		assert.strictEqual(formatSize(2000 * 1000 ** 6, 'si'), '2000.00 EB');
		assert.strictEqual(formatSize(2048 * 1024 ** 6, 'iec'), '2048.00 EiB');
	});

	test('should return undefined for negative or non-finite bytes, and unknown formats', () => {
		assert.strictEqual(formatSize(-1, 'bytes'), undefined);
		assert.strictEqual(formatSize(1.5, 'bytes'), undefined);
		assert.strictEqual(formatSize(Number.POSITIVE_INFINITY, 'si'), undefined);
		assert.strictEqual(formatSize(1178, 'invalid'), undefined);
		assert.strictEqual(formatSize(1178, 'toString'), undefined);
		assert.strictEqual(formatSize(1178, 'constructor'), undefined);
		assert.strictEqual(formatSize(Number.NaN, 'iec'), undefined);
	});
});
