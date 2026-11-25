// Extension metadata
export const EXTENSION = {
	name: 'file-statbar',
	displayName: 'File StatBar',
} as const;

// POSIX file type constants
export const S_IFMT = 0o170000; // Bit mask for the file type bit field
export const S_IFSOCK = 0o140000; // Socket
export const S_IFLNK = 0o120000; // Symbolic link
export const S_IFREG = 0o100000; // Regular file
export const S_IFBLK = 0o060000; // Block special file
export const S_IFDIR = 0o040000; // Directory
export const S_IFCHR = 0o020000; // Character special file
export const S_IFIFO = 0o010000; // FIFO special file (named pipe)

// POSIX special mode bits
export const S_ISUID = 0o004000; // Set user ID on execution
export const S_ISGID = 0o002000; // Set group ID on execution
export const S_ISVTX = 0o001000; // Restricted deletion flag (sticky bit)

// POSIX file mode permission bits
export const S_IRWXU = 0o000700; // Read, write, and execute/search by owner
export const S_IRUSR = 0o000400; // Read permission, owner
export const S_IWUSR = 0o000200; // Write permission, owner
export const S_IXUSR = 0o000100; // Execute/search permission, owner
export const S_IRWXG = 0o000070; // Read, write, and execute/search by group
export const S_IRGRP = 0o000040; // Read permission, group
export const S_IWGRP = 0o000020; // Write permission, group
export const S_IXGRP = 0o000010; // Execute/search permission, group
export const S_IRWXO = 0o000007; // Read, write, and execute/search by others
export const S_IROTH = 0o000004; // Read permission, others
export const S_IWOTH = 0o000002; // Write permission, others
export const S_IXOTH = 0o000001; // Execute/search permission, others
