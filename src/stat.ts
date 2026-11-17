import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import type { Stats } from './types.js';

export async function stat(uri: vscode.Uri, logger?: vscode.LogOutputChannel): Promise<Stats | undefined> {
	return uri.scheme === 'file' ? statLocal(uri, logger) : statVirtual(uri, logger);
}

async function statLocal(uri: vscode.Uri, logger?: vscode.LogOutputChannel): Promise<Stats | undefined> {
	const { fsPath } = uri;

	try {
		const stats = await fs.lstat(fsPath, { bigint: true });
		let symlinkTarget: string | undefined;

		if (stats.isSymbolicLink()) {
			try {
				symlinkTarget = await fs.readlink(fsPath);
			} catch (err) {
				logger?.debug(`readlink: ${fsPath}: ${String(err)}`);
			}
		}

		return {
			dev: stats.dev,
			ino: stats.ino,
			mode: Number(stats.mode),
			nlink: Number(stats.nlink),
			uid: Number(stats.uid),
			gid: Number(stats.gid),
			rdev: stats.rdev,
			size: Number(stats.size),
			blksize: Number(stats.blksize),
			blocks: Number(stats.blocks),
			atime: stats.atime,
			mtime: stats.mtime,
			ctime: stats.ctime,
			btime: stats.birthtime.getTime() !== 0 ? stats.birthtime : undefined,
			atimeNs: stats.atimeNs,
			mtimeNs: stats.mtimeNs,
			ctimeNs: stats.ctimeNs,
			btimeNs: stats.birthtimeNs !== 0n ? stats.birthtimeNs : undefined,
			filePath: resolveFilePath(uri),
			symlinkTarget,
		};
	} catch (err) {
		logger?.debug(`stat: ${fsPath}: ${String(err)}`);
		return undefined;
	}
}

async function statVirtual(uri: vscode.Uri, logger?: vscode.LogOutputChannel): Promise<Stats | undefined> {
	try {
		const stats = await vscode.workspace.fs.stat(uri);
		const isReadonly = Boolean((stats.permissions ?? 0) & vscode.FilePermission.Readonly);

		let mode: number | undefined;
		if ((stats.type & vscode.FileType.SymbolicLink) !== 0) {
			mode = constants.S_IFLNK | constants.S_IRWXU;
		} else if ((stats.type & vscode.FileType.Directory) !== 0) {
			mode = constants.S_IFDIR | constants.S_IRUSR | (isReadonly ? 0 : constants.S_IWUSR) | constants.S_IXUSR;
		} else if ((stats.type & vscode.FileType.File) !== 0) {
			mode = constants.S_IFREG | constants.S_IRUSR | (isReadonly ? 0 : constants.S_IWUSR);
		}

		return {
			mode,
			size: stats.size,
			mtime: stats.mtime > 0 ? new Date(stats.mtime) : undefined,
			btime: stats.ctime > 0 ? new Date(stats.ctime) : undefined,
			filePath: resolveFilePath(uri),
		};
	} catch (err) {
		logger?.debug(`stat: ${uri.toString()}: ${String(err)}`);
		return undefined;
	}
}

function resolveFilePath(uri: vscode.Uri): string {
	if (vscode.workspace.getWorkspaceFolder(uri)) {
		return vscode.workspace.asRelativePath(uri, false);
	}
	return uri.scheme === 'file' ? uri.fsPath : uri.path;
}
