// POSIX file type constants
const S_IFMT = 0o170000; // Bit mask for the file type bit field
const S_IFSOCK = 0o140000; // Socket
const S_IFLNK = 0o120000; // Symbolic link
const S_IFREG = 0o100000; // Regular file
const S_IFBLK = 0o060000; // Block special file
const S_IFDIR = 0o040000; // Directory
const S_IFCHR = 0o020000; // Character special file
const S_IFIFO = 0o010000; // FIFO special file (named pipe)

// POSIX special mode bits
const S_ISUID = 0o004000; // Set user ID on execution
const S_ISGID = 0o002000; // Set group ID on execution
const S_ISVTX = 0o001000; // Restricted deletion flag (sticky bit)

// POSIX file mode permission bits
const S_IRWXU = 0o000700; // Read, write, and execute/search by owner
const S_IRUSR = 0o000400; // Read permission, owner
const S_IWUSR = 0o000200; // Write permission, owner
const S_IXUSR = 0o000100; // Execute/search permission, owner

const S_IRWXG = 0o000070; // Read, write, and execute/search by group
const S_IRGRP = 0o000040; // Read permission, group
const S_IWGRP = 0o000020; // Write permission, group
const S_IXGRP = 0o000010; // Execute/search permission, group

const S_IRWXO = 0o000007; // Read, write, and execute/search by others
const S_IROTH = 0o000004; // Read permission, others
const S_IWOTH = 0o000002; // Write permission, others
const S_IXOTH = 0o000001; // Execute/search permission, others

// POSIX mode and permission bit masks
const MODE_MASK = 0xffff; // Bit mask for 16-bit file mode (file type, special bits, and permissions)
const ALL_PERMISSION_MASK = S_ISUID | S_ISGID | S_ISVTX | S_IRWXU | S_IRWXG | S_IRWXO; // Bit mask for all permission and special mode bits (0o7777)

const MODE_FORMATTERS = new Map<string, (mode: number) => string>([
	['s', formatSymbolicMode],
	['b', (mode) => mode.toString(2).padStart(16, '0')],
	['o', (mode) => mode.toString(8).padStart(6, '0')],
	['d', (mode) => mode.toString(10)],
	['x', (mode) => mode.toString(16).padStart(4, '0')],
	['X', (mode) => mode.toString(16).toUpperCase().padStart(4, '0')],
]);

const FILE_TYPE_CHARS = new Map<number, string>([
	[S_IFSOCK, 's'],
	[S_IFLNK, 'l'],
	[S_IFREG, '-'],
	[S_IFBLK, 'b'],
	[S_IFDIR, 'd'],
	[S_IFCHR, 'c'],
	[S_IFIFO, 'p'],
]);

const FILE_TYPE_NAMES = new Map<number, string>([
	[S_IFSOCK, 'socket'],
	[S_IFLNK, 'symbolic link'],
	[S_IFREG, 'regular file'],
	[S_IFBLK, 'block device'],
	[S_IFDIR, 'directory'],
	[S_IFCHR, 'char device'],
	[S_IFIFO, 'fifo'],
]);

const PERMISSION_GROUPS = [
	[S_IRUSR, S_IWUSR, S_IXUSR, S_ISUID, 's'],
	[S_IRGRP, S_IWGRP, S_IXGRP, S_ISGID, 's'],
	[S_IROTH, S_IWOTH, S_IXOTH, S_ISVTX, 't'],
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

	return FILE_TYPE_NAMES.get(mode & S_IFMT) ?? '?';
}

export function formatPermissions(mode: number): string | undefined {
	if (!isValidMode(mode)) {
		return undefined;
	}

	const octal = (mode & ALL_PERMISSION_MASK).toString(8).padStart(4, '0');
	return `${octal} (${formatPermissionBits(mode)})`;
}

function isValidMode(mode: number): boolean {
	return Number.isInteger(mode) && mode >= 0 && mode <= MODE_MASK;
}

function formatSymbolicMode(mode: number): string {
	const typeChar = FILE_TYPE_CHARS.get(mode & S_IFMT) ?? '?';
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
