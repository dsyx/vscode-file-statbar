import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { renderTemplate, StatBar } from '../statBar.js';
import type { Config, Stats } from '../types.js';

suite('statBar tests', () => {
	const sampleStat: Stats = {
		filePath: 'sample.txt',
		size: 1178,
		mode: 0o100644,
		mtime: new Date(2026, 9, 29, 13, 59, 0),
		ctime: new Date(2026, 9, 29, 14, 0, 0),
		birthtime: new Date(2026, 9, 1, 8, 30, 0),
	};

	test('should substitute default template placeholders correctly', () => {
		const defaultTemplate = '[ {mode} | {size:iec} | {mtime} (M) ]';
		assert.strictEqual(
			renderTemplate(sampleStat, defaultTemplate),
			'[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:00 (M) ]',
		);
	});

	test('should substitute mode, size, and timestamp modifiers', () => {
		const template =
			'{mode:o} | {size} | {size:bytes} | {size:1000} | {size:si} | {size:1024} | {size:iec} | {atime} | {mtime:%F} | {ctime:%T} | {btime:%F}';
		assert.strictEqual(
			renderTemplate(sampleStat, template),
			'100644 | 1178 B | 1178 B | 1.18 kB | 1.18 kB | 1.15 KiB | 1.15 KiB | - | 2026-10-29 | 14:00:00 | 2026-10-01',
		);
	});

	test('should preserve unknown fields and unknown modifiers as-is', () => {
		assert.strictEqual(renderTemplate(sampleStat, '{unknown}'), '{unknown}');
		assert.strictEqual(renderTemplate(sampleStat, '{mode:invalid}'), '{mode:invalid}');
		assert.strictEqual(renderTemplate(sampleStat, '{size:invalid}'), '{size:invalid}');
		const statWithoutMode: Stats = { ...sampleStat, mode: undefined };
		assert.strictEqual(renderTemplate(statWithoutMode, '{mode:invalid}'), '{mode:invalid}');
		assert.strictEqual(renderTemplate(statWithoutMode, '{mode}'), '-');
	});

	test('should manage StatusBarItem lifecycle across update, updateConfig, and dispose', () => {
		const config: Config = {
			template: '[ {mode} | {size:bytes} ]',
			position: 'right',
			priority: 1024,
		};
		const statBar = new StatBar(config);
		try {
			assert.strictEqual(statBar.text, '');
			assert.strictEqual(statBar.alignment, vscode.StatusBarAlignment.Right);
			assert.strictEqual(statBar.priority, 1024);

			statBar.update(undefined);
			assert.strictEqual(statBar.text, '');

			statBar.update(sampleStat);
			assert.strictEqual(statBar.text, '[ -rw-r--r-- | 1178 B ]');

			statBar.updateConfig({
				template: '{size:iec}',
				position: 'right',
				priority: 1024,
			});
			assert.strictEqual(statBar.text, '1.15 KiB');
			assert.strictEqual(statBar.alignment, vscode.StatusBarAlignment.Right);
			assert.strictEqual(statBar.priority, 1024);

			statBar.updateConfig({
				template: '{size:iec}',
				position: 'left',
				priority: 500,
			});
			assert.strictEqual(statBar.text, '1.15 KiB');
			assert.strictEqual(statBar.alignment, vscode.StatusBarAlignment.Left);
			assert.strictEqual(statBar.priority, -500);

			statBar.update(undefined);
			assert.strictEqual(statBar.text, '');
		} finally {
			statBar.dispose();
		}
	});
});
