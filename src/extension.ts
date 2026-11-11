import * as vscode from 'vscode';
import { stat } from './stat.js';
import { StatBar } from './statBar.js';
import {
	COMMAND_REFRESH,
	type Config,
	DEFAULT_CONFIG,
	EXTENSION_DISPLAY_NAME,
	EXTENSION_NAME,
	type Position,
} from './types.js';

const DEBOUNCE_DELAY_MS = 10;

export function activate(context: vscode.ExtensionContext): void {
	const logger = vscode.window.createOutputChannel(EXTENSION_DISPLAY_NAME, { log: true });
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
		if (e.affectsConfiguration(EXTENSION_NAME)) {
			statBar.updateConfig(loadConfig());
		}
	};

	context.subscriptions.push(
		logger,
		statBar,
		debounceTimerDisposable,
		vscode.commands.registerCommand(COMMAND_REFRESH, refresh),
		vscode.workspace.onDidChangeConfiguration(updateConfigIfAffected),
		vscode.workspace.onDidSaveTextDocument(refreshIfActiveDocument),
		vscode.workspace.onDidSaveNotebookDocument(refreshIfActiveDocument),
		vscode.window.tabGroups.onDidChangeTabs(refresh),
		vscode.window.tabGroups.onDidChangeTabGroups(refresh),
		vscode.window.onDidChangeActiveTextEditor(refresh),
		vscode.window.onDidChangeWindowState(refreshIfWindowFocused),
	);

	refresh();
}

export function deactivate(): void {}

function getActiveFileResourceUri(): vscode.Uri | undefined {
	let uri: vscode.Uri | undefined;
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;

	if (
		input instanceof vscode.TabInputText ||
		input instanceof vscode.TabInputCustom ||
		input instanceof vscode.TabInputNotebook
	) {
		uri = input.uri;
	} else if (input instanceof vscode.TabInputTextDiff || input instanceof vscode.TabInputNotebookDiff) {
		uri = vscode.window.activeTextEditor?.document.uri;
	}

	// `undefined` means no file system provider is registered for the scheme, so the resource cannot be stat'ed.
	return uri && vscode.workspace.fs.isWritableFileSystem(uri.scheme) !== undefined ? uri : undefined;
}

function loadConfig(): Config {
	const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
	return {
		template: config.get<string>('template', DEFAULT_CONFIG.template),
		position: config.get<Position>('position', DEFAULT_CONFIG.position),
		priority: config.get<number>('priority', DEFAULT_CONFIG.priority),
	};
}
