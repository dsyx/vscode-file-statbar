export type Position = 'left' | 'right';

export interface Config {
	readonly template: string;
	readonly position: Position;
	readonly priority: number;
}

export interface Stats {
	readonly dev?: bigint;
	readonly ino?: bigint;
	readonly mode?: number;
	readonly nlink?: number;
	readonly uid?: number;
	readonly gid?: number;
	readonly rdev?: bigint;
	readonly size: number;
	readonly blksize?: number;
	readonly blocks?: number;
	readonly atime?: Date;
	readonly mtime?: Date;
	readonly ctime?: Date;
	readonly btime?: Date;
	readonly atimeNs?: bigint;
	readonly mtimeNs?: bigint;
	readonly ctimeNs?: bigint;
	readonly btimeNs?: bigint;

	readonly filePath: string;
	readonly symlinkTarget?: string;
}
