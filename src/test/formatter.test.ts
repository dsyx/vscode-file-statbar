import assert from 'node:assert/strict';
import {
	formatFileSize,
	formatOctalMode,
	formatStatusBarText,
	formatStrftime,
	formatSymbolicMode,
} from '../formatter.js';
import type { Stats } from '../types.js';

suite('formatter tests', () => {
	suite('formatOctalMode', () => {
		test('should format standard permissions as 4-digit octal', () => {
			assert.strictEqual(formatOctalMode(0o100644), '0644');
			assert.strictEqual(formatOctalMode(0o100755), '0755');
			assert.strictEqual(formatOctalMode(0o100777), '0777');
			assert.strictEqual(formatOctalMode(0o100600), '0600');
		});

		test('should format special bits (SUID, SGID, Sticky)', () => {
			assert.strictEqual(formatOctalMode(0o104755), '4755');
			assert.strictEqual(formatOctalMode(0o102755), '2755');
			assert.strictEqual(formatOctalMode(0o041777), '1777');
		});

		test('should return "-" for undefined or invalid mode', () => {
			assert.strictEqual(formatOctalMode(undefined), '-');
			assert.strictEqual(formatOctalMode(Number.NaN), '-');
			assert.strictEqual(formatOctalMode(-1), '-');
			assert.strictEqual(formatOctalMode(Number.POSITIVE_INFINITY), '-');
		});
	});

	suite('formatSymbolicMode', () => {
		test('should format regular file permissions', () => {
			assert.strictEqual(formatSymbolicMode(0o100644), '-rw-r--r--');
			assert.strictEqual(formatSymbolicMode(0o100755), '-rwxr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o100600), '-rw-------');
			assert.strictEqual(formatSymbolicMode(0o100000), '----------');
		});

		test('should format directory, symlink, and special file types (c, b, p, s)', () => {
			assert.strictEqual(formatSymbolicMode(0o040755), 'drwxr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o120777), 'lrwxrwxrwx');
			assert.strictEqual(formatSymbolicMode(0o120644), 'lrw-r--r--');
			assert.strictEqual(formatSymbolicMode(0o020666), 'crw-rw-rw-');
			assert.strictEqual(formatSymbolicMode(0o060660), 'brw-rw----');
			assert.strictEqual(formatSymbolicMode(0o010644), 'prw-r--r--');
			assert.strictEqual(formatSymbolicMode(0o140755), 'srwxr-xr-x');
		});

		test('should format special bit characters (s, S, t, T)', () => {
			assert.strictEqual(formatSymbolicMode(0o104755), '-rwsr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o104655), '-rwSr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o102755), '-rwxr-sr-x');
			assert.strictEqual(formatSymbolicMode(0o102745), '-rwxr-Sr-x');
			assert.strictEqual(formatSymbolicMode(0o041777), 'drwxrwxrwt');
			assert.strictEqual(formatSymbolicMode(0o041776), 'drwxrwxrwT');
		});

		test('should return "-" for undefined or invalid mode', () => {
			assert.strictEqual(formatSymbolicMode(undefined), '-');
			assert.strictEqual(formatSymbolicMode(Number.NaN), '-');
			assert.strictEqual(formatSymbolicMode(-1), '-');
			assert.strictEqual(formatSymbolicMode(Number.POSITIVE_INFINITY), '-');
		});
	});

	suite('formatFileSize', () => {
		test('should format binary size (IEC 1024-based)', () => {
			assert.strictEqual(formatFileSize(0, 'iec'), '0 B');
			assert.strictEqual(formatFileSize(512, 'iec'), '512 B');
			assert.strictEqual(formatFileSize(1024, 'iec'), '1.00 KiB');
			assert.strictEqual(formatFileSize(1178, 'iec'), '1.15 KiB');
			assert.strictEqual(formatFileSize(1024 * 1024, 'iec'), '1.00 MiB');
			assert.strictEqual(formatFileSize(1024 * 1024 * 1024, 'iec'), '1.00 GiB');
		});

		test('should correctly rollover when toFixed(2) rounds up to base', () => {
			// 1048575 = 1024 * 1024 - 1 -> should roll over to 1.00 MiB instead of 1024.00 KiB
			assert.strictEqual(formatFileSize(1048575, 'iec'), '1.00 MiB');
			// 999999 = 1000 * 1000 - 1 -> should roll over to 1.00 MB instead of 1000.00 kB
			assert.strictEqual(formatFileSize(999999, 'si'), '1.00 MB');
		});

		test('should format metric size (SI 1000-based) with lowercase kB', () => {
			assert.strictEqual(formatFileSize(0, 'si'), '0 B');
			assert.strictEqual(formatFileSize(500, 'si'), '500 B');
			assert.strictEqual(formatFileSize(1000, 'si'), '1.00 kB');
			assert.strictEqual(formatFileSize(1178, 'si'), '1.18 kB');
			assert.strictEqual(formatFileSize(1000000, 'si'), '1.00 MB');
		});

		test('should format raw bytes by default and explicitly', () => {
			assert.strictEqual(formatFileSize(0), '0 B');
			assert.strictEqual(formatFileSize(1178), '1178 B');
			assert.strictEqual(formatFileSize(1178, 'bytes'), '1178 B');
		});

		test('should return "-" for undefined or negative bytes', () => {
			assert.strictEqual(formatFileSize(undefined), '-');
			assert.strictEqual(formatFileSize(-1), '-');
			assert.strictEqual(formatFileSize(Number.NaN), '-');
		});
	});

	suite('formatStrftime', () => {
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
			assert.match(formatStrftime(fixedDate, '%z'), /^[+-]\d{4}$/);
			assert.strictEqual(formatStrftime(fixedDate, '%s'), String(Math.floor(fixedDate.getTime() / 1000)));

			const earlyDate = new Date(2026, 0, 5, 0, 15, 0);
			assert.strictEqual(formatStrftime(earlyDate, '%e %I'), ' 5 12');
		});

		test('should return "-" for invalid or undefined dates', () => {
			assert.strictEqual(formatStrftime(undefined), '-');
			assert.strictEqual(formatStrftime(new Date('invalid')), '-');
		});
	});

	suite('formatStatusBarText', () => {
		const stat: Stats = {
			filePath: 'test.txt',
			size: 1178,
			mode: 0o100644,
			mtime: new Date(2026, 9, 29, 13, 59, 0),
		};

		test('should substitute default template placeholders correctly', () => {
			const defaultTemplate = '[ {mode} | {size:iec} | {mtime} (M) ]';
			const result = formatStatusBarText(stat, defaultTemplate);
			assert.strictEqual(result, '[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:00 (M) ]');
		});

		test('should substitute mode modifiers (o, x, X, d, b)', () => {
			assert.strictEqual(formatStatusBarText(stat, '{mode:o}'), '0644');
			assert.strictEqual(formatStatusBarText(stat, '{mode:x}'), '81a4');
			assert.strictEqual(formatStatusBarText(stat, '{mode:X}'), '81A4');
			assert.strictEqual(formatStatusBarText(stat, '{mode:d}'), '33188');
			assert.strictEqual(formatStatusBarText(stat, '{mode:b}'), '1000000110100100');

			const lowModeStat: Stats = { filePath: 'low.txt', size: 10, mode: 0o000755 };
			assert.strictEqual(formatStatusBarText(lowModeStat, '{mode:x}'), '01ed');
			assert.strictEqual(formatStatusBarText(lowModeStat, '{mode:X}'), '01ED');
			assert.strictEqual(formatStatusBarText(lowModeStat, '{mode:b}'), '0000000111101101');

			const invalidModeStat: Stats = { filePath: 'bad.txt', size: 10, mode: Number.NaN };
			assert.strictEqual(formatStatusBarText(invalidModeStat, '{mode:o}'), '-');
			assert.strictEqual(formatStatusBarText(invalidModeStat, '{mode:x}'), '-');
			assert.strictEqual(formatStatusBarText(invalidModeStat, '{mode:X}'), '-');
			assert.strictEqual(formatStatusBarText(invalidModeStat, '{mode:d}'), '-');
			assert.strictEqual(formatStatusBarText(invalidModeStat, '{mode:b}'), '-');
		});

		test('should substitute size modifiers (raw, 1024, iec, 1000, si, bytes)', () => {
			assert.strictEqual(formatStatusBarText(stat, '{size}'), '1178 B');
			assert.strictEqual(formatStatusBarText(stat, '{size:bytes}'), '1178 B');
			assert.strictEqual(formatStatusBarText(stat, '{size:1024}'), '1.15 KiB');
			assert.strictEqual(formatStatusBarText(stat, '{size:iec}'), '1.15 KiB');
			assert.strictEqual(formatStatusBarText(stat, '{size:1000}'), '1.18 kB');
			assert.strictEqual(formatStatusBarText(stat, '{size:si}'), '1.18 kB');
		});

		test('should substitute strftime date modifiers, ctime/btime, and missing values with "-"', () => {
			const fullStat: Stats = {
				...stat,
				ctime: new Date(2026, 9, 29, 14, 0, 0),
				birthtime: new Date(2026, 9, 1, 8, 30, 0),
			};
			assert.strictEqual(formatStatusBarText(fullStat, '{mtime:%F}'), '2026-10-29');
			assert.strictEqual(formatStatusBarText(fullStat, '{mtime:%R}'), '13:59');
			assert.strictEqual(formatStatusBarText(fullStat, '{ctime:%T}'), '14:00:00');
			assert.strictEqual(formatStatusBarText(fullStat, '{btime:%F}'), '2026-10-01');
			assert.strictEqual(formatStatusBarText(fullStat, '{atime}'), '-');
		});

		test('should preserve unknown fields and unknown modifiers as-is', () => {
			assert.strictEqual(formatStatusBarText(stat, '{unknown}'), '{unknown}');
			assert.strictEqual(formatStatusBarText(stat, '{mode:invalid}'), '{mode:invalid}');
			assert.strictEqual(formatStatusBarText(stat, '{size:invalid}'), '{size:invalid}');
		});
	});
});
