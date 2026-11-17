import * as vscode from 'vscode';
import { formatMode } from './formatters/mode.js';
import { formatSize } from './formatters/size.js';
import { formatTimestamp } from './formatters/timestamp.js';
import { type Config, EXTENSION, type Position, type Stats } from './types.js';

const STATUS_BAR_ID = `${EXTENSION.name}.item`;
const UNAVAILABLE_PLACEHOLDER = '-';

const PLACEHOLDER_PATTERN = /\{([^}]*)\}/g;
const FIELD_PATTERN = /^([a-zA-Z]+)(?::(.+))?$/;

const POSITION_LAYOUTS = new Map<Position, { alignment: vscode.StatusBarAlignment; priorityFactor: number }>([
	['left', { alignment: vscode.StatusBarAlignment.Left, priorityFactor: -1 }],
	['right', { alignment: vscode.StatusBarAlignment.Right, priorityFactor: 1 }],
]);
const DEFAULT_LAYOUT = { alignment: vscode.StatusBarAlignment.Right, priorityFactor: 1 };

export class StatBar implements vscode.Disposable {
	#item: vscode.StatusBarItem;
	#config: Config;
	#stats?: Stats;

	constructor(config: Config) {
		this.#config = config;
		this.#item = createItem(this.#config);
	}

	get text(): string {
		return this.#item.text;
	}

	updateConfig(newConfig: Config): void {
		const recreate = this.#config.position !== newConfig.position || this.#config.priority !== newConfig.priority;
		this.#config = newConfig;

		if (recreate) {
			this.#item.dispose();
			this.#item = createItem(this.#config);
		}

		this.update(this.#stats);
	}

	update(stats?: Stats): void {
		this.#stats = stats;
		if (!stats) {
			this.#item.text = '';
			this.#item.hide();
			return;
		}

		this.#item.text = renderTemplate(stats, this.#config.template);
		this.#item.show();
	}

	dispose(): void {
		this.#item.dispose();
	}
}

function createItem(config: Config): vscode.StatusBarItem {
	const { alignment, priorityFactor } = POSITION_LAYOUTS.get(config.position) ?? DEFAULT_LAYOUT;
	const priority = config.priority === 0 ? 0 : priorityFactor * config.priority;
	const item = vscode.window.createStatusBarItem(STATUS_BAR_ID, alignment, priority);
	item.name = EXTENSION.displayName;
	return item;
}

function renderTemplate(stats: Stats, template: string): string {
	return template.replace(PLACEHOLDER_PATTERN, (_match, body: string) => {
		const parsed = FIELD_PATTERN.exec(body);
		const rendered = parsed ? renderField(stats, parsed[1], parsed[2]) : undefined;
		return rendered ?? UNAVAILABLE_PLACEHOLDER;
	});
}

function renderField(stats: Stats, field: string, modifier?: string): string | undefined {
	switch (field) {
		case 'mode':
			return stats.mode !== undefined ? formatMode(stats.mode, modifier ?? 's') : undefined;
		case 'size':
			return formatSize(stats.size, modifier ?? 'bytes');
		case 'atime':
		case 'mtime':
		case 'ctime':
		case 'btime': {
			const timestamp = stats[field];
			return timestamp ? formatTimestamp(timestamp, modifier ?? 'iso-datetime') : undefined;
		}
		default:
			return undefined;
	}
}
