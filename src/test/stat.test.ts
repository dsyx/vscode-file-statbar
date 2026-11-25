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
	let symlinkSupported = false;

	suiteSetup(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-statbar-test-'));
		testFilePath = path.join(tempDir, 'sample.txt');
		await fs.writeFile(testFilePath, 'Hello, File StatBar!', 'utf8');

		symlinkPath = path.join(tempDir, 'sample-link.txt');
		try {
			await fs.symlink(testFilePath, symlinkPath);
			symlinkSupported = true;
		} catch {
			// Symlinks might not be supported without admin on Windows; the symlink test is skipped in that case.
		}
	});

	suiteTeardown(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	test('should get accurate stats for a regular file (file Uri)', async () => {
		const res = await stat(vscode.Uri.file(testFilePath));
		assert.ok(res !== undefined);
		assert.strictEqual(res.filePath, vscode.Uri.file(testFilePath).fsPath);
		assert.strictEqual(res.size, 20n);
		assert.strictEqual(typeof res.mode, 'bigint');
		assert.strictEqual((res.mode ?? 0n) & 0o170000n, 0o100000n);
		assert.strictEqual(typeof res.ino, 'bigint');
		assert.strictEqual(typeof res.dev, 'bigint');
		assert.strictEqual(typeof res.atimeNs, 'bigint');
		assert.strictEqual(typeof res.mtimeNs, 'bigint');
		assert.strictEqual(typeof res.ctimeNs, 'bigint');
		assert.ok((res.mtimeNs ?? 0n) > 0n);
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
			[
				'/unknown',
				{
					type: vscode.FileType.Unknown,
					ctime: 0,
					mtime: 0,
					size: 0,
				},
			],
			[
				'/fractional',
				{
					type: vscode.FileType.File,
					ctime: 1_700_000_000_000.75,
					mtime: 1_700_000_100_000.25,
					size: 32,
				},
			],
		]);

		const logger = vscode.window.createOutputChannel('StatBar Test', { log: true });
		const registration = registerVirtualFs(scheme, entries);
		try {
			const fileStat = await stat(vscode.Uri.parse(`${scheme}:/file.txt`));
			assert.ok(fileStat !== undefined);
			assert.strictEqual(fileStat.filePath, '/file.txt');
			assert.strictEqual(fileStat.mode, 0o100600n);
			assert.strictEqual(fileStat.size, 128n);
			assert.strictEqual(fileStat.btimeNs, 1_700_000_000_000_000_000n);
			assert.strictEqual(fileStat.mtimeNs, 1_700_000_100_000_000_000n);

			const roStat = await stat(vscode.Uri.parse(`${scheme}:/readonly.txt`));
			assert.ok(roStat !== undefined);
			assert.strictEqual(roStat.mode, 0o100400n);
			assert.strictEqual(roStat.size, 64n);
			assert.strictEqual(roStat.btimeNs, undefined);
			assert.strictEqual(roStat.mtimeNs, undefined);

			const dirStat = await stat(vscode.Uri.parse(`${scheme}:/dir`));
			assert.ok(dirStat !== undefined);
			assert.strictEqual(dirStat.mode, 0o040700n);

			const roDirStat = await stat(vscode.Uri.parse(`${scheme}:/ro-dir`));
			assert.ok(roDirStat !== undefined);
			assert.strictEqual(roDirStat.mode, 0o040500n);

			const linkStat = await stat(vscode.Uri.parse(`${scheme}:/symlink`));
			assert.ok(linkStat !== undefined);
			assert.strictEqual(linkStat.mode, 0o120700n);

			const unknownStat = await stat(vscode.Uri.parse(`${scheme}:/unknown`));
			assert.ok(unknownStat !== undefined);
			assert.strictEqual(unknownStat.mode, undefined);

			const fractionalStat = await stat(vscode.Uri.parse(`${scheme}:/fractional`));
			assert.ok(fractionalStat !== undefined);
			assert.strictEqual(fractionalStat.btimeNs, 1_700_000_000_000_000_000n);
			assert.strictEqual(fractionalStat.mtimeNs, 1_700_000_100_000_000_000n);
			assert.strictEqual(fractionalStat.size, 32n);

			const missingStat = await stat(vscode.Uri.parse(`${scheme}:/missing.txt`), logger);
			assert.strictEqual(missingStat, undefined);
		} finally {
			registration.dispose();
			logger.dispose();
		}
	});

	test('should synthesize readonly mode for readonly virtual filesystem providers', async () => {
		const scheme = 'statbar-ro-vfs';
		const entries = new Map<string, vscode.FileStat>([
			['/file.txt', { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 10 }],
			['/dir', { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 }],
		]);

		const registration = registerVirtualFs(scheme, entries, { isReadonly: true });
		try {
			const fileStat = await stat(vscode.Uri.parse(`${scheme}:/file.txt`));
			assert.strictEqual(fileStat?.mode, 0o100400n);

			const dirStat = await stat(vscode.Uri.parse(`${scheme}:/dir`));
			assert.strictEqual(dirStat?.mode, 0o040500n);
		} finally {
			registration.dispose();
		}
	});

	test('should get stats for a symbolic link if supported', async function () {
		if (!symlinkSupported) {
			this.skip();
		}

		const res = await stat(vscode.Uri.file(symlinkPath));
		assert.ok(res !== undefined);
		assert.strictEqual(res.filePath, vscode.Uri.file(symlinkPath).fsPath);
		assert.strictEqual(res.symlinkTarget, testFilePath);
		assert.strictEqual(typeof res.mode, 'bigint');
		assert.strictEqual((res.mode ?? 0n) & 0o170000n, 0o120000n);
	});

	test('should return undefined for non-existent file', async () => {
		const logger = vscode.window.createOutputChannel('StatBar Test Missing', { log: true });
		try {
			const res = await stat(vscode.Uri.file(path.join(tempDir, 'does-not-exist.txt')), logger);
			assert.strictEqual(res, undefined);
		} finally {
			logger.dispose();
		}
	});
});

function registerVirtualFs(
	scheme: string,
	entries: ReadonlyMap<string, vscode.FileStat>,
	options?: { readonly isReadonly?: boolean },
): vscode.Disposable {
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

	const registration = vscode.workspace.registerFileSystemProvider(scheme, provider, options);
	return vscode.Disposable.from(registration, emitter);
}
