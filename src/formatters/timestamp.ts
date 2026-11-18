const NS_PER_SECOND = 1_000_000_000n;

const TIMESTAMP_FORMATTERS = new Map<string, (date: Date) => string>([
	['iso-8601', (date) => `${formatLocalDate(date)}T${formatLocalTime(date)}${formatTimezoneOffset(date)}`],
	['iso-utc', (date) => `${formatUtcDate(date)}T${formatUtcTime(date)}Z`],
	['iso-datetime', (date) => `${formatLocalDate(date)} ${formatLocalTime(date)}`],
	['iso-date', formatLocalDate],
	['iso-time', formatLocalTime],
]);

export function formatTimestamp(
	date: Date,
	format: 'iso-8601' | 'iso-utc' | 'iso-datetime' | 'iso-date' | 'iso-time' | (string & {}) = 'iso-datetime',
): string | undefined {
	if (Number.isNaN(date.getTime())) {
		return undefined;
	}

	return TIMESTAMP_FORMATTERS.get(format)?.(date);
}

export function formatNanosecondTimestamp(ns?: bigint, fallbackDate?: Date): string | undefined {
	if (ns !== undefined) {
		let seconds = ns / NS_PER_SECOND;
		let subNs = ns % NS_PER_SECOND;
		if (subNs < 0n) {
			seconds -= 1n;
			subNs += NS_PER_SECOND;
		}
		const date = new Date(Number(seconds) * 1000);
		if (Number.isNaN(date.getTime())) {
			return undefined;
		}
		return `${formatLocalDate(date)} ${formatLocalTime(date)}.${padZero(Number(subNs), 9)} ${formatCompactTimezoneOffset(date)}`;
	}

	if (fallbackDate !== undefined && !Number.isNaN(fallbackDate.getTime())) {
		const subNs = `${padZero(fallbackDate.getMilliseconds(), 3)}000000`;
		return `${formatLocalDate(fallbackDate)} ${formatLocalTime(fallbackDate)}.${subNs} ${formatCompactTimezoneOffset(fallbackDate)}`;
	}

	return undefined;
}

function formatLocalDate(date: Date): string {
	return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatLocalTime(date: Date): string {
	return formatTimeParts(date.getHours(), date.getMinutes(), date.getSeconds());
}

function getTimezoneOffsetParts(date: Date): { sign: string; hours: string; minutes: string } {
	const offsetMinutes = Math.round(-date.getTimezoneOffset());
	if (offsetMinutes === 0) {
		return { sign: '+', hours: '00', minutes: '00' };
	}
	const sign = offsetMinutes > 0 ? '+' : '-';
	const absMinutes = Math.abs(offsetMinutes);
	return {
		sign,
		hours: padZero(Math.floor(absMinutes / 60), 2),
		minutes: padZero(absMinutes % 60, 2),
	};
}

function formatTimezoneOffset(date: Date): string {
	const { sign, hours, minutes } = getTimezoneOffsetParts(date);
	return `${sign}${hours}:${minutes}`;
}

function formatCompactTimezoneOffset(date: Date): string {
	const { sign, hours, minutes } = getTimezoneOffsetParts(date);
	return `${sign}${hours}${minutes}`;
}

function formatUtcDate(date: Date): string {
	return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function formatUtcTime(date: Date): string {
	return formatTimeParts(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

function formatDateParts(year: number, month: number, day: number): string {
	return `${formatYear(year)}-${padZero(month, 2)}-${padZero(day, 2)}`;
}

function formatTimeParts(hours: number, minutes: number, seconds: number): string {
	return `${padZero(hours, 2)}:${padZero(minutes, 2)}:${padZero(seconds, 2)}`;
}

function formatYear(year: number): string {
	if (year < 0) {
		return `-${padZero(Math.abs(year), 4)}`;
	}
	return padZero(year, 4);
}

function padZero(value: number, width: number): string {
	return value.toString().padStart(width, '0');
}
