// POSIX file type constants
/** Bit mask for the file type bit field. */
export const S_IFMT = 0o170000;
/** Socket. */
export const S_IFSOCK = 0o140000;
/** Symbolic link. */
export const S_IFLNK = 0o120000;
/** Regular file. */
export const S_IFREG = 0o100000;
/** Block special file. */
export const S_IFBLK = 0o060000;
/** Directory. */
export const S_IFDIR = 0o040000;
/** Character special file. */
export const S_IFCHR = 0o020000;
/** FIFO special file (named pipe). */
export const S_IFIFO = 0o010000;

// POSIX special mode bits
/** Set user ID on execution. */
export const S_ISUID = 0o004000;
/** Set group ID on execution. */
export const S_ISGID = 0o002000;
/** Restricted deletion flag (sticky bit). */
export const S_ISVTX = 0o001000;

// POSIX file mode permission bits
/** Read, write, and execute/search by owner. */
export const S_IRWXU = 0o000700;
/** Read permission, owner. */
export const S_IRUSR = 0o000400;
/** Write permission, owner. */
export const S_IWUSR = 0o000200;
/** Execute/search permission, owner. */
export const S_IXUSR = 0o000100;

/** Read, write, and execute/search by group. */
export const S_IRWXG = 0o000070;
/** Read permission, group. */
export const S_IRGRP = 0o000040;
/** Write permission, group. */
export const S_IWGRP = 0o000020;
/** Execute/search permission, group. */
export const S_IXGRP = 0o000010;

/** Read, write, and execute/search by others. */
export const S_IRWXO = 0o000007;
/** Read permission, others. */
export const S_IROTH = 0o000004;
/** Write permission, others. */
export const S_IWOTH = 0o000002;
/** Execute/search permission, others. */
export const S_IXOTH = 0o000001;

// POSIX mode and permission bit masks
/** Bit mask for 16-bit file mode (file type, special bits, and permissions). */
export const MODE_MASK = 0xffff;
/** Bit mask for all permission and special mode bits (0o7777). */
export const ALL_PERMISSION_MASK = S_ISUID | S_ISGID | S_ISVTX | S_IRWXU | S_IRWXG | S_IRWXO;
/** Bit mask for standard rwx access permissions (0o0777). */
export const ACCESS_PERMISSION_MASK = S_IRWXU | S_IRWXG | S_IRWXO;

// File type character representations
/** Single-character representation of POSIX file types for symbolic mode. */
export const FILE_TYPE_CHARS: Readonly<Record<number, string>> = {
	[S_IFSOCK]: 's',
	[S_IFLNK]: 'l',
	[S_IFREG]: '-',
	[S_IFBLK]: 'b',
	[S_IFDIR]: 'd',
	[S_IFCHR]: 'c',
	[S_IFIFO]: 'p',
};

// File size units and step bases
/** Decimal base step for SI units (1000). */
export const SI_BASE = 1000;
/** Binary base step for IEC units (1024). */
export const IEC_BASE = 1024;

/** SI (metric, 1000-based) file size units. */
export const SI_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;
/** IEC (binary, 1024-based) file size units. */
export const IEC_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const;

// Time constants (milliseconds)
/** Milliseconds in a standard 24-hour day. */
export const MS_PER_DAY = 86_400_000;
/** Milliseconds in a 7-day week. */
export const MS_PER_WEEK = 7 * MS_PER_DAY;

// Display placeholders & Extension configuration
/** Fallback placeholder for unavailable or missing metadata attributes. */
export const UNAVAILABLE_PLACEHOLDER = '-';

/** Extension package name and configuration namespace. */
export const EXTENSION_NAME = 'file-statbar';
/** Command identifier for manual statistics refresh. */
export const COMMAND_REFRESH = 'file-statbar.refresh';
/** Unique identifier for the status bar item. */
export const STATUS_BAR_ITEM_ID = 'file-statbar.item';
/** Display name for the extension UI elements. */
export const EXTENSION_DISPLAY_NAME = 'File StatBar';

/** Default status bar display template. */
export const DEFAULT_TEMPLATE = '[ {mode} | {size:iec} | {mtime} (M) ]';
/** Default status bar alignment position. */
export const DEFAULT_POSITION = 'right';
/** Default status bar priority. */
export const DEFAULT_PRIORITY = 1024;
/** Default strftime format pattern for file timestamps. */
export const DEFAULT_STRFTIME_PATTERN = '%Y-%m-%d %H:%M:%S';
