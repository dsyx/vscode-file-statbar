import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	test('should register file-statbar.refresh command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(
			commands.includes('file-statbar.refresh'),
			'file-statbar.refresh command should be registered in VS Code',
		);
	});
});
