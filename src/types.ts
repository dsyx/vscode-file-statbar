export type Position = 'right' | 'left';

export interface Config {
	template: string;
	position: Position;
	priority: number;
}

export interface Stats {
	dev?: bigint;
	ino?: bigint;
	mode?: number;
	nlink?: number;
	uid?: number;
	gid?: number;
	rdev?: bigint;
	size: number;
	blksize?: number;
	blocks?: number;
	atime?: Date;
	mtime?: Date;
	ctime?: Date;
	birthtime?: Date;
	atimeNs?: bigint;
	mtimeNs?: bigint;
	ctimeNs?: bigint;
	birthtimeNs?: bigint;

	filePath: string;
	symlinkTarget?: string;
}
