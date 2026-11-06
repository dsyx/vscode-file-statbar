import * as vscode from 'vscode';
import { StatBar } from './statBar.js';
import type { Config, Position } from './types.js';

export function activate(context: vscode.ExtensionContext): void {
	const logChannel = vscode.window.createOutputChannel('File StatBar', { log: true });
	const statBar = new StatBar(loadConfig(), logChannel);

	const refreshCommand = vscode.commands.registerCommand('file-statbar.refresh', () => {
		statBar.update().catch((err) => {
			logChannel.error(`Manual refresh failed: ${String(err)}`);
		});
	});

	const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('file-statbar')) {
			statBar.updateConfig(loadConfig());
		}
	});

	const activeDocChange = vscode.workspace.onDidSaveTextDocument(() => {
		statBar.scheduleUpdate();
	});

	const activeEditorChange = vscode.window.onDidChangeActiveTextEditor(() => {
		statBar.scheduleUpdate();
	});

	const activeTabChange = vscode.window.tabGroups.onDidChangeTabs(() => {
		statBar.scheduleUpdate();
	});

	const activeTabGroupChange = vscode.window.tabGroups.onDidChangeTabGroups(() => {
		statBar.scheduleUpdate();
	});

	const windowStateChange = vscode.window.onDidChangeWindowState((state) => {
		if (state.focused) {
			statBar.scheduleUpdate();
		}
	});

	context.subscriptions.push(
		logChannel,
		statBar,
		refreshCommand,
		configChange,
		activeDocChange,
		activeEditorChange,
		activeTabChange,
		activeTabGroupChange,
		windowStateChange,
	);

	statBar.scheduleUpdate();
}

export function deactivate(): void {}

function loadConfig(): Config {
	const wsConfig = vscode.workspace.getConfiguration('file-statbar');
	return {
		template: wsConfig.get<string>('template', '[ {mode} | {size:iec} | {mtime} (M) ]'),
		position: wsConfig.get<Position>('position', 'right'),
		priority: wsConfig.get<number>('priority', 1024),
	};
}
