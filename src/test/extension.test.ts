import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { StatBar } from '../statBar.js';

const POLL_INTERVAL_MS = 15;
const POLL_TIMEOUT_MS = 2000;
const NEGATIVE_SETTLE_DELAY_MS = 50;

suite('Extension Test Suite', () => {
	let tempDir: string;
	let statBar: StatBar;

	suiteSetup(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-statbar-ext-'));

		const ext = vscode.extensions.getExtension<StatBar>('dsyx.file-statbar');
		assert.ok(ext !== undefined);
		statBar = await ext.activate();
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		await waitFor(() => statBar.text === '' && statBar.tooltip === undefined, 'status bar cleared on teardown');
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
			await delay(NEGATIVE_SETTLE_DELAY_MS);
		});
	});

	test('should handle opening, editing, saving, untitled, and diff tabs cleanly', async () => {
		const fileA = path.join(tempDir, 'a.txt');
		const fileB = path.join(tempDir, 'b.txt');
		await fs.writeFile(fileA, 'alpha', 'utf8');
		await fs.writeFile(fileB, 'beta', 'utf8');

		try {
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fileA));
			const editor = await vscode.window.showTextDocument(doc);
			await waitFor(
				() => statBar.text.includes('| 5 B |') && statBar.tooltip instanceof vscode.MarkdownString,
				'status bar updated for a.txt (5 B)',
			);

			// Saving a non-active document must not overwrite the active document's status bar state.
			const docB = await vscode.workspace.openTextDocument(vscode.Uri.file(fileB));
			const bgEdit = new vscode.WorkspaceEdit();
			bgEdit.insert(docB.uri, new vscode.Position(0, 0), 'bg ');
			await vscode.workspace.applyEdit(bgEdit);
			await docB.save();
			await delay(NEGATIVE_SETTLE_DELAY_MS);
			assert.ok(statBar.text.includes('| 5 B |'));

			await editor.edit((editBuilder) => {
				editBuilder.insert(new vscode.Position(0, 0), 'updated ');
			});
			await doc.save();
			await waitFor(() => statBar.text.includes('| 13 B |'), 'status bar updated after saving a.txt (13 B)');

			const untitledDoc = await vscode.workspace.openTextDocument({ content: 'untitled' });
			await vscode.window.showTextDocument(untitledDoc);
			await waitFor(() => statBar.text === '' && statBar.tooltip === undefined, 'status bar cleared for untitled doc');

			await vscode.window.showTextDocument(doc);
			await waitFor(() => statBar.text.includes('| 13 B |'), 'status bar restored for a.txt before diff');

			await vscode.commands.executeCommand(
				'vscode.diff',
				vscode.Uri.file(fileA),
				vscode.Uri.file(fileB),
				'a.txt ↔ b.txt',
			);
			await waitFor(() => statBar.text === '' && statBar.tooltip === undefined, 'status bar cleared for diff tab');

			await vscode.window.showTextDocument(doc);
			await waitFor(() => statBar.text.includes('| 13 B |'), 'status bar restored for a.txt before closing editors');

			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			await waitFor(
				() => statBar.text === '' && statBar.tooltip === undefined,
				'status bar cleared after closing all editors',
			);
		} finally {
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			await waitFor(() => statBar.text === '' && statBar.tooltip === undefined, 'status bar cleared in test cleanup');
		}
	});

	test('should handle configuration updates', async () => {
		const configFile = path.join(tempDir, 'config.txt');
		await fs.writeFile(configFile, 'config', 'utf8');

		const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(configFile));
		await vscode.window.showTextDocument(doc);
		await waitFor(() => statBar.text.includes('| 6 B |'), 'status bar updated for config.txt (6 B)');

		const config = vscode.workspace.getConfiguration('file-statbar');
		const prevTemplate = config.inspect<string>('template')?.globalValue;
		const prevPosition = config.inspect<string>('position')?.globalValue;
		const prevPriority = config.inspect<number>('priority')?.globalValue;

		try {
			await config.update('template', '{mode:o} {size:bytes}', vscode.ConfigurationTarget.Global);
			await config.update('position', 'left', vscode.ConfigurationTarget.Global);
			await config.update('priority', 0, vscode.ConfigurationTarget.Global);
			await waitFor(() => /^[0-7]{6} 6 B$/.test(statBar.text), 'status bar updated for custom template');

			await config.update('template', undefined, vscode.ConfigurationTarget.Global);
			await config.update('position', undefined, vscode.ConfigurationTarget.Global);
			await config.update('priority', undefined, vscode.ConfigurationTarget.Global);
			await waitFor(
				() => statBar.text.startsWith('[ ') && statBar.text.includes('| 6 B |') && statBar.text.endsWith(' (M) ]'),
				'status bar restored to default template when config is unset',
			);
		} finally {
			await config.update('template', prevTemplate, vscode.ConfigurationTarget.Global);
			await config.update('position', prevPosition, vscode.ConfigurationTarget.Global);
			await config.update('priority', prevPriority, vscode.ConfigurationTarget.Global);
			await vscode.commands.executeCommand('workbench.action.closeAllEditors');
			await waitFor(() => statBar.text === '' && statBar.tooltip === undefined, 'status bar cleared after config test');
		}
	});
});

async function waitFor(predicate: () => boolean, description: string): Promise<void> {
	const deadline = Date.now() + POLL_TIMEOUT_MS;
	while (!predicate()) {
		if (Date.now() >= deadline) {
			assert.fail(`Timed out waiting for: ${description}`);
		}
		await delay(POLL_INTERVAL_MS);
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
