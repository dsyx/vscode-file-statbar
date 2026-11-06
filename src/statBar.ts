import * as vscode from 'vscode';
import { formatStatusBarText } from './formatter.js';
import { getActiveFileUri, getFileStat } from './stat.js';
import type { Config } from './types.js';

export class StatBar implements vscode.Disposable {
	private static readonly DEBOUNCE_DELAY_MS = 50;

	private statusBarItem: vscode.StatusBarItem;
	private debounceTimer?: NodeJS.Timeout;
	private readonly logChannel?: vscode.LogOutputChannel;
	private config: Config;
	private isDisposed = false;
	private updateGeneration = 0;

	constructor(config: Config, logChannel?: vscode.LogOutputChannel) {
		this.config = config;
		this.logChannel = logChannel;
		this.statusBarItem = this.createStatusBarItem();
	}

	public dispose(): void {
		this.isDisposed = true;
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}
		this.statusBarItem.dispose();
	}

	public scheduleUpdate(): void {
		if (this.isDisposed) {
			return;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.update().catch((err) => {
				this.logChannel?.error(`Update failed: ${String(err)}`);
			});
		}, StatBar.DEBOUNCE_DELAY_MS);
	}

	public updateConfig(newConfig: Config): void {
		const recreate = this.config.position !== newConfig.position || this.config.priority !== newConfig.priority;
		this.config = newConfig;

		if (recreate) {
			this.statusBarItem.dispose();
			this.statusBarItem = this.createStatusBarItem();
		}

		this.scheduleUpdate();
	}

	public async update(): Promise<void> {
		if (this.isDisposed) {
			return;
		}

		const generation = ++this.updateGeneration;
		const uri = getActiveFileUri();
		if (!uri) {
			this.statusBarItem.hide();
			return;
		}

		const stat = await getFileStat(uri, (msg) => this.logChannel?.warn(msg));
		if (this.isDisposed || generation !== this.updateGeneration) {
			return;
		}

		if (getActiveFileUri()?.toString() !== uri.toString()) {
			return;
		}

		if (!stat) {
			this.statusBarItem.hide();
			return;
		}

		this.statusBarItem.text = formatStatusBarText(stat, this.config.template);
		this.statusBarItem.show();
	}

	private createStatusBarItem(): vscode.StatusBarItem {
		const alignment =
			this.config.position === 'left' ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;

		// On left alignment, negate priority so larger values place the item closer to center.
		const actualPriority = this.config.position === 'right' ? this.config.priority : -this.config.priority;

		const item = vscode.window.createStatusBarItem('file-statbar.item', alignment, actualPriority);
		item.name = 'File StatBar';
		return item;
	}
}
