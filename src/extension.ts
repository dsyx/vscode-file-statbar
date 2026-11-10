import * as vscode from 'vscode';
import { Inspector } from './inspector.js';
import { StatBar } from './statBar.js';
import type { Config, Position } from './types.js';

const DEFAULT_TEMPLATE = '[ {mode} | {size:iec} | {mtime} (M) ]';
const DEFAULT_POSITION: Position = 'right';
const DEFAULT_PRIORITY = 1024;
const DEBOUNCE_DELAY_MS = 10;

export function activate(context: vscode.ExtensionContext): void {
	const logger = vscode.window.createOutputChannel('File StatBar', { log: true });
	const inspector = new Inspector((msg) => logger.warn(msg));
	const statBar = new StatBar(loadConfig());
	let latestGeneration = 0;

	const debounceTimer = setTimeout(async () => {
		const generation = ++latestGeneration;
		const uri = getActiveFileResourceUri();
		const stat = uri ? await inspector.stat(uri) : undefined;
		if (generation !== latestGeneration) {
			return;
		}
		statBar.update(stat);
	}, DEBOUNCE_DELAY_MS);

	const debounceTimerDisposable = new vscode.Disposable(() => {
		latestGeneration++;
		clearTimeout(debounceTimer);
	});

	const refresh = (): void => {
		debounceTimer.refresh();
	};

	const refreshIfActiveDocument = ({ uri }: { uri: vscode.Uri }): void => {
		if (uri.toString() === getActiveFileResourceUri()?.toString()) {
			refresh();
		}
	};

	const refreshIfWindowFocused = ({ focused }: vscode.WindowState): void => {
		if (focused) {
			refresh();
		}
	};

	const updateConfigIfAffected = (e: vscode.ConfigurationChangeEvent): void => {
		if (e.affectsConfiguration('file-statbar')) {
			statBar.updateConfig(loadConfig());
		}
	};

	context.subscriptions.push(
		logger,
		statBar,
		debounceTimerDisposable,
		vscode.commands.registerCommand('file-statbar.refresh', refresh),
		vscode.workspace.onDidChangeConfiguration(updateConfigIfAffected),
		vscode.workspace.onDidSaveTextDocument(refreshIfActiveDocument),
		vscode.workspace.onDidSaveNotebookDocument(refreshIfActiveDocument),
		vscode.window.tabGroups.onDidChangeTabs(refresh),
		vscode.window.tabGroups.onDidChangeTabGroups(refresh),
		vscode.window.onDidChangeWindowState(refreshIfWindowFocused),
	);
}

export function deactivate(): void {}

function getActiveFileResourceUri(): vscode.Uri | undefined {
	let uri: vscode.Uri | undefined;
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;

	switch (true) {
		case input instanceof vscode.TabInputText:
		case input instanceof vscode.TabInputCustom:
		case input instanceof vscode.TabInputNotebook:
			uri = input.uri;
			break;
		case input instanceof vscode.TabInputTextDiff:
		case input instanceof vscode.TabInputNotebookDiff:
			uri = vscode.window.activeTextEditor?.document.uri;
			break;
	}

	return uri && vscode.workspace.fs.isWritableFileSystem(uri.scheme) !== undefined ? uri : undefined;
}

function loadConfig(): Config {
	const config = vscode.workspace.getConfiguration('file-statbar');
	return {
		template: config.get<string>('template', DEFAULT_TEMPLATE),
		position: config.get<Position>('position', DEFAULT_POSITION),
		priority: config.get<number>('priority', DEFAULT_PRIORITY),
	};
}
