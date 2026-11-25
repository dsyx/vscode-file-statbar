export type Position = 'left' | 'right';

export interface Config {
	readonly template: string;
	readonly position: Position;
	readonly priority: number;
}

export interface Stats {
	readonly dev?: bigint;
	readonly ino?: bigint;
	readonly mode?: bigint;
	readonly nlink?: bigint;
	readonly uid?: bigint;
	readonly gid?: bigint;
	readonly rdev?: bigint;
	readonly size?: bigint;
	readonly blksize?: bigint;
	readonly blocks?: bigint;
	readonly atimeNs?: bigint;
	readonly mtimeNs?: bigint;
	readonly ctimeNs?: bigint;
	readonly btimeNs?: bigint;

	readonly filePath: string;
	readonly symlinkTarget?: string;
}
