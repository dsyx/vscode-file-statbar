const DECIMAL_PLACES = 2;

const UNIT_SYSTEMS = new Map([
	[
		'si',
		{
			base: 1000,
			units: ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'],
		},
	],
	[
		'iec',
		{
			base: 1024,
			units: ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'],
		},
	],
]);

export function formatSize(
	bytes: number,
	format: 'bytes' | 'si' | 'iec' | (string & {}) = 'bytes',
): string | undefined {
	if (!Number.isInteger(bytes) || bytes < 0) {
		return undefined;
	}

	if (format === 'bytes') {
		return `${bytes} B`;
	}

	const system = UNIT_SYSTEMS.get(format);
	if (!system) {
		return undefined;
	}

	const { base, units } = system;
	if (bytes < base) {
		return `${bytes} ${units[0]}`;
	}

	let unitIndex = 1;
	let divisor = base;
	while (unitIndex < units.length - 1 && bytes >= divisor * base) {
		divisor *= base;
		unitIndex++;
	}

	const value = bytes / divisor;
	const fixed = value.toFixed(DECIMAL_PLACES);
	if (unitIndex < units.length - 1 && Number(fixed) >= base) {
		return `${(value / base).toFixed(DECIMAL_PLACES)} ${units[unitIndex + 1]}`;
	}

	return `${fixed} ${units[unitIndex]}`;
}
