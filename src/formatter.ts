import * as constants from './constants.js';

export function formatMode(mode?: number, modifier?: string): string | undefined {
	if (mode === undefined || !Number.isInteger(mode) || mode < 0) {
		return undefined;
	}

	if (modifier === undefined) {
		return formatSymbolicMode(mode);
	}

	const bits = mode & constants.MODE_MASK;
	switch (modifier) {
		case 'b':
			return zeroPad(bits.toString(2), 16);
		case 'o':
			return zeroPad(bits.toString(8), 6);
		case 'd':
			return bits.toString(10);
		case 'x':
			return zeroPad(bits.toString(16), 4);
		case 'X':
			return zeroPad(bits.toString(16).toUpperCase(), 4);
		default:
			return undefined;
	}
}

export function formatSize(bytes?: number, format: 'bytes' | 'si' | 'iec' = 'bytes'): string | undefined {
	if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
		return undefined;
	}

	if (format === 'bytes') {
		return `${bytes} B`;
	}

	const isIec = format === 'iec';
	const base = isIec ? constants.IEC_BASE : constants.SI_BASE;
	const units = isIec ? constants.IEC_UNITS : constants.SI_UNITS;

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

export function formatStrftime(date: Date | undefined, pattern: string): string | undefined {
	if (!date || Number.isNaN(date.getTime())) {
		return undefined;
	}

	return strftime(date, pattern);
}

function formatSymbolicMode(mode: number): string {
	const typeChar = constants.FILE_TYPE_CHARS[mode & constants.S_IFMT] ?? '-';

	const userR = mode & constants.S_IRUSR ? 'r' : '-';
	const userW = mode & constants.S_IWUSR ? 'w' : '-';
	let userX = mode & constants.S_IXUSR ? 'x' : '-';
	if (mode & constants.S_ISUID) {
		userX = userX === 'x' ? 's' : 'S';
	}

	const groupR = mode & constants.S_IRGRP ? 'r' : '-';
	const groupW = mode & constants.S_IWGRP ? 'w' : '-';
	let groupX = mode & constants.S_IXGRP ? 'x' : '-';
	if (mode & constants.S_ISGID) {
		groupX = groupX === 'x' ? 's' : 'S';
	}

	const otherR = mode & constants.S_IROTH ? 'r' : '-';
	const otherW = mode & constants.S_IWOTH ? 'w' : '-';
	let otherX = mode & constants.S_IXOTH ? 'x' : '-';
	if (mode & constants.S_ISVTX) {
		otherX = otherX === 'x' ? 't' : 'T';
	}

	return `${typeChar}${userR}${userW}${userX}${groupR}${groupW}${groupX}${otherR}${otherW}${otherX}`;
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

function formatTimezoneOffset(date: Date): string {
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const absOffset = Math.abs(offset);
	return `${sign}${zeroPad(Math.floor(absOffset / 60), 2)}${zeroPad(absOffset % 60, 2)}`;
}

function getDayOfYear(date: Date): number {
	const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	const utcStart = Date.UTC(date.getFullYear(), 0, 1);
	return Math.floor((utcDate - utcStart) / constants.MS_PER_DAY) + 1;
}

function getIsoWeekDetails(date: Date): { year: number; week: number } {
	const day = date.getDay() === 0 ? 7 : date.getDay();
	const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	target.setUTCDate(target.getUTCDate() + (4 - day));
	const isoYear = target.getUTCFullYear();
	const janFirst = new Date(Date.UTC(isoYear, 0, 1));
	const janFirstDay = janFirst.getUTCDay() === 0 ? 7 : janFirst.getUTCDay();
	const firstThursday = new Date(Date.UTC(isoYear, 0, 1 + (4 - janFirstDay + (janFirstDay > 4 ? 7 : 0))));
	const isoWeek = 1 + Math.round((target.getTime() - firstThursday.getTime()) / constants.MS_PER_WEEK);
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
