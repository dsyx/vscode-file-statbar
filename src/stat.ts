import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Stats } from './types.js';

export function getActiveFileUri(): vscode.Uri | undefined {
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor?.document?.uri && isSupportedFileScheme(activeEditor.document.uri.scheme)) {
		return activeEditor.document.uri;
	}

	const uri = getTabInputUri(vscode.window.tabGroups.activeTabGroup?.activeTab?.input);
	if (uri && isSupportedFileScheme(uri.scheme)) {
		return uri;
	}

	return undefined;
}

export async function getFileStat(
	target: vscode.Uri | string,
	logError?: (msg: string) => void,
): Promise<Stats | undefined> {
	const isUri = typeof target !== 'string';
	const uri = isUri ? target : undefined;
	const isLocal = !isUri || target.scheme === 'file';
	const filePath = isUri ? (isLocal ? target.fsPath : target.path) : target;

	if (isLocal) {
		return getLocalFileStat(filePath, logError);
	}

	if (uri) {
		return getVirtualFileStat(uri, logError);
	}

	return undefined;
}

function isSupportedFileScheme(scheme: string): boolean {
	return scheme === 'file' || vscode.workspace.fs.isWritableFileSystem(scheme) !== undefined;
}

function getTabInputUri(input: unknown): vscode.Uri | undefined {
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

async function getLocalFileStat(filePath: string, logError?: (msg: string) => void): Promise<Stats | undefined> {
	const fileName = path.basename(filePath);

	try {
		const stats = await fs.lstat(filePath, { bigint: true });
		let symlinkTarget: string | undefined;

		if (stats.isSymbolicLink()) {
			try {
				symlinkTarget = await fs.readlink(filePath);
			} catch (err) {
				logError?.(`Failed to read symlink target for ${filePath}: ${String(err)}`);
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
			fileName,
			symlinkTarget,
		};
	} catch (err) {
		logError?.(`Failed to stat local file ${filePath}: ${String(err)}`);
		return undefined;
	}
}

async function getVirtualFileStat(uri: vscode.Uri, logError?: (msg: string) => void): Promise<Stats | undefined> {
	const fileName = path.posix.basename(uri.path);

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
			mtime: new Date(vStat.mtime),
			// vscode.FileStat.ctime is file creation time in VS Code API, not POSIX status change time.
			birthtime: new Date(vStat.ctime),
			fileName,
		};
	} catch (err) {
		logError?.(`Failed to stat virtual file ${uri.toString()}: ${String(err)}`);
		return undefined;
	}
}
