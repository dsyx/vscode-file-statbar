import assert from 'node:assert/strict';
import { StatBar } from '../statBar.js';
import type { Config, Stats } from '../types.js';

suite('statBar tests', () => {
	const sampleStats: Stats = {
		filePath: 'sample.txt',
		size: 1178,
		mode: 0o100644,
		mtime: new Date(2026, 9, 29, 13, 59, 0),
		ctime: new Date(2026, 9, 29, 14, 0, 0),
		btime: new Date(2026, 9, 1, 8, 30, 0),
	};

	const baseConfig: Config = {
		template: '[ {mode} | {size:iec} | {mtime} (M) ]',
		position: 'right',
		priority: 1024,
	};

	test('should substitute default template placeholders correctly', () => {
		const statBar = new StatBar(baseConfig);
		try {
			statBar.update(sampleStats);
			assert.strictEqual(statBar.text, '[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:00 (M) ]');
		} finally {
			statBar.dispose();
		}
	});

	test('should substitute mode, size, and timestamp modifiers', () => {
		const statBar = new StatBar({
			...baseConfig,
			template:
				'{mode} | {mode:s} | {mode:o} | {size} | {size:bytes} | {size:si} | {size:iec} | {atime} | {mtime:iso-date} | {ctime:iso-time} | {btime:iso-datetime}',
		});
		try {
			statBar.update(sampleStats);
			assert.strictEqual(
				statBar.text,
				'-rw-r--r-- | -rw-r--r-- | 100644 | 1178 B | 1178 B | 1.18 kB | 1.15 KiB | - | 2026-10-29 | 14:00:00 | 2026-10-01 08:30:00',
			);
		} finally {
			statBar.dispose();
		}
	});

	test('should render unsupported placeholders as the unavailable placeholder', () => {
		const statBar = new StatBar(baseConfig);
		try {
			for (const placeholder of [
				'{unknown}',
				'{mode:invalid}',
				'{size:invalid}',
				'{size:1000}',
				'{size:1024}',
				'{size:constructor}',
				'{mtime:invalid}',
				'{mtime:%F}',
				'{mtime:constructor}',
				'{mtime:}',
				'{}',
				'{ }',
				'{ mode }',
				'{123}',
			]) {
				statBar.updateConfig({ ...baseConfig, template: placeholder });
				statBar.update(sampleStats);
				assert.strictEqual(statBar.text, '-', placeholder);
			}

			statBar.updateConfig({ ...baseConfig, template: '[{unknown}] {mode:o}' });
			statBar.update(sampleStats);
			assert.strictEqual(statBar.text, '[-] 100644');

			const statsWithoutMode: Stats = { ...sampleStats, mode: undefined };
			statBar.updateConfig({ ...baseConfig, template: '{mode:invalid}' });
			statBar.update(statsWithoutMode);
			assert.strictEqual(statBar.text, '-');

			statBar.updateConfig({ ...baseConfig, template: '{mode}' });
			assert.strictEqual(statBar.text, '-');
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
		try {
			assert.strictEqual(statBar.text, '');

			statBar.update(undefined);
			assert.strictEqual(statBar.text, '');

			statBar.updateConfig({
				template: '[ {mode} | {size:bytes} ]',
				position: 'left',
				priority: 0,
			});
			assert.strictEqual(statBar.text, '');

			statBar.update(sampleStats);
			assert.strictEqual(statBar.text, '[ -rw-r--r-- | 1178 B ]');

			statBar.updateConfig({
				template: '{size:iec}',
				position: 'left',
				priority: 0,
			});
			assert.strictEqual(statBar.text, '1.15 KiB');

			statBar.updateConfig({
				template: '{size:iec}',
				position: 'left',
				priority: 500,
			});
			assert.strictEqual(statBar.text, '1.15 KiB');

			statBar.update(undefined);
			assert.strictEqual(statBar.text, '');
		} finally {
			statBar.dispose();
		}
	});
});
