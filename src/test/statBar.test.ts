import assert from 'node:assert/strict';
import { StatBar } from '../statBar.js';
import type { Config } from '../types.js';

suite('StatBar tests', () => {
	const defaultConfig: Config = {
		template: '[ {mode} | {size:iec} | {mtime} (M) ]',
		position: 'right',
		priority: 1024,
	};

	let statBar: StatBar;

	setup(() => {
		statBar = new StatBar(defaultConfig);
	});

	teardown(() => {
		statBar.dispose();
	});

	test('should create and dispose StatBar cleanly', () => {
		assert.ok(statBar);
		assert.doesNotThrow(() => {
			statBar.dispose();
		});
	});

	test('should schedule update without error', () => {
		assert.doesNotThrow(() => {
			statBar.scheduleUpdate();
		});
	});

	test('should update configuration without error', () => {
		assert.doesNotThrow(() => {
			statBar.updateConfig({
				template: '[ {size} ]',
				position: 'left',
				priority: 500,
			});
		});
	});

	test('should execute update without error', async () => {
		await assert.doesNotReject(async () => {
			await statBar.update();
		});
	});
});
