const NS_PER_S = 1_000_000_000n;

const TIMESTAMP_FORMATTERS = new Map<string, (date: Date, nanoseconds: number) => string>([
	['iso-8601', (date) => `${formatLocalDate(date)}T${formatLocalTime(date)}${formatTimezoneOffset(date)}`],
	['iso-utc', (date) => `${formatUtcDate(date)}T${formatUtcTime(date)}Z`],
	['datetime', (date) => `${formatLocalDate(date)} ${formatLocalTime(date)}`],
	['date', formatLocalDate],
	['time', formatLocalTime],
	[
		'gnu-full-iso',
		(date, nanoseconds) =>
			`${formatLocalDate(date)} ${formatLocalTime(date)}.${padZero(nanoseconds, 9)} ${formatTimezoneOffset(date, '')}`,
	],
]);

export function formatTimestamp(
	ns: bigint,
	format: 'iso-8601' | 'iso-utc' | 'datetime' | 'date' | 'time' | 'gnu-full-iso' | (string & {}) = 'datetime',
): string | undefined {
	const formatter = TIMESTAMP_FORMATTERS.get(format);
	if (!formatter) {
		return undefined;
	}

	let seconds = ns / NS_PER_S;
	let nanoseconds = ns % NS_PER_S;
	if (nanoseconds < 0n) {
		seconds -= 1n;
		nanoseconds += NS_PER_S;
	}

	const date = new Date(Number(seconds) * 1000);
	if (Number.isNaN(date.getTime())) {
		return undefined;
	}

	return formatter(date, Number(nanoseconds));
}

function formatLocalDate(date: Date): string {
	return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatLocalTime(date: Date): string {
	return formatTimeParts(date.getHours(), date.getMinutes(), date.getSeconds());
}

function formatUtcDate(date: Date): string {
	return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function formatUtcTime(date: Date): string {
	return formatTimeParts(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

function formatTimezoneOffset(date: Date, separator = ':'): string {
	const offsetMinutes = Math.round(-date.getTimezoneOffset());
	const sign = offsetMinutes < 0 ? '-' : '+';
	const absMinutes = Math.abs(offsetMinutes);
	const hours = padZero(Math.floor(absMinutes / 60), 2);
	const minutes = padZero(absMinutes % 60, 2);
	return `${sign}${hours}${separator}${minutes}`;
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
