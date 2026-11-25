import assert from 'node:assert/strict';
import { formatFileType, formatMode, formatPermissions } from '../mode.js';

suite('Mode Formatter Test Suite', () => {
	test('should format regular file symbolic permissions', () => {
		assert.strictEqual(formatMode(0o100644n), '-rw-r--r--');
		assert.strictEqual(formatMode(0o100644n, 's'), '-rw-r--r--');
		assert.strictEqual(formatMode(0o100755n), '-rwxr-xr-x');
		assert.strictEqual(formatMode(0o100755n, 's'), '-rwxr-xr-x');
		assert.strictEqual(formatMode(0o100600n), '-rw-------');
		assert.strictEqual(formatMode(0o100000n), '----------');
	});

	test('should format directory, symlink, and special file types (c, b, p, s)', () => {
		assert.strictEqual(formatMode(0o040755n), 'drwxr-xr-x');
		assert.strictEqual(formatMode(0o120777n), 'lrwxrwxrwx');
		assert.strictEqual(formatMode(0o120644n), 'lrw-r--r--');
		assert.strictEqual(formatMode(0o020666n), 'crw-rw-rw-');
		assert.strictEqual(formatMode(0o060660n), 'brw-rw----');
		assert.strictEqual(formatMode(0o010644n), 'prw-r--r--');
		assert.strictEqual(formatMode(0o140755n), 'srwxr-xr-x');
	});

	test('should format special bit characters (s, S, t, T)', () => {
		assert.strictEqual(formatMode(0o104755n), '-rwsr-xr-x');
		assert.strictEqual(formatMode(0o104655n), '-rwSr-xr-x');
		assert.strictEqual(formatMode(0o102755n), '-rwxr-sr-x');
		assert.strictEqual(formatMode(0o102745n), '-rwxr-Sr-x');
		assert.strictEqual(formatMode(0o041777n), 'drwxrwxrwt');
		assert.strictEqual(formatMode(0o041776n), 'drwxrwxrwT');
	});

	test('should format binary, octal, decimal, and hex mode modifiers', () => {
		assert.strictEqual(formatMode(0o100644n, 'b'), '1000000110100100');
		assert.strictEqual(formatMode(0o100644n, 'o'), '100644');
		assert.strictEqual(formatMode(0o100755n, 'o'), '100755');
		assert.strictEqual(formatMode(0o104755n, 'o'), '104755');
		assert.strictEqual(formatMode(0o102755n, 'o'), '102755');
		assert.strictEqual(formatMode(0o041777n, 'o'), '041777');
		assert.strictEqual(formatMode(0o100644n, 'd'), '33188');
		assert.strictEqual(formatMode(0o100644n, 'x'), '81a4');
		assert.strictEqual(formatMode(0o100644n, 'X'), '81A4');

		assert.strictEqual(formatMode(0o000755n, 's'), '?rwxr-xr-x');
		assert.strictEqual(formatMode(0o000755n, 'b'), '0000000111101101');
		assert.strictEqual(formatMode(0o000755n, 'o'), '000755');
		assert.strictEqual(formatMode(0o000755n, 'x'), '01ed');
		assert.strictEqual(formatMode(0o000755n, 'X'), '01ED');
		assert.strictEqual(formatMode(0o100644n, 'invalid'), undefined);
	});

	test('should format file types and fallback to ? for unknown S_IFMT', () => {
		assert.strictEqual(formatFileType(0o100644n), 'regular file');
		assert.strictEqual(formatFileType(0o040755n), 'directory');
		assert.strictEqual(formatFileType(0o120777n), 'symbolic link');
		assert.strictEqual(formatFileType(0o140755n), 'socket');
		assert.strictEqual(formatFileType(0o010644n), 'fifo');
		assert.strictEqual(formatFileType(0o060660n), 'block device');
		assert.strictEqual(formatFileType(0o020666n), 'char device');
		assert.strictEqual(formatFileType(0o000755n), '?');
	});

	test('should format symbolic and 4-digit octal permissions including special bits', () => {
		assert.strictEqual(formatPermissions(0o040755n), 'rwxr-xr-x');
		assert.strictEqual(formatPermissions(0o040755n, 's'), 'rwxr-xr-x');
		assert.strictEqual(formatPermissions(0o040755n, 'o'), '0755');
		assert.strictEqual(formatPermissions(0o100644n, 's'), 'rw-r--r--');
		assert.strictEqual(formatPermissions(0o100644n, 'o'), '0644');
		assert.strictEqual(formatPermissions(0o104755n, 's'), 'rwsr-xr-x');
		assert.strictEqual(formatPermissions(0o104755n, 'o'), '4755');
		assert.strictEqual(formatPermissions(0o102745n, 's'), 'rwxr-Sr-x');
		assert.strictEqual(formatPermissions(0o102745n, 'o'), '2745');
		assert.strictEqual(formatPermissions(0o041777n, 's'), 'rwxrwxrwt');
		assert.strictEqual(formatPermissions(0o041777n, 'o'), '1777');
		assert.strictEqual(formatPermissions(0o047000n, 's'), '--S--S--T');
		assert.strictEqual(formatPermissions(0o047000n, 'o'), '7000');
	});
});
