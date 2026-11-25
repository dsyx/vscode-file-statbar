import * as vscode from 'vscode';
import { EXTENSION } from './constants.js';
import { stat } from './stat.js';
import { StatBar } from './statBar.js';
import type { Config } from './types.js';

const COMMAND_REFRESH = `${EXTENSION.name}.refresh`;
const DEFAULT_CONFIG: Config = {
	template: '[ {mode} | {size:iec} | {mtime} (M) ]',
	position: 'right',
	priority: 1024,
};
const DEBOUNCE_DELAY_MS = 10;

export function activate(context: vscode.ExtensionContext): StatBar {
	const logger = vscode.window.createOutputChannel(EXTENSION.displayName, { log: true });
	const statBar = new StatBar(loadConfig());
	let latestGeneration = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const refresh = (): void => {
		const generation = ++latestGeneration;
		clearTimeout(debounceTimer);

		debounceTimer = setTimeout(async () => {
			const uri = getActiveFileResourceUri();
			const stats = uri ? await stat(uri, logger) : undefined;
			if (generation === latestGeneration) {
				statBar.update(stats);
			}
		}, DEBOUNCE_DELAY_MS);
	};

	const debounceTimerDisposable = new vscode.Disposable(() => {
		latestGeneration++;
		clearTimeout(debounceTimer);
	});

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
		if (e.affectsConfiguration(EXTENSION.name)) {
			statBar.updateConfig(loadConfig());
		}
	};

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_REFRESH, refresh),
		vscode.workspace.onDidChangeConfiguration(updateConfigIfAffected),
		vscode.workspace.onDidSaveTextDocument(refreshIfActiveDocument),
		vscode.workspace.onDidSaveNotebookDocument(refreshIfActiveDocument),
		vscode.window.tabGroups.onDidChangeTabs(refresh),
		vscode.window.tabGroups.onDidChangeTabGroups(refresh),
		vscode.window.onDidChangeActiveTextEditor(refresh),
		vscode.window.onDidChangeWindowState(refreshIfWindowFocused),
		debounceTimerDisposable,
		statBar,
		logger,
	);

	refresh();
	return statBar;
}

export function deactivate(): void {}

function getActiveFileResourceUri(): vscode.Uri | undefined {
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	if (
		!(
			input instanceof vscode.TabInputText ||
			input instanceof vscode.TabInputCustom ||
			input instanceof vscode.TabInputNotebook
		)
	) {
		return undefined;
	}

	// `undefined` means no file system provider is registered for the scheme, so the resource cannot be stat'ed.
	return vscode.workspace.fs.isWritableFileSystem(input.uri.scheme) !== undefined ? input.uri : undefined;
}

function loadConfig(): Config {
	const config = vscode.workspace.getConfiguration(EXTENSION.name);
	return {
		template: config.get('template', DEFAULT_CONFIG.template),
		position: config.get('position', DEFAULT_CONFIG.position),
		priority: config.get('priority', DEFAULT_CONFIG.priority),
	};
}
