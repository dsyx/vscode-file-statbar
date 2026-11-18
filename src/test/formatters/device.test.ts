import assert from 'node:assert/strict';
import { formatDevice } from '../../formatters/device.js';

suite('device formatter tests', () => {
	test('should format Linux 64-bit device numbers with major/minor', () => {
		assert.strictEqual(formatDevice(0x17n, 'linux'), '0x17 (0,23)');
		assert.strictEqual(formatDevice(0x801n, 'linux'), '0x801 (8,1)');
		assert.strictEqual(formatDevice(0x2a3b4cn, 'linux'), '0x2A3B4C (2619,588)');

		// High major (>= 4096) occupies bits 44..63 and must not bleed into minor bits 32..51.
		const encodedHighMajor = (0x1000n << 32n) | 0x0001n;
		assert.strictEqual(formatDevice(encodedHighMajor, 'linux'), '0x100000000001 (4096,1)');

		// High minor (>= 256) occupies bits 20..43.
		const encodedHighMinor = (0x1n << 20n) | 0x45n;
		assert.strictEqual(formatDevice(encodedHighMinor, 'linux'), '0x100045 (0,325)');
	});

	test('should format macOS (Darwin) 32-bit device numbers with 8/24 split', () => {
		assert.strictEqual(formatDevice(0x01000004n, 'darwin'), '0x1000004 (1,4)');
		assert.strictEqual(formatDevice(0x12abcdefn, 'darwin'), '0x12ABCDEF (18,11259375)');
	});

	test('should format Windows and other platforms as uppercase hex without major/minor', () => {
		assert.strictEqual(formatDevice(0x2a3b4cn, 'win32'), '0x2A3B4C');
		assert.strictEqual(formatDevice(0x17n, 'win32'), '0x17');
		assert.strictEqual(formatDevice(0x2a3b4cn, 'freebsd'), '0x2A3B4C');
	});

	test('should return undefined for negative device values', () => {
		assert.strictEqual(formatDevice(-1n, 'linux'), undefined);
		assert.strictEqual(formatDevice(-1n, 'win32'), undefined);
	});
});
