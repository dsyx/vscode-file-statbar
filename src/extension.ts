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

export function activate(context: vscode.ExtensionContext): void {
	const logger = vscode.window.createOutputChannel(EXTENSION.displayName, { log: true });
	const statBar = new StatBar(loadConfig());
	let latestGeneration = 0;
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const refresh = (): void => {
		const generation = ++latestGeneration;
		clearTimeout(debounceTimer);

		debounceTimer = setTimeout(async () => {
			try {
				const uri = getActiveFileResourceUri();
				const stats = uri ? await stat(uri, logger) : undefined;
				if (generation === latestGeneration) {
					statBar.update(stats);
				}
			} catch (err) {
				logger.error(err instanceof Error ? err : String(err));
				if (generation === latestGeneration) {
					statBar.update(undefined);
				}
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
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	let uri: vscode.Uri | undefined;

	if (
		input instanceof vscode.TabInputText ||
		input instanceof vscode.TabInputCustom ||
		input instanceof vscode.TabInputNotebook
	) {
		uri = input.uri;
	}

	// `undefined` means no file system provider is registered for the scheme, so the resource cannot be stat'ed.
	return uri && vscode.workspace.fs.isWritableFileSystem(uri.scheme) !== undefined ? uri : undefined;
}

function loadConfig(): Config {
	const config = vscode.workspace.getConfiguration(EXTENSION.name);
	const template = config.get<unknown>('template');
	const position = config.get<unknown>('position');
	const priority = config.get<unknown>('priority');

	return {
		template: typeof template === 'string' ? template : DEFAULT_CONFIG.template,
		position: position === 'left' || position === 'right' ? position : DEFAULT_CONFIG.position,
		priority: typeof priority === 'number' && Number.isFinite(priority) ? priority : DEFAULT_CONFIG.priority,
	};
}
