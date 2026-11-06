import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Stats } from './types.js';

export function getActiveFileUri(): vscode.Uri | undefined {
	const activeTabInput = vscode.window.tabGroups.activeTabGroup?.activeTab?.input;
	const isDiffTab =
		activeTabInput instanceof vscode.TabInputTextDiff || activeTabInput instanceof vscode.TabInputNotebookDiff;

	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor?.document?.uri) {
		const { scheme } = activeEditor.document.uri;
		const isReadonlyDiffSide = isDiffTab && !isWritableFileScheme(scheme);
		if (isSupportedFileScheme(scheme) && !isReadonlyDiffSide) {
			return activeEditor.document.uri;
		}
	}

	const uri = getTabInputUri(activeTabInput);
	if (uri && isSupportedFileScheme(uri.scheme)) {
		return uri;
	}

	return undefined;
}

export async function getFileStat(
	target: vscode.Uri | string,
	logError?: (msg: string) => void,
): Promise<Stats | undefined> {
	if (typeof target === 'string') {
		return getLocalFileStat(target, logError);
	}

	if (target.scheme === 'file') {
		return getLocalFileStat(target.fsPath, logError);
	}

	return getVirtualFileStat(target, logError);
}

function isSupportedFileScheme(scheme: string): boolean {
	return scheme === 'file' || vscode.workspace.fs.isWritableFileSystem(scheme) !== undefined;
}

function isWritableFileScheme(scheme: string): boolean {
	return scheme === 'file' || vscode.workspace.fs.isWritableFileSystem(scheme) === true;
}

export function getTabInputUri(input: unknown): vscode.Uri | undefined {
	if (
		input instanceof vscode.TabInputText ||
		input instanceof vscode.TabInputCustom ||
		input instanceof vscode.TabInputNotebook
	) {
		return input.uri;
	}
	if (input instanceof vscode.TabInputTextDiff || input instanceof vscode.TabInputNotebookDiff) {
		return input.modified;
	}
	return undefined;
}

function resolveFilePath(target: vscode.Uri | string): string {
	const uri = typeof target === 'string' ? vscode.Uri.file(target) : target;
	const folders = vscode.workspace.workspaceFolders;
	if (folders && folders.length > 0 && vscode.workspace.getWorkspaceFolder(uri)) {
		return vscode.workspace.asRelativePath(uri, false);
	}
	if (typeof target === 'string') {
		return path.resolve(target);
	}
	return uri.scheme === 'file' ? uri.fsPath : uri.path;
}

async function getLocalFileStat(targetPath: string, logError?: (msg: string) => void): Promise<Stats | undefined> {
	const filePath = resolveFilePath(targetPath);

	try {
		const stats = await fs.lstat(targetPath, { bigint: true });
		let symlinkTarget: string | undefined;

		if (stats.isSymbolicLink()) {
			try {
				symlinkTarget = await fs.readlink(targetPath);
			} catch (err) {
				logError?.(`Failed to read symlink target for ${targetPath}: ${String(err)}`);
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
			filePath,
			symlinkTarget,
		};
	} catch (err) {
		logError?.(`Failed to stat local file ${targetPath}: ${String(err)}`);
		return undefined;
	}
}

async function getVirtualFileStat(uri: vscode.Uri, logError?: (msg: string) => void): Promise<Stats | undefined> {
	const filePath = resolveFilePath(uri);

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
			filePath,
		};
	} catch (err) {
		logError?.(`Failed to stat virtual file ${uri.toString()}: ${String(err)}`);
		return undefined;
	}
}
