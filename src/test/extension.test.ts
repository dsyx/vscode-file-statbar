import assert from 'node:assert/strict';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
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
});
