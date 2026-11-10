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

const S_IRWXU = 0o000700;
const S_IRUSR = 0o000400;
const S_IWUSR = 0o000200;
const S_IXUSR = 0o000100;

const S_IRWXG = 0o000070;
const S_IRGRP = 0o000040;
const S_IWGRP = 0o000020;
const S_IXGRP = 0o000010;

const S_IRWXO = 0o000007;
const S_IROTH = 0o000004;
const S_IWOTH = 0o000002;
const S_IXOTH = 0o000001;

const FILE_TYPE_CHARS: Readonly<Record<number, string>> = {
	[S_IFSOCK]: 's',
	[S_IFLNK]: 'l',
	[S_IFREG]: '-',
	[S_IFBLK]: 'b',
	[S_IFDIR]: 'd',
	[S_IFCHR]: 'c',
	[S_IFIFO]: 'p',
};

const SI_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;
const IEC_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const;

export type FileSizeFormat = 'bytes' | 'si' | 'iec';

export function formatMode(mode?: number, modifier?: string): string | undefined {
	if (mode === undefined || !Number.isInteger(mode) || mode < 0) {
		return undefined;
	}

	const bits = mode & 0xffff;
	switch (modifier) {
		case undefined: {
			const typeChar = FILE_TYPE_CHARS[mode & S_IFMT] ?? '-';

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
		case 'o':
			return (mode & (S_ISUID | S_ISGID | S_ISVTX | S_IRWXU | S_IRWXG | S_IRWXO)).toString(8).padStart(4, '0');
		case 'b':
			return bits.toString(2).padStart(16, '0');
		case 'd':
			return bits.toString(10);
		case 'x':
			return bits.toString(16).padStart(4, '0');
		case 'X':
			return bits.toString(16).toUpperCase().padStart(4, '0');
		default:
			return undefined;
	}
}

export function formatSize(bytes?: number, format: FileSizeFormat = 'bytes'): string | undefined {
	if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
		return undefined;
	}

	if (format === 'bytes') {
		return `${bytes} B`;
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
		return `${bytes} ${units[0]}`;
	}

	// Advance unit if 2-decimal rounding pushes value to base (e.g. 1048575 B -> 1023.999 KiB -> rounds to 1024.00 KiB -> 1.00 MiB)
	if (Number(value.toFixed(2)) >= base && unitIndex < units.length - 1) {
		unitIndex++;
		value /= base;
	}

	return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function formatStrftime(date?: Date, pattern = '%Y-%m-%d %H:%M:%S'): string | undefined {
	if (!date || Number.isNaN(date.getTime())) {
		return undefined;
	}

	return strftime(date, pattern);
}

function strftime(date: Date, pattern: string): string {
	let cachedDayOfYear: number | undefined;
	const dayOfYear = (): number => {
		cachedDayOfYear ??= getDayOfYear(date);
		return cachedDayOfYear;
	};

	let cachedIso: { year: number; week: number } | undefined;
	const iso = (): { year: number; week: number } => {
		cachedIso ??= getIsoWeekDetails(date);
		return cachedIso;
	};

	return pattern.replace(/%[YyCmdejHIMSsuwVGgUWzFTR%]/g, (match) => {
		switch (match) {
			case '%Y':
				return String(date.getFullYear());
			case '%y':
				return String(date.getFullYear()).slice(-2);
			case '%C':
				return zeroPad(Math.floor(date.getFullYear() / 100));
			case '%m':
				return zeroPad(date.getMonth() + 1);
			case '%d':
				return zeroPad(date.getDate());
			case '%e':
				return String(date.getDate()).padStart(2, ' ');
			case '%j':
				return zeroPad(dayOfYear(), 3);
			case '%H':
				return zeroPad(date.getHours());
			case '%I':
				return zeroPad(date.getHours() % 12 || 12);
			case '%M':
				return zeroPad(date.getMinutes());
			case '%S':
				return zeroPad(date.getSeconds());
			case '%s':
				return String(Math.floor(date.getTime() / 1000));
			case '%u':
				return String(date.getDay() === 0 ? 7 : date.getDay());
			case '%w':
				return String(date.getDay());
			case '%V':
				return zeroPad(iso().week);
			case '%G':
				return String(iso().year);
			case '%g':
				return String(iso().year).slice(-2);
			case '%U':
				return zeroPad(getWeekOfYearSunday(date, dayOfYear()));
			case '%W':
				return zeroPad(getWeekOfYearMonday(date, dayOfYear()));
			case '%z':
				return formatTimezoneOffset(date);
			case '%F':
				return strftime(date, '%Y-%m-%d');
			case '%T':
				return strftime(date, '%H:%M:%S');
			case '%R':
				return strftime(date, '%H:%M');
			case '%%':
				return '%';
			default:
				return match;
		}
	});
}

function zeroPad(value: number, width = 2): string {
	return String(value).padStart(width, '0');
}

function formatTimezoneOffset(date: Date): string {
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const absOffset = Math.abs(offset);
	return `${sign}${zeroPad(Math.floor(absOffset / 60))}${zeroPad(absOffset % 60)}`;
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
