import assert from 'node:assert/strict';
import {
	formatAlignedStatCard,
	formatFileSize,
	formatGnuStatTimestamp,
	formatOctalMode,
	formatStatusBarText,
	formatStrftime,
	formatSymbolicMode,
	getFileTypeDescription,
} from '../formatter.js';
import type { Stats } from '../types.js';

describe('formatter tests', () => {
	describe('formatOctalMode', () => {
		it('should format standard permissions as 4-digit octal', () => {
			assert.strictEqual(formatOctalMode(0o100644), '0644');
			assert.strictEqual(formatOctalMode(0o100755), '0755');
			assert.strictEqual(formatOctalMode(0o100777), '0777');
			assert.strictEqual(formatOctalMode(0o100600), '0600');
		});

		it('should format special bits (SUID, SGID, Sticky)', () => {
			assert.strictEqual(formatOctalMode(0o104755), '4755');
			assert.strictEqual(formatOctalMode(0o102755), '2755');
			assert.strictEqual(formatOctalMode(0o041777), '1777');
		});

		it('should return "-" for undefined or invalid mode', () => {
			assert.strictEqual(formatOctalMode(undefined), '-');
			assert.strictEqual(formatOctalMode(Number.NaN), '-');
		});
	});

	describe('formatSymbolicMode', () => {
		it('should format regular file permissions', () => {
			assert.strictEqual(formatSymbolicMode(0o100644), '-rw-r--r--');
			assert.strictEqual(formatSymbolicMode(0o100755), '-rwxr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o100600), '-rw-------');
			assert.strictEqual(formatSymbolicMode(0o100000), '----------');
		});

		it('should format directory and symlink types', () => {
			assert.strictEqual(formatSymbolicMode(0o040755), 'drwxr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o120777), 'lrwxrwxrwx');
			assert.strictEqual(formatSymbolicMode(0o120644), 'lrw-r--r--');
		});

		it('should format special bit characters (s, S, t, T)', () => {
			assert.strictEqual(formatSymbolicMode(0o104755), '-rwsr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o104655), '-rwSr-xr-x');
			assert.strictEqual(formatSymbolicMode(0o102755), '-rwxr-sr-x');
			assert.strictEqual(formatSymbolicMode(0o102745), '-rwxr-Sr-x');
			assert.strictEqual(formatSymbolicMode(0o041777), 'drwxrwxrwt');
			assert.strictEqual(formatSymbolicMode(0o041776), 'drwxrwxrwT');
		});

		it('should return "-" for undefined or invalid mode', () => {
			assert.strictEqual(formatSymbolicMode(undefined), '-');
			assert.strictEqual(formatSymbolicMode(Number.NaN), '-');
		});
	});

	describe('getFileTypeDescription', () => {
		it('should return correct type names', () => {
			assert.strictEqual(getFileTypeDescription(0o100644), 'regular file');
			assert.strictEqual(getFileTypeDescription(0o040755), 'directory');
			assert.strictEqual(getFileTypeDescription(0o120777), 'symbolic link');
			assert.strictEqual(getFileTypeDescription(0o020666), 'character special file');
			assert.strictEqual(getFileTypeDescription(0o060660), 'block special file');
			assert.strictEqual(getFileTypeDescription(0o010660), 'fifo');
			assert.strictEqual(getFileTypeDescription(0o140777), 'socket');
			assert.strictEqual(getFileTypeDescription(undefined), 'file');
		});
	});

	describe('formatFileSize', () => {
		it('should format binary size (IEC 1024-based)', () => {
			assert.strictEqual(formatFileSize(0, 'iec'), '0 B');
			assert.strictEqual(formatFileSize(512, 'iec'), '512 B');
			assert.strictEqual(formatFileSize(1024, 'iec'), '1.00 KiB');
			assert.strictEqual(formatFileSize(1178, 'iec'), '1.15 KiB');
			assert.strictEqual(formatFileSize(1024 * 1024, 'iec'), '1.00 MiB');
			assert.strictEqual(formatFileSize(1024 * 1024 * 1024, 'iec'), '1.00 GiB');
		});

		it('should correctly rollover when toFixed(2) rounds up to base', () => {
			// 1048575 = 1024 * 1024 - 1 -> should roll over to 1.00 MiB instead of 1024.00 KiB
			assert.strictEqual(formatFileSize(1048575, 'iec'), '1.00 MiB');
			// 999999 = 1000 * 1000 - 1 -> should roll over to 1.00 MB instead of 1000.00 kB
			assert.strictEqual(formatFileSize(999999, 'si'), '1.00 MB');
		});

		it('should format metric size (SI 1000-based) with lowercase kB', () => {
			assert.strictEqual(formatFileSize(0, 'si'), '0 B');
			assert.strictEqual(formatFileSize(500, 'si'), '500 B');
			assert.strictEqual(formatFileSize(1000, 'si'), '1.00 kB');
			assert.strictEqual(formatFileSize(1178, 'si'), '1.18 kB');
			assert.strictEqual(formatFileSize(1000000, 'si'), '1.00 MB');
		});

		it('should format raw bytes by default and explicitly', () => {
			assert.strictEqual(formatFileSize(0), '0 B');
			assert.strictEqual(formatFileSize(1178), '1178 B');
			assert.strictEqual(formatFileSize(1178, 'bytes'), '1178 B');
		});

		it('should return "-" for undefined or negative bytes', () => {
			assert.strictEqual(formatFileSize(undefined), '-');
			assert.strictEqual(formatFileSize(-1), '-');
			assert.strictEqual(formatFileSize(Number.NaN), '-');
		});
	});

	describe('formatStrftime', () => {
		const fixedDate = new Date(2026, 9, 29, 13, 59, 26, 557);

		it('should format with default pattern %Y-%m-%d %H:%M:%S', () => {
			assert.strictEqual(formatStrftime(fixedDate), '2026-10-29 13:59:26');
		});

		it('should format with POSIX shortcut macros %F, %T, %R', () => {
			assert.strictEqual(formatStrftime(fixedDate, '%F'), '2026-10-29');
			assert.strictEqual(formatStrftime(fixedDate, '%T'), '13:59:26');
			assert.strictEqual(formatStrftime(fixedDate, '%R'), '13:59');
			assert.strictEqual(formatStrftime(fixedDate, '%F %T'), '2026-10-29 13:59:26');
		});

		it('should format with custom tokens and retain literal text untouched', () => {
			assert.strictEqual(formatStrftime(fixedDate, '%Y/%m/%d'), '2026/10/29');
			assert.strictEqual(formatStrftime(fixedDate, '%F (Modified)'), '2026-10-29 (Modified)');
			assert.strictEqual(formatStrftime(fixedDate, '%C-%y-%m-%d'), '20-26-10-29');
			assert.strictEqual(formatStrftime(fixedDate, '%j %u %w'), '302 4 4');
			assert.strictEqual(formatStrftime(fixedDate, '%G-W%V'), '2026-W44');
			assert.strictEqual(formatStrftime(fixedDate, '%s'), String(Math.floor(fixedDate.getTime() / 1000)));
		});

		it('should return "-" for invalid or undefined dates', () => {
			assert.strictEqual(formatStrftime(undefined), '-');
			assert.strictEqual(formatStrftime(new Date('invalid')), '-');
		});
	});

	describe('formatGnuStatTimestamp', () => {
		it('should format date matching YYYY-MM-DD HH:mm:ss.nnnnnnnnn +ZZZZ from BigInt nanoseconds', () => {
			const nanos = 1793254673430901991n;
			const str = formatGnuStatTimestamp(undefined, nanos);
			assert.match(str, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{9} [+-]\d{4}$/);
			assert.ok(str.includes('.430901991 '));
		});

		it('should return "-" for 0n or undefined', () => {
			assert.strictEqual(formatGnuStatTimestamp(undefined, 0n), '-');
			assert.strictEqual(formatGnuStatTimestamp(undefined, undefined), '-');
		});
	});

	describe('formatStatusBarText', () => {
		const stat: Stats = {
			fileName: 'test.txt',
			size: 1178,
			mode: 0o100644,
			mtime: new Date(2026, 9, 29, 13, 59, 0),
		};

		it('should substitute default template placeholders correctly', () => {
			const defaultTemplate = '[ {mode} | {size:iec} | {mtime} (M) ]';
			const result = formatStatusBarText(stat, defaultTemplate);
			assert.strictEqual(result, '[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:00 (M) ]');
		});

		it('should substitute mode modifiers (o, x, X, d, b)', () => {
			assert.strictEqual(formatStatusBarText(stat, '{mode:o}'), '0644');
			assert.strictEqual(formatStatusBarText(stat, '{mode:x}'), '81a4');
			assert.strictEqual(formatStatusBarText(stat, '{mode:X}'), '81A4');
			assert.strictEqual(formatStatusBarText(stat, '{mode:d}'), '33188');
			assert.strictEqual(formatStatusBarText(stat, '{mode:b}'), '1000000110100100');

			const lowModeStat: Stats = { fileName: 'low.txt', size: 10, mode: 0o000755 };
			assert.strictEqual(formatStatusBarText(lowModeStat, '{mode:x}'), '01ed');
			assert.strictEqual(formatStatusBarText(lowModeStat, '{mode:X}'), '01ED');
			assert.strictEqual(formatStatusBarText(lowModeStat, '{mode:b}'), '0000000111101101');
		});

		it('should substitute size modifiers (raw, 1024, iec, 1000, si, bytes)', () => {
			assert.strictEqual(formatStatusBarText(stat, '{size}'), '1178 B');
			assert.strictEqual(formatStatusBarText(stat, '{size:bytes}'), '1178 B');
			assert.strictEqual(formatStatusBarText(stat, '{size:1024}'), '1.15 KiB');
			assert.strictEqual(formatStatusBarText(stat, '{size:iec}'), '1.15 KiB');
			assert.strictEqual(formatStatusBarText(stat, '{size:1000}'), '1.18 kB');
			assert.strictEqual(formatStatusBarText(stat, '{size:si}'), '1.18 kB');
		});

		it('should substitute strftime date modifiers and missing values with "-"', () => {
			assert.strictEqual(formatStatusBarText(stat, '{mtime:%F}'), '2026-10-29');
			assert.strictEqual(formatStatusBarText(stat, '{mtime:%R}'), '13:59');
			assert.strictEqual(formatStatusBarText(stat, '{atime}'), '-');
		});
	});

	describe('formatAlignedStatCard', () => {
		it('should format GNU stat card with strictly aligned columns', () => {
			const stat: Stats = {
				fileName: 'package.json',
				size: 1178,
				blocks: 8,
				blksize: 4096,
				mode: 0o100644,
				uid: 1000,
				gid: 1000,
				ino: 5910522n,
				dev: 2049n,
				nlink: 1,
				atimeNs: 1793254673430901991n,
				mtimeNs: 1793253566557667014n,
				ctimeNs: 1793253566557667014n,
				birthtimeNs: 1793253566557667014n,
			};

			const text = formatAlignedStatCard(stat);
			const lines = text.split('\n');

			// Verify exact column alignment across rows
			assert.strictEqual(lines[1].indexOf('Blocks: '), 28);
			assert.strictEqual(lines[2].indexOf(' Inode: '), 28);
			assert.strictEqual(lines[3].indexOf('   Uid: '), 28);

			assert.strictEqual(lines[1].indexOf('IO Block: '), 52);
			assert.strictEqual(lines[2].indexOf('   Links: '), 52);
			assert.strictEqual(lines[3].indexOf('     Gid: '), 52);

			assert.strictEqual(lines[1].indexOf('regular file'), 72);

			assert.ok(lines[4].startsWith('Access: '));
			assert.ok(lines[5].startsWith('Modify: '));
			assert.ok(lines[6].startsWith('Change: '));
			assert.ok(lines[7].startsWith(' Birth: '));

			assert.ok(text.includes('File: package.json'));
			assert.ok(text.includes('Size: 1178'));
			assert.ok(text.includes('Blocks: 8'));
			assert.ok(text.includes('IO Block: 4096'));
			assert.ok(text.includes('Inode: 5910522'));
			assert.ok(text.includes('Links: 1'));
			assert.ok(text.includes('Access: (0644/-rw-r--r--)'));
			assert.ok(text.includes('Uid: (1000/-)'));
			assert.ok(text.includes('Gid: (1000/-)'));
			assert.ok(text.includes('.430901991 '));
			assert.ok(text.includes('.557667014 '));
		});

		it('should handle symlinks and missing birthtime', () => {
			const stat: Stats = {
				fileName: 'link.js',
				symlinkTarget: '../target.js',
				size: 12,
				mode: 0o120777,
				birthtimeNs: 0n,
			};

			const text = formatAlignedStatCard(stat);

			assert.ok(text.includes('File: link.js -> ../target.js'));
			assert.ok(text.includes('symbolic link'));
			assert.ok(text.includes('Birth: -'));
			assert.ok(text.includes('Device: -'));
			assert.ok(text.includes('Inode: -'));
		});
	});
});
