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

const DEFAULT_TEMPLATE = '[ {mode} | {size:iec} | {mtime} (M) ]';
const DEFAULT_POSITION: Position = 'right';
const DEFAULT_PRIORITY = 1024;

export function deactivate(): void {}

export function loadConfig(): Config {
	const wsConfig = vscode.workspace.getConfiguration('file-statbar');
	const rawTemplate = wsConfig.get<unknown>('template', DEFAULT_TEMPLATE);
	const rawPosition = wsConfig.get<unknown>('position', DEFAULT_POSITION);
	const rawPriority = wsConfig.get<unknown>('priority', DEFAULT_PRIORITY);

	const template = typeof rawTemplate === 'string' && rawTemplate.length > 0 ? rawTemplate : DEFAULT_TEMPLATE;
	const position: Position = rawPosition === 'left' || rawPosition === 'right' ? rawPosition : DEFAULT_POSITION;
	const priority = typeof rawPriority === 'number' && Number.isFinite(rawPriority) ? rawPriority : DEFAULT_PRIORITY;

	return {
		template,
		position,
		priority,
	};
}
