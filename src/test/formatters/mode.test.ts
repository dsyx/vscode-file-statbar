import assert from 'node:assert/strict';
import { formatMode } from '../../formatters/mode.js';

suite('mode formatter tests', () => {
	test('should format regular file symbolic permissions', () => {
		assert.strictEqual(formatMode(0o100644), '-rw-r--r--');
		assert.strictEqual(formatMode(0o100644, 's'), '-rw-r--r--');
		assert.strictEqual(formatMode(0o100755), '-rwxr-xr-x');
		assert.strictEqual(formatMode(0o100755, 's'), '-rwxr-xr-x');
		assert.strictEqual(formatMode(0o100600), '-rw-------');
		assert.strictEqual(formatMode(0o100000), '----------');
	});

	test('should format directory, symlink, and special file types (c, b, p, s)', () => {
		assert.strictEqual(formatMode(0o040755), 'drwxr-xr-x');
		assert.strictEqual(formatMode(0o120777), 'lrwxrwxrwx');
		assert.strictEqual(formatMode(0o120644), 'lrw-r--r--');
		assert.strictEqual(formatMode(0o020666), 'crw-rw-rw-');
		assert.strictEqual(formatMode(0o060660), 'brw-rw----');
		assert.strictEqual(formatMode(0o010644), 'prw-r--r--');
		assert.strictEqual(formatMode(0o140755), 'srwxr-xr-x');
	});

	test('should format special bit characters (s, S, t, T)', () => {
		assert.strictEqual(formatMode(0o104755), '-rwsr-xr-x');
		assert.strictEqual(formatMode(0o104655), '-rwSr-xr-x');
		assert.strictEqual(formatMode(0o102755), '-rwxr-sr-x');
		assert.strictEqual(formatMode(0o102745), '-rwxr-Sr-x');
		assert.strictEqual(formatMode(0o041777), 'drwxrwxrwt');
		assert.strictEqual(formatMode(0o041776), 'drwxrwxrwT');
	});

	test('should format binary, octal, decimal, and hex mode modifiers', () => {
		assert.strictEqual(formatMode(0o100644, 'b'), '1000000110100100');
		assert.strictEqual(formatMode(0o100644, 'o'), '100644');
		assert.strictEqual(formatMode(0o100755, 'o'), '100755');
		assert.strictEqual(formatMode(0o104755, 'o'), '104755');
		assert.strictEqual(formatMode(0o102755, 'o'), '102755');
		assert.strictEqual(formatMode(0o041777, 'o'), '041777');
		assert.strictEqual(formatMode(0o100644, 'd'), '33188');
		assert.strictEqual(formatMode(0o100644, 'x'), '81a4');
		assert.strictEqual(formatMode(0o100644, 'X'), '81A4');

		assert.strictEqual(formatMode(0o000755, 's'), '?rwxr-xr-x');
		assert.strictEqual(formatMode(0o000755, 'b'), '0000000111101101');
		assert.strictEqual(formatMode(0o000755, 'o'), '000755');
		assert.strictEqual(formatMode(0o000755, 'x'), '01ed');
		assert.strictEqual(formatMode(0o000755, 'X'), '01ED');
		assert.strictEqual(formatMode(0o100644, 'invalid'), undefined);
		assert.strictEqual(formatMode(0o100644, 'toString'), undefined);
		assert.strictEqual(formatMode(0o100644, 'constructor'), undefined);
	});

	test('should return undefined for invalid mode across all modifiers', () => {
		for (const invalid of [Number.NaN, -1, 1.5, 0x10000, Number.POSITIVE_INFINITY]) {
			assert.strictEqual(formatMode(invalid), undefined);
			assert.strictEqual(formatMode(invalid, 's'), undefined);
			assert.strictEqual(formatMode(invalid, 'b'), undefined);
			assert.strictEqual(formatMode(invalid, 'o'), undefined);
			assert.strictEqual(formatMode(invalid, 'd'), undefined);
			assert.strictEqual(formatMode(invalid, 'x'), undefined);
			assert.strictEqual(formatMode(invalid, 'X'), undefined);
		}
	});
});
