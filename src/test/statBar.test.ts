import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { StatBar } from '../statBar.js';
import type { Config } from '../types.js';

suite('StatBar tests', () => {
	const defaultConfig: Config = {
		template: '[ {mode} | {size:bytes} ]',
		position: 'right',
		priority: 1024,
	};

	let tempDir: string;
	let testFilePath: string;
	let statBar: StatBar;

	suiteSetup(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'statbar-ui-test-'));
		testFilePath = path.join(tempDir, 'sample.txt');
		await fs.writeFile(testFilePath, 'Hello, File StatBar!', 'utf8');
	});

	suiteTeardown(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	setup(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		statBar = new StatBar(defaultConfig);
	});

	teardown(async () => {
		statBar.dispose();
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('should keep text empty when no editor is active', async () => {
		await statBar.update();
		assert.strictEqual(statBar.text, '');
	});

	test('should format and display stats for the active editor on update', async () => {
		const doc = await vscode.workspace.openTextDocument(testFilePath);
		await vscode.window.showTextDocument(doc);

		await statBar.update();
		assert.match(statBar.text, /^\[ -[r-][w-][x-][r-][w-][x-][r-][w-][x-] \| 20 B \]$/);
	});

	test('should update text when configuration changes', async () => {
		const doc = await vscode.workspace.openTextDocument(testFilePath);
		await vscode.window.showTextDocument(doc);

		statBar.updateConfig({
			template: '{size:iec}',
			position: 'left',
			priority: 500,
		});
		await statBar.update();
		assert.strictEqual(statBar.text, '20 B');
	});

	test('should substitute template placeholders and preserve unknown fields/modifiers', async () => {
		const doc = await vscode.workspace.openTextDocument(testFilePath);
		await vscode.window.showTextDocument(doc);

		statBar.updateConfig({
			template: '{size} | {size:1000} | {size:1024} | {mtime:%Y} | {unknown} | {mode:invalid} | {size:invalid}',
			position: 'right',
			priority: 1024,
		});
		await statBar.update();
		assert.match(
			statBar.text,
			/^20 B \| 20 B \| 20 B \| \d{4} \| \{unknown\} \| \{mode:invalid\} \| \{size:invalid\}$/,
		);
	});

	test('should execute debounced update via scheduleUpdate', async () => {
		const doc = await vscode.workspace.openTextDocument(testFilePath);
		await vscode.window.showTextDocument(doc);

		statBar.updateConfig({
			template: 'size={size:bytes}',
			position: 'right',
			priority: 1024,
		});

		await new Promise((resolve) => setTimeout(resolve, 100));
		assert.strictEqual(statBar.text, 'size=20 B');
	});
});
