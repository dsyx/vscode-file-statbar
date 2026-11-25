import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	let tempDir: string;
	let fileA: string;
	let fileB: string;

	suiteSetup(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-statbar-ext-'));
		fileA = path.join(tempDir, 'a.txt');
		fileB = path.join(tempDir, 'b.txt');
		await fs.writeFile(fileA, 'alpha', 'utf8');
		await fs.writeFile(fileB, 'beta', 'utf8');
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
	});

	test('should register and execute file-statbar.refresh command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(
			commands.includes('file-statbar.refresh'),
			'file-statbar.refresh command should be registered in VS Code',
		);
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('file-statbar.refresh');
		});
	});

	test('should handle opening, editing, saving, untitled, and diff tabs cleanly', async () => {
		const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fileA));
		const editor = await vscode.window.showTextDocument(doc);
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(0, 0), 'updated ');
		});
		await doc.save();
		await vscode.commands.executeCommand('file-statbar.refresh');

		const untitledDoc = await vscode.workspace.openTextDocument({ content: 'untitled' });
		await vscode.window.showTextDocument(untitledDoc);
		await vscode.commands.executeCommand('file-statbar.refresh');

		await vscode.commands.executeCommand(
			'vscode.diff',
			vscode.Uri.file(fileA),
			vscode.Uri.file(fileB),
			'a.txt ↔ b.txt',
		);
		await vscode.commands.executeCommand('file-statbar.refresh');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('should handle configuration updates including invalid runtime values', async () => {
		const config = vscode.workspace.getConfiguration('file-statbar');
		const prevTemplate = config.inspect<string>('template')?.globalValue;
		const prevPosition = config.inspect<string>('position')?.globalValue;
		const prevPriority = config.inspect<number>('priority')?.globalValue;

		try {
			await config.update('template', '{mode:o} {size:bytes}', vscode.ConfigurationTarget.Global);
			await config.update('position', 'left', vscode.ConfigurationTarget.Global);
			await config.update('priority', 0, vscode.ConfigurationTarget.Global);
			await config.update('position', 'invalid-position', vscode.ConfigurationTarget.Global);
			await config.update('priority', 'not-a-number', vscode.ConfigurationTarget.Global);
			await vscode.commands.executeCommand('file-statbar.refresh');
		} finally {
			await config.update('template', prevTemplate, vscode.ConfigurationTarget.Global);
			await config.update('position', prevPosition, vscode.ConfigurationTarget.Global);
			await config.update('priority', prevPriority, vscode.ConfigurationTarget.Global);
		}
	});
});
