import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import * as constants from './constants.js';
import type { Stats } from './types.js';

const NS_PER_MS = 1_000_000n;

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
			mode: stats.mode,
			nlink: stats.nlink,
			uid: stats.uid,
			gid: stats.gid,
			rdev: stats.rdev,
			size: stats.size,
			blksize: stats.blksize,
			blocks: stats.blocks,
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
		// `workspace.fs.stat()` does not inject `FilePermission.Readonly` when a readonly provider omits `permissions`.
		const isReadonly =
			((stats.permissions ?? 0) & vscode.FilePermission.Readonly) !== 0 ||
			vscode.workspace.fs.isWritableFileSystem(uri.scheme) === false;

		let mode: bigint | undefined;
		if ((stats.type & vscode.FileType.SymbolicLink) !== 0) {
			mode = BigInt(constants.S_IFLNK | constants.S_IRWXU);
		} else if ((stats.type & vscode.FileType.Directory) !== 0) {
			mode = BigInt(constants.S_IFDIR | constants.S_IRUSR | (isReadonly ? 0 : constants.S_IWUSR) | constants.S_IXUSR);
		} else if ((stats.type & vscode.FileType.File) !== 0) {
			mode = BigInt(constants.S_IFREG | constants.S_IRUSR | (isReadonly ? 0 : constants.S_IWUSR));
		}

		return {
			mode,
			size: BigInt(Math.trunc(stats.size)),
			mtimeNs: stats.mtime > 0 ? BigInt(Math.trunc(stats.mtime)) * NS_PER_MS : undefined,
			btimeNs: stats.ctime > 0 ? BigInt(Math.trunc(stats.ctime)) * NS_PER_MS : undefined,
			filePath: resolveFilePath(uri),
		};
	} catch (err) {
		logger?.debug(`stat: ${uri.toString()}: ${String(err)}`);
		return undefined;
	}
}

function resolveFilePath(uri: vscode.Uri): string {
	if (vscode.workspace.getWorkspaceFolder(uri)) {
		return vscode.workspace.asRelativePath(uri);
	}
	return uri.scheme === 'file' ? uri.fsPath : uri.path;
}
