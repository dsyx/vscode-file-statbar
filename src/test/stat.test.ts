import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { stat } from '../stat.js';

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

	suiteTeardown(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	test('should get accurate stats for a regular file (file Uri)', async () => {
		const res = await stat(vscode.Uri.file(testFilePath));
		assert.ok(res !== undefined);
		assert.strictEqual(res.filePath, vscode.Uri.file(testFilePath).fsPath);
		assert.strictEqual(res.size, 20);
		assert.ok(typeof res.mode === 'number');
		assert.strictEqual(res.mode & 0o170000, 0o100000);
		assert.ok(res.atime instanceof Date);
		assert.ok(res.mtime instanceof Date);
		assert.ok(res.ctime instanceof Date);
		assert.ok(typeof res.ino === 'bigint');
		assert.ok(typeof res.dev === 'bigint');
		assert.ok(typeof res.mtimeNs === 'bigint');
		assert.ok(res.mtimeNs > 0n);
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
			const fileStat = await stat(vscode.Uri.parse(`${scheme}:/file.txt`));
			assert.ok(fileStat !== undefined);
			assert.strictEqual(fileStat.filePath, '/file.txt');
			assert.strictEqual(fileStat.mode, 0o100600);
			assert.strictEqual(fileStat.size, 128);
			assert.strictEqual(fileStat.birthtime?.getTime(), 1_700_000_000_000);
			assert.strictEqual(fileStat.mtime?.getTime(), 1_700_000_100_000);

			const roStat = await stat(vscode.Uri.parse(`${scheme}:/readonly.txt`));
			assert.ok(roStat !== undefined);
			assert.strictEqual(roStat.mode, 0o100400);
			assert.strictEqual(roStat.size, 64);
			assert.strictEqual(roStat.birthtime, undefined);
			assert.strictEqual(roStat.mtime, undefined);

			const dirStat = await stat(vscode.Uri.parse(`${scheme}:/dir`));
			assert.ok(dirStat !== undefined);
			assert.strictEqual(dirStat.mode, 0o040700);

			const roDirStat = await stat(vscode.Uri.parse(`${scheme}:/ro-dir`));
			assert.ok(roDirStat !== undefined);
			assert.strictEqual(roDirStat.mode, 0o040500);

			const linkStat = await stat(vscode.Uri.parse(`${scheme}:/symlink`));
			assert.ok(linkStat !== undefined);
			assert.strictEqual(linkStat.mode, 0o120700);
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

		const res = await stat(vscode.Uri.file(symlinkPath));
		assert.ok(res !== undefined);
		assert.strictEqual(res.filePath, vscode.Uri.file(symlinkPath).fsPath);
		assert.strictEqual(res.symlinkTarget, testFilePath);
		assert.strictEqual(typeof res.mode, 'number');
		assert.strictEqual((res.mode ?? 0) & 0o170000, 0o120000);
	});

	test('should return undefined for non-existent file', async () => {
		const res = await stat(vscode.Uri.file(path.join(tempDir, 'does-not-exist.txt')));
		assert.strictEqual(res, undefined);
	});
});
