import type { Stats } from './types.js';

const S_IFMT = 0o170000;
const S_IFSOCK = 0o140000;
const S_IFLNK = 0o120000;
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

	const dayOfYear = getDayOfYear(date);
	const iso = getIsoWeekDetails(date);
	const weekSunday = getWeekOfYearSunday(date, dayOfYear);
	const weekMonday = getWeekOfYearMonday(date, dayOfYear);

	const tokens: Record<string, string> = {
		'%Y': String(date.getFullYear()),
		'%y': String(date.getFullYear()).slice(-2),
		'%C': String(Math.floor(date.getFullYear() / 100)).padStart(2, '0'),
		'%m': String(date.getMonth() + 1).padStart(2, '0'),
		'%d': String(date.getDate()).padStart(2, '0'),
		'%e': String(date.getDate()).padStart(2, ' '),
		'%j': String(dayOfYear).padStart(3, '0'),
		'%H': String(date.getHours()).padStart(2, '0'),
		'%I': String(date.getHours() % 12 || 12).padStart(2, '0'),
		'%M': String(date.getMinutes()).padStart(2, '0'),
		'%S': String(date.getSeconds()).padStart(2, '0'),
		'%s': String(Math.floor(date.getTime() / 1000)),
		'%u': String(date.getDay() === 0 ? 7 : date.getDay()),
		'%w': String(date.getDay()),
		'%V': String(iso.week).padStart(2, '0'),
		'%G': String(iso.year),
		'%g': String(iso.year).slice(-2),
		'%U': String(weekSunday).padStart(2, '0'),
		'%W': String(weekMonday).padStart(2, '0'),
		'%z': tz,
		'%%': '%',
	};

	const expanded = pattern.replace(/%F/g, '%Y-%m-%d').replace(/%T/g, '%H:%M:%S').replace(/%R/g, '%H:%M');

	return expanded.replace(/%[YyCmdejHIMSsuwVGgUWz%]/g, (match) => tokens[match] ?? match);
}

function getDayOfYear(date: Date): number {
	const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	const utcStart = Date.UTC(date.getFullYear(), 0, 1);
	return Math.floor((utcDate - utcStart) / 86_400_000) + 1;
}

function getIsoWeekDetails(date: Date): { year: number; week: number } {
	const day = date.getDay() === 0 ? 7 : date.getDay();
	const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	target.setUTCDate(target.getUTCDate() + (4 - day));
	const isoYear = target.getUTCFullYear();
	const janFirst = new Date(Date.UTC(isoYear, 0, 1));
	const janFirstDay = janFirst.getUTCDay() === 0 ? 7 : janFirst.getUTCDay();
	const firstThursday = new Date(Date.UTC(isoYear, 0, 1 + (4 - janFirstDay + (janFirstDay > 4 ? 7 : 0))));
	const isoWeek = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604_800_000);
	return { year: isoYear, week: isoWeek };
}

function getWeekOfYearSunday(date: Date, dayOfYear: number): number {
	const jan1 = new Date(date.getFullYear(), 0, 1);
	const jan1Day = jan1.getDay();
	const daysToFirstSunday = (7 - jan1Day) % 7;
	if (dayOfYear <= daysToFirstSunday) {
		return 0;
	}
	return 1 + Math.floor((dayOfYear - daysToFirstSunday - 1) / 7);
}

function getWeekOfYearMonday(date: Date, dayOfYear: number): number {
	const jan1 = new Date(date.getFullYear(), 0, 1);
	const jan1Day = jan1.getDay() === 0 ? 7 : jan1.getDay();
	const daysToFirstMonday = (8 - jan1Day) % 7;
	if (dayOfYear <= daysToFirstMonday) {
		return 0;
	}
	return 1 + Math.floor((dayOfYear - daysToFirstMonday - 1) / 7);
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
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(16).padStart(4, '0') : '-';
					case 'X':
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(16).toUpperCase().padStart(4, '0') : '-';
					case 'd':
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(10) : '-';
					case 'b':
						return stat.mode !== undefined ? (stat.mode & 0xffff).toString(2).padStart(16, '0') : '-';
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
