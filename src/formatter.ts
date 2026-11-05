import * as process from 'node:process';
import type { Stats } from './types.js';

const S_IFMT = 0o170000;
const S_IFSOCK = 0o140000;
const S_IFLNK = 0o120000;
const S_IFREG = 0o100000;
const S_IFBLK = 0o060000;
const S_IFDIR = 0o040000;
const S_IFCHR = 0o020000;
const S_IFIFO = 0o010000;

const S_ISUID = 0o004000;
const S_ISGID = 0o002000;
const S_ISVTX = 0o001000;

const S_IRUSR = 0o000400;
const S_IWUSR = 0o000200;
const S_IXUSR = 0o000100;

const S_IRGRP = 0o000040;
const S_IWGRP = 0o000020;
const S_IXGRP = 0o000010;

const S_IROTH = 0o000004;
const S_IWOTH = 0o000002;
const S_IXOTH = 0o000001;

const IEC_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const;
const SI_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type FileSizeFormat = 'iec' | 'si' | 'bytes';

export function formatOctalMode(mode?: number): string {
	if (mode === undefined || typeof mode !== 'number' || Number.isNaN(mode) || mode < 0) {
		return '-';
	}
	const permBits = mode & 0o7777;
	return permBits.toString(8).padStart(4, '0');
}

export function formatSymbolicMode(mode?: number): string {
	if (mode === undefined || typeof mode !== 'number' || Number.isNaN(mode) || mode < 0) {
		return '-';
	}

	const typeChar = getTypeCharacter(mode);

	const userR = mode & S_IRUSR ? 'r' : '-';
	const userW = mode & S_IWUSR ? 'w' : '-';
	let userX = mode & S_IXUSR ? 'x' : '-';
	if (mode & S_ISUID) {
		userX = userX === 'x' ? 's' : 'S';
	}

	const groupR = mode & S_IRGRP ? 'r' : '-';
	const groupW = mode & S_IWGRP ? 'w' : '-';
	let groupX = mode & S_IXGRP ? 'x' : '-';
	if (mode & S_ISGID) {
		groupX = groupX === 'x' ? 's' : 'S';
	}

	const otherR = mode & S_IROTH ? 'r' : '-';
	const otherW = mode & S_IWOTH ? 'w' : '-';
	let otherX = mode & S_IXOTH ? 'x' : '-';
	if (mode & S_ISVTX) {
		otherX = otherX === 'x' ? 't' : 'T';
	}

	return `${typeChar}${userR}${userW}${userX}${groupR}${groupW}${groupX}${otherR}${otherW}${otherX}`;
}

export function getFileTypeDescription(mode?: number): string {
	if (mode === undefined) {
		return 'file';
	}

	switch (mode & S_IFMT) {
		case S_IFLNK:
			return 'symbolic link';
		case S_IFREG:
			return 'regular file';
		case S_IFDIR:
			return 'directory';
		case S_IFCHR:
			return 'character special file';
		case S_IFBLK:
			return 'block special file';
		case S_IFIFO:
			return 'fifo';
		case S_IFSOCK:
			return 'socket';
		default:
			return 'unknown';
	}
}

export function formatDeviceNumber(dev?: bigint): string {
	if (dev == null) {
		return '-';
	}

	// Linux glibc: major = ((dev >> 8) & 0xfff) | ((dev >> 32) & ~0xfff), minor = (dev & 0xff) | ((dev >> 12) & 0xfff00)
	if (process.platform === 'linux') {
		const major = Number(((dev >> 8n) & 0xfffn) | ((dev >> 32n) & ~0xfffn));
		const minor = Number((dev & 0xffn) | ((dev >> 12n) & 0xfff00n));
		return `${major},${minor}`;
	}

	// macOS Darwin: major = (dev >> 24) & 0xff, minor = dev & 0xffffff
	if (process.platform === 'darwin') {
		const major = Number((dev >> 24n) & 0xffn);
		const minor = Number(dev & 0xffffffn);
		return `${major},${minor}`;
	}

	return dev.toString();
}

export function formatFileSize(bytes?: number, format: FileSizeFormat = 'bytes'): string {
	if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes < 0) {
		return '-';
	}

	if (format === 'bytes') {
		return `${Math.floor(bytes)} B`;
	}

	const isIec = format === 'iec';
	const base = isIec ? 1024 : 1000;
	const units = isIec ? IEC_UNITS : SI_UNITS;

	let value = bytes;
	let unitIndex = 0;

	while (value >= base && unitIndex < units.length - 1) {
		value /= base;
		unitIndex++;
	}

	if (unitIndex === 0) {
		return `${Math.floor(value)} ${units[0]}`;
	}

	// Advance unit if 2-decimal rounding pushes value to base (e.g. 1048575 B -> 1023.999 KiB -> rounds to 1024.00 KiB -> 1.00 MiB)
	if (Number(value.toFixed(2)) >= base && unitIndex < units.length - 1) {
		unitIndex++;
		value /= base;
	}

	return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function formatStrftime(date?: Date, pattern = '%Y-%m-%d %H:%M:%S'): string {
	if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
		return '-';
	}

	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const absOffset = Math.abs(offset);
	const tzHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
	const tzMinutes = String(absOffset % 60).padStart(2, '0');
	const tz = `${sign}${tzHours}${tzMinutes}`;

	const tokens: Record<string, string> = {
		'%Y': String(date.getFullYear()),
		'%y': String(date.getFullYear()).slice(-2),
		'%m': String(date.getMonth() + 1).padStart(2, '0'),
		'%B': MONTH_NAMES[date.getMonth()],
		'%b': MONTH_SHORT_NAMES[date.getMonth()],
		'%h': MONTH_SHORT_NAMES[date.getMonth()],
		'%d': String(date.getDate()).padStart(2, '0'),
		'%e': String(date.getDate()).padStart(2, ' '),
		'%H': String(date.getHours()).padStart(2, '0'),
		'%I': String(date.getHours() % 12 || 12).padStart(2, '0'),
		'%M': String(date.getMinutes()).padStart(2, '0'),
		'%S': String(date.getSeconds()).padStart(2, '0'),
		'%A': DAY_NAMES[date.getDay()],
		'%a': DAY_SHORT_NAMES[date.getDay()],
		'%u': String(date.getDay() === 0 ? 7 : date.getDay()),
		'%w': String(date.getDay()),
		'%z': tz,
		'%%': '%',
	};

	const expanded = pattern.replace(/%F/g, '%Y-%m-%d').replace(/%T/g, '%H:%M:%S').replace(/%R/g, '%H:%M');

	return expanded.replace(/%[YymbBdehHIIMSAauwz%]/g, (match) => tokens[match] ?? match);
}

export function formatGnuStatTimestamp(date?: Date, nanosBigInt?: bigint): string {
	if (nanosBigInt !== undefined) {
		if (nanosBigInt === 0n) {
			return '-';
		}
		const ms = Number(nanosBigInt / 1_000_000n);
		const d = new Date(ms);
		if (Number.isNaN(d.getTime())) {
			return '-';
		}
		const nanosPart = String(nanosBigInt % 1_000_000_000n).padStart(9, '0');
		return buildTimestampString(d, nanosPart);
	}

	if (date && date instanceof Date && !Number.isNaN(date.getTime())) {
		const nanosPart = `${String(date.getMilliseconds()).padStart(3, '0')}000000`;
		return buildTimestampString(date, nanosPart);
	}

	return '-';
}

export function formatStatusBarText(stat: Stats, template: string): string {
	return template.replace(/\{([a-zA-Z]+)(?::([^}]+))?\}/g, (match, field: string, modifier?: string) => {
		switch (field) {
			case 'mode': {
				if (!modifier) {
					return formatSymbolicMode(stat.mode);
				}
				switch (modifier) {
					case 'o':
						return formatOctalMode(stat.mode);
					case 'x':
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(16) : '-';
					case 'X':
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(16).toUpperCase() : '-';
					case 'd':
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(10) : '-';
					case 'b':
						return stat.mode !== undefined ? (stat.mode & 0o777).toString(2).padStart(9, '0') : '-';
					default:
						return match;
				}
			}
			case 'size': {
				switch (modifier) {
					case '1024':
					case 'iec':
						return formatFileSize(stat.size, 'iec');
					case '1000':
					case 'si':
						return formatFileSize(stat.size, 'si');
					case 'bytes':
					case undefined:
						return formatFileSize(stat.size, 'bytes');
					default:
						return match;
				}
			}
			case 'mtime':
				return formatStrftime(stat.mtime, modifier);
			case 'atime':
				return formatStrftime(stat.atime, modifier);
			case 'ctime':
				return formatStrftime(stat.ctime, modifier);
			case 'btime':
				return formatStrftime(stat.birthtime, modifier);
			default:
				return match;
		}
	});
}

export function formatAlignedStatCard(stat: Stats): string {
	const isSymlink = stat.mode !== undefined && (stat.mode & S_IFMT) === S_IFLNK;
	const fileHeader =
		isSymlink && stat.symlinkTarget ? `  File: ${stat.fileName} -> ${stat.symlinkTarget}` : `  File: ${stat.fileName}`;

	const modeOctal = formatOctalMode(stat.mode);
	const modeSymbolic = formatSymbolicMode(stat.mode);
	const fileType = getFileTypeDescription(stat.mode);
	const devStr = formatDeviceNumber(stat.dev);

	const accessMode = `(${modeOctal}/${modeSymbolic})`;
	const uidVal = `(${stat.uid ?? '-'}/-)`;
	const gidVal = `(${stat.gid ?? '-'}/-)`;

	const lineSize = [
		`  Size: ${stat.size ?? '-'}`.padEnd(28),
		`Blocks: ${stat.blocks ?? '-'}`.padEnd(24),
		`IO Block: ${stat.blksize ?? '-'}`.padEnd(20),
		fileType,
	].join('');

	const lineDevice = [
		`Device: ${devStr}`.padEnd(28),
		` Inode: ${stat.ino ?? '-'}`.padEnd(24),
		`   Links: ${stat.nlink ?? '-'}`,
	].join('');

	const lineAccess = [`Access: ${accessMode}`.padEnd(28), `   Uid: ${uidVal}`.padEnd(24), `     Gid: ${gidVal}`].join(
		'',
	);

	const lineAtime = `Access: ${formatGnuStatTimestamp(stat.atime, stat.atimeNs)}`;
	const lineMtime = `Modify: ${formatGnuStatTimestamp(stat.mtime, stat.mtimeNs)}`;
	const lineCtime = `Change: ${formatGnuStatTimestamp(stat.ctime, stat.ctimeNs)}`;
	const lineBtime = ` Birth: ${formatGnuStatTimestamp(stat.birthtime, stat.birthtimeNs)}`;

	return [fileHeader, lineSize, lineDevice, lineAccess, lineAtime, lineMtime, lineCtime, lineBtime].join('\n');
}

function getTypeCharacter(mode: number): string {
	switch (mode & S_IFMT) {
		case S_IFLNK:
			return 'l';
		case S_IFDIR:
			return 'd';
		case S_IFCHR:
			return 'c';
		case S_IFBLK:
			return 'b';
		case S_IFIFO:
			return 'p';
		case S_IFSOCK:
			return 's';
		default:
			return '-';
	}
}

function buildTimestampString(date: Date, nanosPart: string): string {
	const year4 = String(date.getFullYear());
	const month2 = String(date.getMonth() + 1).padStart(2, '0');
	const day2 = String(date.getDate()).padStart(2, '0');
	const hours2 = String(date.getHours()).padStart(2, '0');
	const minutes2 = String(date.getMinutes()).padStart(2, '0');
	const seconds2 = String(date.getSeconds()).padStart(2, '0');

	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const absOffset = Math.abs(offset);
	const tzHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
	const tzMinutes = String(absOffset % 60).padStart(2, '0');
	const tz = `${sign}${tzHours}${tzMinutes}`;

	return `${year4}-${month2}-${day2} ${hours2}:${minutes2}:${seconds2}.${nanosPart} ${tz}`;
}
