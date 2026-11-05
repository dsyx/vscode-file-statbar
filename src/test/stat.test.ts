import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import * as vscode from 'vscode';
import { formatDeviceNumber } from '../formatter.js';
import { getActiveFileUri, getFileStat } from '../stat.js';

describe('stat tests', () => {
	let tempDir: string;
	let testFilePath: string;
	let symlinkPath: string;

	before(async () => {
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

	after(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('should get accurate stats for a regular file (path string)', async () => {
		const stat = await getFileStat(testFilePath);
		assert.ok(stat !== undefined);
		assert.strictEqual(stat.fileName, 'sample.txt');
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

	it('should get accurate stats for a file Uri (vscode.Uri with file scheme)', async () => {
		const fileUri = vscode.Uri.file(testFilePath);
		const stat = await getFileStat(fileUri);
		assert.ok(stat !== undefined);
		assert.strictEqual(stat.fileName, 'sample.txt');
		assert.strictEqual(stat.size, 20);
		assert.ok(typeof stat.mode === 'number');
		assert.strictEqual(stat.mode & 0o170000, 0o100000);
	});

	it('should extract the modified side of diff tabs and the uri of custom and notebook tabs', () => {
		const original = vscode.Uri.parse('vscode-test:/workspace/a.ts');
		const modified = vscode.Uri.file(testFilePath);

		const textDiff = new vscode.TabInputTextDiff(original, modified);
		assert.strictEqual(textDiff.modified.toString(), modified.toString());

		const custom = new vscode.TabInputCustom(modified, 'hexEditor.hexedit');
		assert.strictEqual(custom.uri.toString(), modified.toString());

		const notebook = new vscode.TabInputNotebook(original, 'jupyter-notebook');
		assert.strictEqual(notebook.uri.toString(), original.toString());
	});

	it('should extract active file Uri or return undefined when none active', () => {
		const uri = getActiveFileUri();
		assert.ok(uri === undefined || uri instanceof vscode.Uri);
	});

	it('should get stats for a symbolic link if supported', async () => {
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

		const stat = await getFileStat(symlinkPath);
		assert.ok(stat !== undefined);
		assert.strictEqual(stat.fileName, 'sample-link.txt');
		assert.strictEqual(stat.symlinkTarget, testFilePath);
		assert.strictEqual(typeof stat.mode, 'number');
		assert.strictEqual((stat.mode ?? 0) & 0o170000, 0o120000);
	});

	it('should return undefined for non-existent file', async () => {
		const stat = await getFileStat(path.join(tempDir, 'does-not-exist.txt'));
		assert.strictEqual(stat, undefined);
	});

	it('should format device numbers correctly across platforms', () => {
		assert.strictEqual(formatDeviceNumber(undefined), '-');

		if (process.platform === 'linux') {
			assert.strictEqual(formatDeviceNumber(2049n), '8,1');
		}
		if (process.platform === 'darwin') {
			assert.strictEqual(formatDeviceNumber(0x01000004n), '1,4');
		}
	});
});
