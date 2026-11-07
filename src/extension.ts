import * as vscode from 'vscode';
import { getActiveUri } from './stat.js';
import { StatBar } from './statBar.js';
import type { Config, Position } from './types.js';

const DEFAULT_TEMPLATE = '[ {mode} | {size:iec} | {mtime} (M) ]';
const DEFAULT_POSITION: Position = 'right';
const DEFAULT_PRIORITY = 1024;

export function activate(context: vscode.ExtensionContext): void {
	const logChannel = vscode.window.createOutputChannel('File StatBar', { log: true });
	const statBar = new StatBar(loadConfig(), logChannel);

	context.subscriptions.push(
		logChannel,
		statBar,
		vscode.commands.registerCommand('file-statbar.refresh', () => {
			statBar.update().catch((err) => {
				logChannel.error(`Manual refresh failed: ${String(err)}`);
			});
		}),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('file-statbar')) {
				statBar.updateConfig(loadConfig());
			}
		}),
		vscode.workspace.onDidSaveTextDocument((doc) => {
			if (doc.uri.toString() === getActiveUri()?.toString()) {
				statBar.scheduleUpdate();
			}
		}),
		vscode.window.tabGroups.onDidChangeTabs(() => {
			statBar.scheduleUpdate();
		}),
		vscode.window.tabGroups.onDidChangeTabGroups(() => {
			statBar.scheduleUpdate();
		}),
		vscode.window.onDidChangeWindowState((state) => {
			if (state.focused) {
				statBar.scheduleUpdate();
			}
		}),
	);

	statBar.scheduleUpdate();
}

export function deactivate(): void {}

function loadConfig(): Config {
	const config = vscode.workspace.getConfiguration('file-statbar');
	return {
		template: config.get<string>('template', DEFAULT_TEMPLATE),
		position: config.get<Position>('position', DEFAULT_POSITION),
		priority: config.get<number>('priority', DEFAULT_PRIORITY),
	};
}
