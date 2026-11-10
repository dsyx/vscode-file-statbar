import assert from 'node:assert/strict';
import { formatMode, formatSize, formatStrftime } from '../formatter.js';

suite('formatter tests', () => {
	suite('mode formatting', () => {
		test('should format regular file symbolic permissions', () => {
			assert.strictEqual(formatMode(0o100644), '-rw-r--r--');
			assert.strictEqual(formatMode(0o100755), '-rwxr-xr-x');
			assert.strictEqual(formatMode(0o100600), '-rw-------');
			assert.strictEqual(formatMode(0o100000), '----------');
			assert.strictEqual(formatMode(0o100644), '-rw-r--r--');
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
			assert.strictEqual(formatMode(0o100644, 'o'), '0644');
			assert.strictEqual(formatMode(0o100755, 'o'), '0755');
			assert.strictEqual(formatMode(0o104755, 'o'), '4755');
			assert.strictEqual(formatMode(0o102755, 'o'), '2755');
			assert.strictEqual(formatMode(0o041777, 'o'), '1777');
			assert.strictEqual(formatMode(0o100644, 'd'), '33188');
			assert.strictEqual(formatMode(0o100644, 'x'), '81a4');
			assert.strictEqual(formatMode(0o100644, 'X'), '81A4');

			assert.strictEqual(formatMode(0o000755, 'b'), '0000000111101101');
			assert.strictEqual(formatMode(0o000755, 'x'), '01ed');
			assert.strictEqual(formatMode(0o000755, 'X'), '01ED');
			assert.strictEqual(formatMode(0o100644, 'invalid'), undefined);
		});

		test('should return undefined for undefined or invalid mode across all modifiers', () => {
			for (const invalid of [undefined, Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
				assert.strictEqual(formatMode(invalid), undefined);
				assert.strictEqual(formatMode(invalid, 'b'), undefined);
				assert.strictEqual(formatMode(invalid, 'o'), undefined);
				assert.strictEqual(formatMode(invalid, 'd'), undefined);
				assert.strictEqual(formatMode(invalid, 'x'), undefined);
				assert.strictEqual(formatMode(invalid, 'X'), undefined);
			}
		});
	});

	suite('size formatting', () => {
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

		test('should return undefined for undefined, negative, or non-finite bytes', () => {
			assert.strictEqual(formatSize(undefined), undefined);
			assert.strictEqual(formatSize(-1), undefined);
			assert.strictEqual(formatSize(Number.NaN, 'iec'), undefined);
		});
	});

	suite('timestamp formatting', () => {
		const fixedDate = new Date(2026, 9, 29, 13, 59, 26, 557);

		test('should format with default pattern %Y-%m-%d %H:%M:%S', () => {
			assert.strictEqual(formatStrftime(fixedDate), '2026-10-29 13:59:26');
		});

		test('should format with POSIX shortcut macros %F, %T, %R and escaped %%', () => {
			assert.strictEqual(formatStrftime(fixedDate, '%F'), '2026-10-29');
			assert.strictEqual(formatStrftime(fixedDate, '%T'), '13:59:26');
			assert.strictEqual(formatStrftime(fixedDate, '%R'), '13:59');
			assert.strictEqual(formatStrftime(fixedDate, '%F %T'), '2026-10-29 13:59:26');
			assert.strictEqual(formatStrftime(fixedDate, '%%'), '%');
			assert.strictEqual(formatStrftime(fixedDate, '%%F %%T %%R'), '%F %T %R');
			assert.strictEqual(formatStrftime(fixedDate, '%%%F'), '%2026-10-29');
		});

		test('should format with custom tokens and retain literal text untouched', () => {
			assert.strictEqual(formatStrftime(fixedDate, '%Y/%m/%d'), '2026/10/29');
			assert.strictEqual(formatStrftime(fixedDate, '%F (Modified)'), '2026-10-29 (Modified)');
			assert.strictEqual(formatStrftime(fixedDate, '%C-%y-%m-%d'), '20-26-10-29');
			assert.strictEqual(formatStrftime(fixedDate, '%j %u %w'), '302 4 4');
			assert.strictEqual(formatStrftime(fixedDate, '%G-W%V-%g'), '2026-W44-26');
			assert.strictEqual(formatStrftime(fixedDate, '%U %W'), '43 43');
			assert.strictEqual(formatStrftime(fixedDate, '%e %I'), '29 01');
			const offset = formatStrftime(fixedDate, '%z');
			assert.ok(offset !== undefined);
			assert.match(offset, /^[+-]\d{4}$/);
			assert.strictEqual(formatStrftime(fixedDate, '%s'), String(Math.floor(fixedDate.getTime() / 1000)));

			const earlyDate = new Date(2026, 0, 5, 0, 15, 0);
			assert.strictEqual(formatStrftime(earlyDate, '%e %I'), ' 5 12');
		});

		test('should return undefined for invalid or undefined dates', () => {
			assert.strictEqual(formatStrftime(undefined), undefined);
			assert.strictEqual(formatStrftime(new Date('invalid')), undefined);
		});
	});
});
