import assert from 'node:assert/strict';
import { formatSize } from '../size.js';

suite('Size Formatter Test Suite', () => {
	test('should format raw bytes by default and explicitly', () => {
		assert.strictEqual(formatSize(0n), '0 B');
		assert.strictEqual(formatSize(1178n), '1178 B');
		assert.strictEqual(formatSize(1178n, 'bytes'), '1178 B');
	});

	test('should format metric size (SI 1000-based) with lowercase kB', () => {
		assert.strictEqual(formatSize(0n, 'si'), '0 B');
		assert.strictEqual(formatSize(500n, 'si'), '500 B');
		assert.strictEqual(formatSize(1000n, 'si'), '1.00 kB');
		assert.strictEqual(formatSize(1178n, 'si'), '1.18 kB');
		assert.strictEqual(formatSize(1_000_000n, 'si'), '1.00 MB');
	});

	test('should format binary size (IEC 1024-based)', () => {
		assert.strictEqual(formatSize(0n, 'iec'), '0 B');
		assert.strictEqual(formatSize(512n, 'iec'), '512 B');
		assert.strictEqual(formatSize(1024n, 'iec'), '1.00 KiB');
		assert.strictEqual(formatSize(1178n, 'iec'), '1.15 KiB');
		assert.strictEqual(formatSize(1024n * 1024n, 'iec'), '1.00 MiB');
		assert.strictEqual(formatSize(1024n * 1024n * 1024n, 'iec'), '1.00 GiB');
	});

	test('should correctly rollover when rounding up to base', () => {
		assert.strictEqual(formatSize(999_999n, 'si'), '1.00 MB');
		assert.strictEqual(formatSize(1_048_575n, 'iec'), '1.00 MiB');
	});

	test('should saturate at the maximum unit without rolling over', () => {
		assert.strictEqual(formatSize(2000n * 1000n ** 6n, 'si'), '2000.00 EB');
		assert.strictEqual(formatSize(2048n * 1024n ** 6n, 'iec'), '2048.00 EiB');
	});

	test('should return undefined for unknown formats', () => {
		assert.strictEqual(formatSize(1178n, 'invalid'), undefined);
	});
});
