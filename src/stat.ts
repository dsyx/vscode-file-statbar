import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import type { Stats } from './types.js';

export function getActiveUri(): vscode.Uri | undefined {
	const input = vscode.window.tabGroups.activeTabGroup?.activeTab?.input;
	let uri: vscode.Uri | undefined;

	if (
		input instanceof vscode.TabInputText ||
		input instanceof vscode.TabInputCustom ||
		input instanceof vscode.TabInputNotebook
	) {
		uri = input.uri;
	} else if (input instanceof vscode.TabInputTextDiff || input instanceof vscode.TabInputNotebookDiff) {
		uri = input.modified;
	} else {
		uri = vscode.window.activeTextEditor?.document.uri;
	}

	if (uri && (uri.scheme === 'file' || vscode.workspace.fs.isWritableFileSystem(uri.scheme) !== undefined)) {
		return uri;
	}

	return undefined;
}

export async function getStat(
	target: vscode.Uri | string,
	logError?: (msg: string) => void,
): Promise<Stats | undefined> {
	const uri = typeof target === 'string' ? vscode.Uri.file(target) : target;
	if (uri.scheme === 'file') {
		return getLocalStat(uri, logError);
	}

	return getVirtualStat(uri, logError);
}

async function getLocalStat(uri: vscode.Uri, logError?: (msg: string) => void): Promise<Stats | undefined> {
	const { fsPath } = uri;

	try {
		const stats = await fs.lstat(fsPath, { bigint: true });
		let symlinkTarget: string | undefined;

		if (stats.isSymbolicLink()) {
			try {
				symlinkTarget = await fs.readlink(fsPath);
			} catch (err) {
				logError?.(`Failed to read symlink target for ${fsPath}: ${String(err)}`);
			}
		}

		// A zero birth time means the file system does not report it.
		const hasBirthtime = stats.birthtimeNs !== 0n;

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
			birthtime: hasBirthtime ? stats.birthtime : undefined,
			atimeNs: stats.atimeNs,
			mtimeNs: stats.mtimeNs,
			ctimeNs: stats.ctimeNs,
			birthtimeNs: hasBirthtime ? stats.birthtimeNs : undefined,
			filePath: resolveFilePath(uri),
			symlinkTarget,
		};
	} catch (err) {
		logError?.(`Failed to stat local file ${fsPath}: ${String(err)}`);
		return undefined;
	}
}

async function getVirtualStat(uri: vscode.Uri, logError?: (msg: string) => void): Promise<Stats | undefined> {
	try {
		const vStat = await vscode.workspace.fs.stat(uri);
		const isReadonly = Boolean(vStat.permissions && vStat.permissions & vscode.FilePermission.Readonly);

		let mode: number | undefined;
		if ((vStat.type & vscode.FileType.SymbolicLink) !== 0) {
			mode = 0o120777;
		} else if ((vStat.type & vscode.FileType.Directory) !== 0) {
			mode = isReadonly ? 0o040555 : 0o040755;
		} else if ((vStat.type & vscode.FileType.File) !== 0) {
			mode = isReadonly ? 0o100444 : 0o100644;
		}

		return {
			mode,
			size: vStat.size,
			mtime: vStat.mtime > 0 ? new Date(vStat.mtime) : undefined,
			// vscode.FileStat.ctime is file creation time in VS Code API, not POSIX status change time.
			birthtime: vStat.ctime > 0 ? new Date(vStat.ctime) : undefined,
			filePath: resolveFilePath(uri),
		};
	} catch (err) {
		logError?.(`Failed to stat virtual file ${uri.toString()}: ${String(err)}`);
		return undefined;
	}
}

function resolveFilePath(uri: vscode.Uri): string {
	if (vscode.workspace.getWorkspaceFolder(uri)) {
		return vscode.workspace.asRelativePath(uri, false);
	}
	return uri.scheme === 'file' ? uri.fsPath : uri.path;
}
