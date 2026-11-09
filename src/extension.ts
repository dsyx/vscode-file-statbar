import * as vscode from 'vscode';
import { getActiveUri, getStat } from './stat.js';
import { StatBar } from './statBar.js';
import type { Config, Position } from './types.js';

const DEFAULT_TEMPLATE = '[ {mode} | {size:iec} | {mtime} (M) ]';
const DEFAULT_POSITION: Position = 'right';
const DEFAULT_PRIORITY = 1024;
const UPDATE_DELAY_MS = 10;

export function activate(context: vscode.ExtensionContext): void {
	const log = vscode.window.createOutputChannel('File StatBar', { log: true });
	const statBar = new StatBar(loadConfig());
	let latestGeneration = 0;

	const updateTimer = setTimeout(async () => {
		const generation = ++latestGeneration;
		const uri = getActiveUri();
		const stat = uri ? await getStat(uri, (msg) => log.warn(msg)) : undefined;
		if (generation !== latestGeneration) {
			return;
		}
		statBar.update(stat);
	}, UPDATE_DELAY_MS);

	context.subscriptions.push(
		log,
		statBar,
		new vscode.Disposable(() => {
			latestGeneration++;
			clearTimeout(updateTimer);
		}),
		vscode.commands.registerCommand('file-statbar.refresh', () => {
			updateTimer.refresh();
		}),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('file-statbar')) {
				statBar.updateConfig(loadConfig());
			}
		}),
		vscode.workspace.onDidSaveTextDocument((doc) => {
			if (doc.uri.toString() === getActiveUri()?.toString()) {
				updateTimer.refresh();
			}
		}),
		vscode.workspace.onDidSaveNotebookDocument((notebook) => {
			if (notebook.uri.toString() === getActiveUri()?.toString()) {
				updateTimer.refresh();
			}
		}),
		vscode.window.tabGroups.onDidChangeTabs(() => {
			updateTimer.refresh();
		}),
		vscode.window.tabGroups.onDidChangeTabGroups(() => {
			updateTimer.refresh();
		}),
		vscode.window.onDidChangeWindowState((state) => {
			if (state.focused) {
				updateTimer.refresh();
			}
		}),
	);
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
