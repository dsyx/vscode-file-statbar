import { constants } from 'node:fs';

// POSIX special mode bits (not provided in node:fs constants)
const S_ISUID = 0o004000;
const S_ISGID = 0o002000;
const S_ISVTX = 0o001000;

const MODE_MASK = 0xffff;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const SIZE_SYSTEMS = {
	si: {
		base: 1000,
		units: ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'],
	},
	iec: {
		base: 1024,
		units: ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'],
	},
} as const;

const TYPE_CHARS: Readonly<Record<number, string>> = {
	[constants.S_IFSOCK]: 's',
	[constants.S_IFLNK]: 'l',
	[constants.S_IFREG]: '-',
	[constants.S_IFBLK]: 'b',
	[constants.S_IFDIR]: 'd',
	[constants.S_IFCHR]: 'c',
	[constants.S_IFIFO]: 'p',
};

const MODE_FORMATTERS: Record<string, (bits: number) => string> = {
	b: (bits) => zeroPad(bits.toString(2), 16),
	o: (bits) => zeroPad(bits.toString(8), 6),
	d: (bits) => bits.toString(10),
	x: (bits) => zeroPad(bits.toString(16), 4),
	// biome-ignore lint/style/useNamingConvention: modifier X specifies uppercase hexadecimal formatting
	X: (bits) => zeroPad(bits.toString(16).toUpperCase(), 4),
};

export function formatMode(mode?: number, modifier?: string): string | undefined {
	if (mode === undefined || !Number.isInteger(mode) || mode < 0) {
		return undefined;
	}

	if (modifier === undefined) {
		return formatSymbolicMode(mode);
	}

	const formatter = MODE_FORMATTERS[modifier];
	return formatter ? formatter(mode & MODE_MASK) : undefined;
}

export function formatSize(bytes?: number, format?: string): string | undefined {
	if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
		return undefined;
	}

	if (format === undefined || format === 'bytes') {
		return `${bytes} B`;
	}

	const system = SIZE_SYSTEMS[format as keyof typeof SIZE_SYSTEMS];
	if (!system) {
		return undefined;
	}

	const { base, units } = system;

	let value = bytes;
	let unitIndex = 0;

	while (value >= base && unitIndex < units.length - 1) {
		value /= base;
		unitIndex++;
	}

	if (unitIndex === 0) {
		return `${bytes} ${units[0]}`;
	}

	if (Number(value.toFixed(2)) >= base && unitIndex < units.length - 1) {
		unitIndex++;
		value /= base;
	}

	return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function formatStrftime(date: Date | undefined, pattern: string): string | undefined {
	if (!date || Number.isNaN(date.getTime())) {
		return undefined;
	}

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
				return zeroPad(date.getFullYear() % 100, 2);
			case '%C':
				return zeroPad(Math.floor(date.getFullYear() / 100), 2);
			case '%m':
				return zeroPad(date.getMonth() + 1, 2);
			case '%d':
				return zeroPad(date.getDate(), 2);
			case '%e':
				return String(date.getDate()).padStart(2, ' ');
			case '%j':
				return zeroPad(dayOfYear(), 3);
			case '%H':
				return zeroPad(date.getHours(), 2);
			case '%I':
				return zeroPad(date.getHours() % 12 || 12, 2);
			case '%M':
				return zeroPad(date.getMinutes(), 2);
			case '%S':
				return zeroPad(date.getSeconds(), 2);
			case '%s':
				return String(Math.floor(date.getTime() / 1000));
			case '%u':
				return String(date.getDay() === 0 ? 7 : date.getDay());
			case '%w':
				return String(date.getDay());
			case '%V':
				return zeroPad(iso().week, 2);
			case '%G':
				return String(iso().year);
			case '%g':
				return zeroPad(iso().year % 100, 2);
			case '%U':
				return zeroPad(getWeekOfYearSunday(date, dayOfYear()), 2);
			case '%W':
				return zeroPad(getWeekOfYearMonday(date, dayOfYear()), 2);
			case '%z':
				return formatTimezoneOffset(date);
			case '%F':
				return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1, 2)}-${zeroPad(date.getDate(), 2)}`;
			case '%T':
				return `${zeroPad(date.getHours(), 2)}:${zeroPad(date.getMinutes(), 2)}:${zeroPad(date.getSeconds(), 2)}`;
			case '%R':
				return `${zeroPad(date.getHours(), 2)}:${zeroPad(date.getMinutes(), 2)}`;
			case '%%':
				return '%';
			default:
				return match;
		}
	});
}

function formatSymbolicMode(mode: number): string {
	const typeChar = TYPE_CHARS[mode & constants.S_IFMT] ?? '-';

	const userR = mode & constants.S_IRUSR ? 'r' : '-';
	const userW = mode & constants.S_IWUSR ? 'w' : '-';
	let userX = mode & constants.S_IXUSR ? 'x' : '-';
	if (mode & S_ISUID) {
		userX = userX === 'x' ? 's' : 'S';
	}

	const groupR = mode & constants.S_IRGRP ? 'r' : '-';
	const groupW = mode & constants.S_IWGRP ? 'w' : '-';
	let groupX = mode & constants.S_IXGRP ? 'x' : '-';
	if (mode & S_ISGID) {
		groupX = groupX === 'x' ? 's' : 'S';
	}

	const otherR = mode & constants.S_IROTH ? 'r' : '-';
	const otherW = mode & constants.S_IWOTH ? 'w' : '-';
	let otherX = mode & constants.S_IXOTH ? 'x' : '-';
	if (mode & S_ISVTX) {
		otherX = otherX === 'x' ? 't' : 'T';
	}

	return `${typeChar}${userR}${userW}${userX}${groupR}${groupW}${groupX}${otherR}${otherW}${otherX}`;
}

function formatTimezoneOffset(date: Date): string {
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const absOffset = Math.abs(offset);
	return `${sign}${zeroPad(Math.floor(absOffset / 60), 2)}${zeroPad(absOffset % 60, 2)}`;
}

function getDayOfYear(date: Date): number {
	const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	const utcStart = Date.UTC(date.getFullYear(), 0, 1);
	return Math.floor((utcDate - utcStart) / MS_PER_DAY) + 1;
}

function getIsoWeekDetails(date: Date): { year: number; week: number } {
	const day = date.getDay() === 0 ? 7 : date.getDay();
	const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	target.setUTCDate(target.getUTCDate() + (4 - day));
	const isoYear = target.getUTCFullYear();
	const janFirst = new Date(Date.UTC(isoYear, 0, 1));
	const janFirstDay = janFirst.getUTCDay() === 0 ? 7 : janFirst.getUTCDay();
	const firstThursday = new Date(Date.UTC(isoYear, 0, 1 + (4 - janFirstDay + (janFirstDay > 4 ? 7 : 0))));
	const isoWeek = 1 + Math.round((target.getTime() - firstThursday.getTime()) / MS_PER_WEEK);
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

function zeroPad(value: number | string, width: number): string {
	return String(value).padStart(width, '0');
}
