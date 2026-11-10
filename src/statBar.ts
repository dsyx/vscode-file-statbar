import * as vscode from 'vscode';
import { formatMode, formatSize, formatStrftime } from './formatter.js';
import type { Config, Stats } from './types.js';

const UNAVAILABLE = '-';

export class StatBar implements vscode.Disposable {
	private item: vscode.StatusBarItem;
	private config: Config;
	private stat?: Stats;

	constructor(config: Config) {
		this.config = config;
		this.item = createItem(this.config);
	}

	public dispose(): void {
		this.item.dispose();
	}

	public get text(): string {
		return this.item.text;
	}

	public get alignment(): vscode.StatusBarAlignment {
		return this.item.alignment;
	}

	public get priority(): number | undefined {
		return this.item.priority;
	}

	public updateConfig(newConfig: Config): void {
		const recreate = this.config.position !== newConfig.position || this.config.priority !== newConfig.priority;
		this.config = newConfig;

		if (recreate) {
			this.item.dispose();
			this.item = createItem(this.config);
		}

		this.update(this.stat);
	}

	public update(stat?: Stats): void {
		this.stat = stat;
		if (!stat) {
			this.item.text = '';
			this.item.hide();
			return;
		}

		this.item.text = renderTemplate(stat, this.config.template);
		this.item.show();
	}
}

export function renderTemplate(stat: Stats, template: string): string {
	return template.replace(/\{([a-zA-Z]+)(?::([^}]+))?\}/g, (match, field: string, modifier?: string) => {
		switch (field) {
			case 'mode': {
				switch (modifier) {
					case undefined:
					case 'o':
					case 'b':
					case 'd':
					case 'x':
					case 'X':
						return formatMode(stat.mode, modifier) ?? UNAVAILABLE;
					default:
						return match;
				}
			}
			case 'size': {
				switch (modifier) {
					case undefined:
					case 'bytes':
						return formatSize(stat.size, 'bytes') ?? UNAVAILABLE;
					case '1000':
					case 'si':
						return formatSize(stat.size, 'si') ?? UNAVAILABLE;
					case '1024':
					case 'iec':
						return formatSize(stat.size, 'iec') ?? UNAVAILABLE;
					default:
						return match;
				}
			}
			case 'atime':
				return formatStrftime(stat.atime, modifier) ?? UNAVAILABLE;
			case 'mtime':
				return formatStrftime(stat.mtime, modifier) ?? UNAVAILABLE;
			case 'ctime':
				return formatStrftime(stat.ctime, modifier) ?? UNAVAILABLE;
			case 'btime':
				return formatStrftime(stat.birthtime, modifier) ?? UNAVAILABLE;
			default:
				return match;
		}
	});
}

function createItem(config: Config): vscode.StatusBarItem {
	const isLeft = config.position === 'left';
	const alignment = isLeft ? vscode.StatusBarAlignment.Left : vscode.StatusBarAlignment.Right;

	// On left alignment, negate priority so larger values place the item closer to center.
	const priority = isLeft ? -config.priority : config.priority;

	const item = vscode.window.createStatusBarItem('file-statbar.item', alignment, priority);
	item.name = 'File StatBar';
	return item;
}
