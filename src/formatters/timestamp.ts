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

function formatLocalDate(date: Date): string {
	return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatLocalTime(date: Date): string {
	return formatTimeParts(date.getHours(), date.getMinutes(), date.getSeconds());
}

function formatTimezoneOffset(date: Date): string {
	const offsetMinutes = Math.round(-date.getTimezoneOffset());
	if (offsetMinutes === 0) {
		return '+00:00';
	}
	const sign = offsetMinutes > 0 ? '+' : '-';
	const absMinutes = Math.abs(offsetMinutes);
	const hours = Math.floor(absMinutes / 60);
	const minutes = absMinutes % 60;
	return `${sign}${padZero(hours, 2)}:${padZero(minutes, 2)}`;
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
