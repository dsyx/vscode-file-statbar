import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { renderTemplate, renderTooltip, renderTooltipText } from '../renderer.js';
import type { Stats } from '../types.js';

suite('renderer tests', () => {
	const fixedDate = new Date(2026, 10, 4, 11, 52, 57);
	const baseSec = BigInt(Math.floor(fixedDate.getTime() / 1000));

	const sampleDirStats: Stats = {
		dev: 0x17n,
		ino: 948n,
		mode: 0o040755,
		nlink: 2,
		uid: 104,
		gid: 112,
		size: 80,
		blocks: 0,
		blksize: 4096,
		atime: fixedDate,
		mtime: fixedDate,
		ctime: fixedDate,
		btime: fixedDate,
		atimeNs: baseSec * 1_000_000_000n + 336_000_044n,
		mtimeNs: baseSec * 1_000_000_000n + 380_000_045n,
		ctimeNs: baseSec * 1_000_000_000n + 380_000_045n,
		btimeNs: baseSec * 1_000_000_000n + 336_000_044n,
		filePath: '/run/avahi-daemon/',
	};

	test('should render status bar template placeholders', () => {
		assert.strictEqual(
			renderTemplate(sampleDirStats, '[ {mode} | {size:iec} | {mtime} (M) ]'),
			'[ drwxr-xr-x | 80 B | 2026-11-04 11:52:57 (M) ]',
		);
		assert.strictEqual(renderTemplate(sampleDirStats, '{unknown} {mode:invalid}'), '- -');
	});

	test('should render 9 aligned lines with column colon alignment and minimum gap of 2', () => {
		const text = renderTooltipText(sampleDirStats, 'linux');
		const lines = text.split('\n');

		assert.strictEqual(lines.length, 9);
		assert.ok(!text.includes('\t'));

		for (const line of lines) {
			assert.strictEqual(line, line.trimEnd());
			assert.strictEqual(line.indexOf(':'), 5);
		}

		const col2ColonIndices = [1, 2, 3, 4].map((rowIdx) => lines[rowIdx].indexOf(':', 6));
		assert.strictEqual(new Set(col2ColonIndices).size, 1);

		const col3ColonIndices = [1, 2, 4].map((rowIdx) => lines[rowIdx].indexOf(':', col2ColonIndices[0] + 1));
		assert.strictEqual(new Set(col3ColonIndices).size, 1);

		assert.strictEqual(lines[0], ' file: /run/avahi-daemon/');
		assert.strictEqual(lines[1], '  dev: 0x17 (0,23)             ino: 948          nlink: 2');
		assert.strictEqual(lines[2], ' mode: 040755 (drwxr-xr-x)    type: directory     perm: 0755 (rwxr-xr-x)');
		assert.strictEqual(lines[3], '  uid: 104                     gid: 112');
		assert.strictEqual(lines[4], ' size: 80 (80 B)            blocks: 0          blksize: 4096');
		assert.match(lines[5], /^atime: 2026-11-04 11:52:57\.336000044 [+-]\d{4}$/);
		assert.match(lines[6], /^mtime: 2026-11-04 11:52:57\.380000045 [+-]\d{4}$/);
		assert.match(lines[7], /^ctime: 2026-11-04 11:52:57\.380000045 [+-]\d{4}$/);
		assert.match(lines[8], /^btime: 2026-11-04 11:52:57\.336000044 [+-]\d{4}$/);
	});

	test('should maintain minimum gap of 2 when size or inode is wider than mode', () => {
		const largeStats: Stats = {
			...sampleDirStats,
			mode: 0o100644,
			size: 104_857_600,
			ino: 1_125_899_906_842_624n,
		};
		const lines = renderTooltipText(largeStats, 'linux').split('\n');

		assert.ok(lines[4].includes('size: 104857600 (100.00 MiB)  blocks: 0'));
		assert.ok(lines[1].includes('ino: 1125899906842624    nlink: 2'));
	});

	test('should handle Windows and Darwin device formats and symlink targets', () => {
		const winStats: Stats = {
			...sampleDirStats,
			dev: 0x2a3b4cn,
			filePath: 'src/link.ts',
			symlinkTarget: 'src/target.ts',
		};
		const winLines = renderTooltipText(winStats, 'win32').split('\n');
		assert.strictEqual(winLines[0], ' file: src/link.ts -> src/target.ts');
		assert.ok(winLines[1].startsWith('  dev: 0x2A3B4C'));
		assert.ok(!winLines[1].includes('('));

		const darwinLines = renderTooltipText({ ...sampleDirStats, dev: 0x01000004n }, 'darwin').split('\n');
		assert.ok(darwinLines[1].startsWith('  dev: 0x1000004 (1,4)'));
	});

	test('should fallback unavailable fields to dash for virtual files', () => {
		const virtualStats: Stats = {
			filePath: '/virtual.txt',
			size: 128,
			mode: 0o100600,
			mtime: fixedDate,
		};
		const lines = renderTooltipText(virtualStats, 'linux').split('\n');

		assert.strictEqual(lines.length, 9);
		assert.strictEqual(lines[0], ' file: /virtual.txt');
		assert.strictEqual(lines[1], '  dev: -                       ino: -               nlink: -');
		assert.strictEqual(lines[2], ' mode: 100600 (-rw-------)    type: regular file     perm: 0600 (rw-------)');
		assert.strictEqual(lines[3], '  uid: -                       gid: -');
		assert.strictEqual(lines[4], ' size: 128 (128 B)          blocks: -             blksize: -');
		assert.strictEqual(lines[5], 'atime: -');
		assert.match(lines[6], /^mtime: 2026-11-04 11:52:57\.000000000 [+-]\d{4}$/);
		assert.strictEqual(lines[7], 'ctime: -');
		assert.strictEqual(lines[8], 'btime: -');
	});

	test('should sanitize control chars, truncate long paths within 80 cols, and guard markdown code fence', () => {
		const trickyStats: Stats = {
			filePath: `dir/\`\`\`evil\nline\ttab/${'a'.repeat(120)}.ts`,
			size: 0,
		};
		const tooltip = renderTooltip(trickyStats, 'linux');
		assert.ok(tooltip instanceof vscode.MarkdownString);
		assert.ok(tooltip.value.startsWith('````text\n'));
		assert.ok(tooltip.value.endsWith('\n````'));

		const inner = tooltip.value.slice('````text\n'.length, -'\n````'.length);
		const lines = inner.split('\n');
		assert.strictEqual(lines.length, 9);
		assert.ok(!inner.includes('\t'));
		assert.ok(lines[0].includes('\\n'));
		assert.ok(lines[0].includes('\\t'));
		assert.ok(lines[0].includes('...'));
		assert.strictEqual(lines[0].length, 80);
	});

	test('should preserve grapheme clusters, handle wide chars, and keep symlink arrow on truncation', () => {
		const cjkLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `项目文档/${'中文目录'.repeat(15)}/测试文件.ts`,
			},
			'linux',
		).split('\n')[0];
		assert.ok(cjkLine.includes('...'));
		const valuePart = cjkLine.slice(' file: '.length);
		let displayCols = 0;
		for (const ch of valuePart) {
			displayCols += (ch.codePointAt(0) ?? 0) <= 0x7f ? 1 : 2;
		}
		assert.ok(displayCols <= 73);

		// Combining accent and ZWJ emoji clusters must not be torn apart during middle truncation.
		const graphemeLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `${'cafe\u0301-'.repeat(8)}👨‍👩‍👧‍👦-${'cafe\u0301-'.repeat(8)}end.ts`,
			},
			'linux',
		).split('\n')[0];
		assert.ok(graphemeLine.includes('...'));
		assert.ok(!graphemeLine.includes('...\u0301'));
		assert.ok(!graphemeLine.includes('\u200d...'));
		assert.ok(!graphemeLine.includes('...\u200d'));

		const longTargetLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: 'bin/sh',
				symlinkTarget: `/usr/local/Cellar/very-long-package-name/${'nested/'.repeat(15)}bin/bash`,
			},
			'linux',
		).split('\n')[0];
		assert.ok(longTargetLine.startsWith(' file: bin/sh -> '));
		assert.ok(longTargetLine.includes('...'));
		assert.ok(longTargetLine.endsWith('/bin/bash'));
		assert.strictEqual(longTargetLine.length, 80);

		const bothLongLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `packages/core/${'deep-source-dir/'.repeat(6)}index.ts`,
				symlinkTarget: `packages/target/${'deep-target-dir/'.repeat(6)}index.js`,
			},
			'linux',
		).split('\n')[0];
		assert.ok(bothLongLine.includes(' -> '));
		assert.ok(bothLongLine.includes('index.ts'));
		assert.ok(bothLongLine.includes('index.js'));
		assert.strictEqual(bothLongLine.length, 80);
	});
});
