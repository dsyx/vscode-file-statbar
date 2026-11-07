import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getActiveUri, getStat } from '../stat.js';

suite('stat tests', () => {
	let tempDir: string;
	let testFilePath: string;
	let symlinkPath: string;

	suiteSetup(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-statbar-test-'));
		testFilePath = path.join(tempDir, 'sample.txt');
		await fs.writeFile(testFilePath, 'Hello, File StatBar!', 'utf8');

		symlinkPath = path.join(tempDir, 'sample-link.txt');
		try {
			await fs.symlink(testFilePath, symlinkPath);
		} catch {
			// Symlinks might not be supported without admin on Windows, handled gracefully
		}
	});

	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	suiteTeardown(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	test('should get accurate stats for a regular file (path string)', async () => {
		const stat = await getStat(testFilePath);
		assert.ok(stat !== undefined);
		assert.strictEqual(stat.filePath, vscode.Uri.file(testFilePath).fsPath);
		assert.strictEqual(stat.size, 20);
		assert.ok(typeof stat.mode === 'number');
		assert.strictEqual(stat.mode & 0o170000, 0o100000);
		assert.ok(stat.atime instanceof Date);
		assert.ok(stat.mtime instanceof Date);
		assert.ok(stat.ctime instanceof Date);
		assert.ok(typeof stat.ino === 'bigint');
		assert.ok(typeof stat.dev === 'bigint');
		assert.ok(typeof stat.mtimeNs === 'bigint');
		assert.ok(stat.mtimeNs > 0n);
	});

	test('should get accurate stats for a file Uri (vscode.Uri with file scheme)', async () => {
		const fileUri = vscode.Uri.file(testFilePath);
		const stat = await getStat(fileUri);
		assert.ok(stat !== undefined);
		assert.strictEqual(stat.filePath, fileUri.fsPath);
		assert.strictEqual(stat.size, 20);
		assert.ok(typeof stat.mode === 'number');
		assert.strictEqual(stat.mode & 0o170000, 0o100000);
	});

	test('should extract active file Uri from open editor and return undefined when closed', async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(getActiveUri(), undefined);

		const doc = await vscode.workspace.openTextDocument(testFilePath);
		await vscode.window.showTextDocument(doc);
		const activeUri = getActiveUri();
		assert.ok(activeUri !== undefined);
		assert.strictEqual(activeUri.fsPath.toLowerCase(), testFilePath.toLowerCase());
	});

	test('should prefer writable modified URI in diff tab when readonly side is focused', async () => {
		const scheme = 'statbar-ro-diff';
		const emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
		const provider: vscode.FileSystemProvider = {
			onDidChangeFile: emitter.event,
			watch: () => new vscode.Disposable(() => {}),
			stat: () => ({ type: vscode.FileType.File, ctime: 0, mtime: 0, size: 5 }),
			readDirectory: () => [],
			createDirectory: () => {},
			readFile: () => new Uint8Array([104, 101, 108, 108, 111]),
			writeFile: () => {},
			delete: () => {},
			rename: () => {},
		};
		const registration = vscode.workspace.registerFileSystemProvider(scheme, provider, { isReadonly: true });

		try {
			const readonlyUri = vscode.Uri.parse(`${scheme}:/original.txt`);
			const writableUri = vscode.Uri.file(testFilePath);
			await vscode.commands.executeCommand('vscode.diff', readonlyUri, writableUri, 'Test Diff');

			const activeUri = getActiveUri();
			assert.ok(activeUri !== undefined);
			assert.strictEqual(activeUri.fsPath.toLowerCase(), testFilePath.toLowerCase());
		} finally {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			registration.dispose();
			emitter.dispose();
		}
	});

	test('should get virtual file stats and handle zero timestamps gracefully', async () => {
		const scheme = 'statbar-vfs';
		const entries = new Map<string, vscode.FileStat>([
			[
				'/file.txt',
				{
					type: vscode.FileType.File,
					ctime: 1_700_000_000_000,
					mtime: 1_700_000_100_000,
					size: 128,
				},
			],
			[
				'/readonly.txt',
				{
					type: vscode.FileType.File,
					ctime: 0,
					mtime: 0,
					size: 64,
					permissions: vscode.FilePermission.Readonly,
				},
			],
			[
				'/dir',
				{
					type: vscode.FileType.Directory,
					ctime: 1_700_000_000_000,
					mtime: 1_700_000_100_000,
					size: 0,
				},
			],
			[
				'/ro-dir',
				{
					type: vscode.FileType.Directory,
					ctime: 0,
					mtime: 0,
					size: 0,
					permissions: vscode.FilePermission.Readonly,
				},
			],
			[
				'/symlink',
				{
					type: vscode.FileType.SymbolicLink | vscode.FileType.File,
					ctime: 0,
					mtime: 0,
					size: 12,
				},
			],
		]);

		const emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
		const provider: vscode.FileSystemProvider = {
			onDidChangeFile: emitter.event,
			watch: () => new vscode.Disposable(() => {}),
			stat: (uri) => {
				const entry = entries.get(uri.path);
				if (!entry) {
					throw vscode.FileSystemError.FileNotFound(uri);
				}
				return entry;
			},
			readDirectory: () => [],
			createDirectory: () => {},
			readFile: () => new Uint8Array(),
			writeFile: () => {},
			delete: () => {},
			rename: () => {},
		};

		const registration = vscode.workspace.registerFileSystemProvider(scheme, provider);
		try {
			const fileStat = await getStat(vscode.Uri.parse(`${scheme}:/file.txt`));
			assert.ok(fileStat !== undefined);
			assert.strictEqual(fileStat.filePath, '/file.txt');
			assert.strictEqual(fileStat.mode, 0o100644);
			assert.strictEqual(fileStat.size, 128);
			assert.strictEqual(fileStat.birthtime?.getTime(), 1_700_000_000_000);
			assert.strictEqual(fileStat.mtime?.getTime(), 1_700_000_100_000);

			const roStat = await getStat(vscode.Uri.parse(`${scheme}:/readonly.txt`));
			assert.ok(roStat !== undefined);
			assert.strictEqual(roStat.mode, 0o100444);
			assert.strictEqual(roStat.size, 64);
			assert.strictEqual(roStat.birthtime, undefined);
			assert.strictEqual(roStat.mtime, undefined);

			const dirStat = await getStat(vscode.Uri.parse(`${scheme}:/dir`));
			assert.ok(dirStat !== undefined);
			assert.strictEqual(dirStat.mode, 0o040755);

			const roDirStat = await getStat(vscode.Uri.parse(`${scheme}:/ro-dir`));
			assert.ok(roDirStat !== undefined);
			assert.strictEqual(roDirStat.mode, 0o040555);

			const linkStat = await getStat(vscode.Uri.parse(`${scheme}:/symlink`));
			assert.ok(linkStat !== undefined);
			assert.strictEqual(linkStat.mode, 0o120777);
		} finally {
			registration.dispose();
			emitter.dispose();
		}
	});

	test('should get stats for a symbolic link if supported', async () => {
		let hasSymlink = false;
		try {
			await fs.lstat(symlinkPath);
			hasSymlink = true;
		} catch {
			hasSymlink = false;
		}

		if (!hasSymlink) {
			return;
		}

		const stat = await getStat(symlinkPath);
		assert.ok(stat !== undefined);
		assert.strictEqual(stat.filePath, vscode.Uri.file(symlinkPath).fsPath);
		assert.strictEqual(stat.symlinkTarget, testFilePath);
		assert.strictEqual(typeof stat.mode, 'number');
		assert.strictEqual((stat.mode ?? 0) & 0o170000, 0o120000);
	});

	test('should return undefined for non-existent file', async () => {
		const stat = await getStat(path.join(tempDir, 'does-not-exist.txt'));
		assert.strictEqual(stat, undefined);
	});
});
