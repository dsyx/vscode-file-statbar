import * as constants from './constants.js';

const MODE_MASK = 0xffff;
const ALLPERMS_MASK =
	constants.S_ISUID | constants.S_ISGID | constants.S_ISVTX | constants.S_IRWXU | constants.S_IRWXG | constants.S_IRWXO;

const MODE_FORMATTERS = new Map<string, (mode: number) => string>([
	['s', formatSymbolicMode],
	['b', (mode) => mode.toString(2).padStart(16, '0')],
	['o', (mode) => mode.toString(8).padStart(6, '0')],
	['d', (mode) => mode.toString(10)],
	['x', (mode) => mode.toString(16).padStart(4, '0')],
	['X', (mode) => mode.toString(16).toUpperCase().padStart(4, '0')],
]);

const FILE_TYPE_CHARS = new Map<number, string>([
	[constants.S_IFSOCK, 's'],
	[constants.S_IFLNK, 'l'],
	[constants.S_IFREG, '-'],
	[constants.S_IFBLK, 'b'],
	[constants.S_IFDIR, 'd'],
	[constants.S_IFCHR, 'c'],
	[constants.S_IFIFO, 'p'],
]);

const FILE_TYPE_NAMES = new Map<number, string>([
	[constants.S_IFSOCK, 'socket'],
	[constants.S_IFLNK, 'symbolic link'],
	[constants.S_IFREG, 'regular file'],
	[constants.S_IFBLK, 'block device'],
	[constants.S_IFDIR, 'directory'],
	[constants.S_IFCHR, 'char device'],
	[constants.S_IFIFO, 'fifo'],
]);

const PERMISSION_GROUPS = [
	[constants.S_IRUSR, constants.S_IWUSR, constants.S_IXUSR, constants.S_ISUID, 's'],
	[constants.S_IRGRP, constants.S_IWGRP, constants.S_IXGRP, constants.S_ISGID, 's'],
	[constants.S_IROTH, constants.S_IWOTH, constants.S_IXOTH, constants.S_ISVTX, 't'],
] as const;

export function formatMode(
	mode: number,
	format: 's' | 'b' | 'o' | 'd' | 'x' | 'X' | (string & {}) = 's',
): string | undefined {
	if (!isValidMode(mode)) {
		return undefined;
	}

	return MODE_FORMATTERS.get(format)?.(mode);
}

export function formatFileType(mode: number): string | undefined {
	if (!isValidMode(mode)) {
		return undefined;
	}

	return FILE_TYPE_NAMES.get(mode & constants.S_IFMT) ?? '?';
}

export function formatPermissions(mode: number): string | undefined {
	if (!isValidMode(mode)) {
		return undefined;
	}

	const octal = (mode & ALLPERMS_MASK).toString(8).padStart(4, '0');
	return `${octal} (${formatPermissionBits(mode)})`;
}

function isValidMode(mode: number): boolean {
	return Number.isInteger(mode) && mode >= 0 && mode <= MODE_MASK;
}

function formatSymbolicMode(mode: number): string {
	const typeChar = FILE_TYPE_CHARS.get(mode & constants.S_IFMT) ?? '?';
	return `${typeChar}${formatPermissionBits(mode)}`;
}

function formatPermissionBits(mode: number): string {
	let result = '';
	for (const [rb, wb, xb, sb, sc] of PERMISSION_GROUPS) {
		result += mode & rb ? 'r' : '-';
		result += mode & wb ? 'w' : '-';
		const hasX = (mode & xb) !== 0;
		if (mode & sb) {
			result += hasX ? sc : sc.toUpperCase();
		} else {
			result += hasX ? 'x' : '-';
		}
	}
	return result;
}
