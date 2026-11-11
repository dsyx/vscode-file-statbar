import * as vscode from 'vscode';
import { formatMode, formatSize, formatStrftime } from './formatter.js';
import { type Config, EXTENSION_DISPLAY_NAME, type Position, STATUS_BAR_ID, type Stats } from './types.js';

const UNAVAILABLE_PLACEHOLDER = '-';
const DEFAULT_STRFTIME_PATTERN = '%Y-%m-%d %H:%M:%S';

const PLACEHOLDER_PATTERN = /\{([^}]*)\}/g;
const FIELD_PATTERN = /^([a-zA-Z]+)(?::(.+))?$/;

const POSITION_LAYOUTS: Record<Position, { alignment: vscode.StatusBarAlignment; priorityFactor: number }> = {
	left: { alignment: vscode.StatusBarAlignment.Left, priorityFactor: -1 },
	right: { alignment: vscode.StatusBarAlignment.Right, priorityFactor: 1 },
};

export class StatBar implements vscode.Disposable {
	#item: vscode.StatusBarItem;
	#config: Config;
	#stat?: Stats;

	constructor(config: Config) {
		this.#config = config;
		this.#item = createItem(this.#config);
	}

	public dispose(): void {
		this.#item.dispose();
	}

	public get text(): string {
		return this.#item.text;
	}

	public get alignment(): vscode.StatusBarAlignment {
		return this.#item.alignment;
	}

	public get priority(): number | undefined {
		return this.#item.priority;
	}

	public updateConfig(newConfig: Config): void {
		const recreate = this.#config.position !== newConfig.position || this.#config.priority !== newConfig.priority;
		this.#config = newConfig;

		if (recreate) {
			this.#item.dispose();
			this.#item = createItem(this.#config);
		}

		this.update(this.#stat);
	}

	public update(stat?: Stats): void {
		this.#stat = stat;
		if (!stat) {
			this.#item.text = '';
			this.#item.hide();
			return;
		}

		this.#item.text = renderTemplate(stat, this.#config.template);
		this.#item.show();
	}
}

export function renderTemplate(stat: Stats, template: string): string {
	return template.replace(PLACEHOLDER_PATTERN, (_match, body: string) => {
		const parsed = FIELD_PATTERN.exec(body);
		const rendered = parsed ? renderField(stat, parsed[1], parsed[2]) : undefined;
		return rendered ?? UNAVAILABLE_PLACEHOLDER;
	});
}

function renderField(stat: Stats, field: string, modifier?: string): string | undefined {
	switch (field) {
		case 'mode':
			return formatMode(stat.mode, modifier);
		case 'size':
			return formatSize(stat.size, modifier);
		case 'atime':
		case 'mtime':
		case 'ctime':
		case 'btime':
			return formatStrftime(stat[field], modifier ?? DEFAULT_STRFTIME_PATTERN);
		default:
			return undefined;
	}
}

function createItem(config: Config): vscode.StatusBarItem {
	const { alignment, priorityFactor } = POSITION_LAYOUTS[config.position];
	const priority = priorityFactor * config.priority;
	const item = vscode.window.createStatusBarItem(STATUS_BAR_ID, alignment, priority);
	item.name = EXTENSION_DISPLAY_NAME;
	return item;
}
