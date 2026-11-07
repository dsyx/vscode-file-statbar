import * as vscode from 'vscode';
import { formatFileSize, formatMode, formatStrftime } from './formatter.js';
import { getActiveUri, getStat } from './stat.js';
import type { Config, Stats } from './types.js';

const DEBOUNCE_DELAY_MS = 50;

export class StatBar implements vscode.Disposable {
	private statusBarItem: vscode.StatusBarItem;
	private debounceTimer?: NodeJS.Timeout;
	private readonly logChannel?: vscode.LogOutputChannel;
	private config: Config;
	private isDisposed = false;
	private updateGeneration = 0;

	constructor(config: Config, logChannel?: vscode.LogOutputChannel) {
		this.config = config;
		this.logChannel = logChannel;
		this.statusBarItem = createStatusBarItem(this.config);
	}

	public get text(): string {
		return this.statusBarItem.text;
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

		++this.updateGeneration;

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = undefined;
			this.update().catch((err) => {
				this.logChannel?.error(`Update failed: ${String(err)}`);
			});
		}, DEBOUNCE_DELAY_MS);
	}

	public updateConfig(newConfig: Config): void {
		const recreate = this.config.position !== newConfig.position || this.config.priority !== newConfig.priority;
		this.config = newConfig;

		if (recreate) {
			this.statusBarItem.dispose();
			this.statusBarItem = createStatusBarItem(this.config);
		}

		this.scheduleUpdate();
	}

	public async update(): Promise<void> {
		if (this.isDisposed) {
			return;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}

		const generation = ++this.updateGeneration;
		const uri = getActiveUri();
		if (!uri) {
			this.statusBarItem.hide();
			return;
		}

		const stat = await getStat(uri, (msg) => this.logChannel?.warn(msg));
		if (this.isDisposed || generation !== this.updateGeneration) {
			return;
		}

		if (!stat) {
			this.statusBarItem.hide();
			return;
		}

		this.statusBarItem.text = formatStatusBarText(stat, this.config.template);
		this.statusBarItem.show();
	}
}

function createStatusBarItem(config: Config): vscode.StatusBarItem {
	const isLeft = config.position === 'left';
	const alignment = isLeft ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;

	// On left alignment, negate priority so larger values place the item closer to center.
	const priority = isLeft ? -config.priority : config.priority;

	const item = vscode.window.createStatusBarItem('file-statbar.item', alignment, priority);
	item.name = 'File StatBar';
	return item;
}

function formatStatusBarText(stat: Stats, template: string): string {
	return template.replace(/\{([a-zA-Z]+)(?::([^}]+))?\}/g, (match, field: string, modifier?: string) => {
		switch (field) {
			case 'mode':
				return formatMode(stat.mode, modifier) ?? match;
			case 'size': {
				switch (modifier) {
					case undefined:
					case 'bytes':
						return formatFileSize(stat.size, 'bytes');
					case '1000':
					case 'si':
						return formatFileSize(stat.size, 'si');
					case '1024':
					case 'iec':
						return formatFileSize(stat.size, 'iec');
					default:
						return match;
				}
			}
			case 'atime':
				return formatStrftime(stat.atime, modifier);
			case 'mtime':
				return formatStrftime(stat.mtime, modifier);
			case 'ctime':
				return formatStrftime(stat.ctime, modifier);
			case 'btime':
				return formatStrftime(stat.birthtime, modifier);
			default:
				return match;
		}
	});
}
