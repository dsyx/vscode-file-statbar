import assert from 'node:assert/strict';
import { formatStatusBarText, StatBar } from '../statBar.js';
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
			formatStatusBarText(sampleStat, defaultTemplate),
			'[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:00 (M) ]',
		);
	});

	test('should substitute mode, size, and timestamp modifiers', () => {
		const template =
			'{mode:o} | {size} | {size:bytes} | {size:1000} | {size:si} | {size:1024} | {size:iec} | {atime} | {mtime:%F} | {ctime:%T} | {btime:%F}';
		assert.strictEqual(
			formatStatusBarText(sampleStat, template),
			'0644 | 1178 B | 1178 B | 1.18 kB | 1.18 kB | 1.15 KiB | 1.15 KiB | - | 2026-10-29 | 14:00:00 | 2026-10-01',
		);
	});

	test('should preserve unknown fields and unknown modifiers as-is', () => {
		assert.strictEqual(formatStatusBarText(sampleStat, '{unknown}'), '{unknown}');
		assert.strictEqual(formatStatusBarText(sampleStat, '{mode:invalid}'), '{mode:invalid}');
		assert.strictEqual(formatStatusBarText(sampleStat, '{size:invalid}'), '{size:invalid}');
	});

	test('should manage StatusBarItem lifecycle across update, updateConfig, and dispose', () => {
		const config: Config = {
			template: '[ {mode} | {size:bytes} ]',
			position: 'right',
			priority: 1024,
		};
		const statBar = new StatBar(config);
		try {
			statBar.update(undefined);
			statBar.update(sampleStat);
			statBar.updateConfig({
				template: '{size:iec}',
				position: 'left',
				priority: 500,
			});
			statBar.update(undefined);
		} finally {
			statBar.dispose();
		}
	});
});
