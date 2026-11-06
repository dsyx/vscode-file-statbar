import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { loadConfig } from '../extension.js';

suite('Extension Test Suite', () => {
	test('should register file-statbar.refresh command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(
			commands.includes('file-statbar.refresh'),
			'file-statbar.refresh command should be registered in VS Code',
		);
	});

	test('should load validated default configuration', () => {
		const config = loadConfig();
		assert.strictEqual(typeof config.template, 'string');
		assert.ok(config.template.length > 0);
		assert.ok(config.position === 'left' || config.position === 'right');
		assert.ok(Number.isFinite(config.priority));
	});
});
