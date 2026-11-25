import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { StatBar } from '../statBar.js';
import type { Config, Stats } from '../types.js';

suite('StatBar Test Suite', () => {
	const toNs = (date: Date): bigint => BigInt(date.getTime()) * 1_000_000n;
	const sampleStats: Stats = {
		filePath: 'sample.txt',
		size: 1178n,
		mode: 0o100644n,
		mtimeNs: toNs(new Date(2026, 9, 29, 13, 59, 0)),
		ctimeNs: toNs(new Date(2026, 9, 29, 14, 0, 0)),
		btimeNs: toNs(new Date(2026, 9, 1, 8, 30, 0)),
	};

	const baseConfig: Config = {
		template: '[ {mode} | {size:iec} | {mtime} (M) ]',
		position: 'right',
		priority: 1024,
	};

	test('should render default template for active file stats', () => {
		const statBar = new StatBar(baseConfig);
		try {
			statBar.update(sampleStats);
			assert.strictEqual(statBar.text, '[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:00 (M) ]');
		} finally {
			statBar.dispose();
		}
	});

	test('should manage StatusBarItem lifecycle across update, updateConfig, and dispose', () => {
		const statBar = new StatBar({
			template: '[ {mode} | {size:bytes} ]',
			position: 'right',
			priority: 1024,
		});
		const currentTooltip = (): string | vscode.MarkdownString | undefined => statBar.tooltip;
		try {
			assert.strictEqual(statBar.text, '');
			assert.strictEqual(currentTooltip(), undefined);

			statBar.update(undefined);
			assert.strictEqual(statBar.text, '');
			assert.strictEqual(currentTooltip(), undefined);

			statBar.updateConfig({
				template: '[ {mode} | {size:bytes} ]',
				position: 'left',
				priority: 0,
			});
			assert.strictEqual(statBar.text, '');
			assert.strictEqual(currentTooltip(), undefined);

			statBar.update(sampleStats);
			assert.strictEqual(statBar.text, '[ -rw-r--r-- | 1178 B ]');
			const initialTooltip = currentTooltip();
			assert.ok(initialTooltip instanceof vscode.MarkdownString);
			assert.ok(initialTooltip.value.includes(' file: sample.txt\n'));

			statBar.updateConfig({
				template: '{size:iec}',
				position: 'left',
				priority: 0,
			});
			assert.strictEqual(statBar.text, '1.15 KiB');
			assert.ok(currentTooltip() instanceof vscode.MarkdownString);

			statBar.updateConfig({
				template: '{size:iec}',
				position: 'left',
				priority: 500,
			});
			assert.strictEqual(statBar.text, '1.15 KiB');
			assert.ok(currentTooltip() instanceof vscode.MarkdownString);

			statBar.update(undefined);
			assert.strictEqual(statBar.text, '');
			assert.strictEqual(currentTooltip(), undefined);
		} finally {
			statBar.dispose();
		}
	});
});
