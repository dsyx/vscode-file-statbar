import assert from 'node:assert/strict';
import { StatBar } from '../statBar.js';
import type { Config } from '../types.js';

describe('StatBar tests', () => {
	const defaultConfig: Config = {
		template: '[ {mode} | {size:iec} | {mtime} (M) ]',
		position: 'right',
		priority: 1024,
	};

	let statBar: StatBar;

	beforeEach(() => {
		statBar = new StatBar(defaultConfig);
	});

	afterEach(() => {
		statBar.dispose();
	});

	it('should create and dispose StatBar cleanly', () => {
		assert.ok(statBar);
		assert.doesNotThrow(() => {
			statBar.dispose();
		});
	});

	it('should schedule update without error', () => {
		assert.doesNotThrow(() => {
			statBar.scheduleUpdate();
		});
	});

	it('should update configuration without error', () => {
		assert.doesNotThrow(() => {
			statBar.updateConfig({
				template: '[ {size} ]',
				position: 'left',
				priority: 500,
			});
		});
	});

	it('should execute update without error', async () => {
		await assert.doesNotReject(async () => {
			await statBar.update();
		});
	});
});
