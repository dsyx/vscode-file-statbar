import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { renderTemplate, renderTooltip } from '../renderer.js';
import type { Stats } from '../types.js';

suite('Renderer Test Suite', () => {
	const fixedDate = new Date(2026, 10, 4, 11, 52, 57);
	const baseSec = BigInt(Math.floor(fixedDate.getTime() / 1000));

	const sampleDirStats: Stats = {
		dev: 0x17n,
		ino: 948n,
		mode: 0o040755n,
		nlink: 2n,
		uid: 104n,
		gid: 112n,
		size: 80n,
		blocks: 0n,
		blksize: 4096n,
		atimeNs: baseSec * 1_000_000_000n + 336_000_044n,
		mtimeNs: baseSec * 1_000_000_000n + 380_000_045n,
		ctimeNs: baseSec * 1_000_000_000n + 380_000_045n,
		btimeNs: baseSec * 1_000_000_000n + 336_000_044n,
		filePath: '/run/avahi-daemon/',
	};

	test('should render status bar template placeholders, modifiers, and escaped braces', () => {
		assert.strictEqual(
			renderTemplate(sampleDirStats, '[ {mode} | {size:iec} | {mtime} (M) ]'),
			'[ drwxr-xr-x | 80 B | 2026-11-04 11:52:57 (M) ]',
		);

		const fileStats: Stats = {
			filePath: 'sample.txt',
			size: 1178n,
			mode: 0o100644n,
			mtimeNs: BigInt(new Date(2026, 9, 29, 13, 59, 0).getTime()) * 1_000_000n,
			ctimeNs: BigInt(new Date(2026, 9, 29, 14, 0, 0).getTime()) * 1_000_000n,
			btimeNs: BigInt(new Date(2026, 9, 1, 8, 30, 0).getTime()) * 1_000_000n,
		};
		assert.strictEqual(
			renderTemplate(
				fileStats,
				'{mode} | {mode:s} | {mode:o} | {size} | {size:bytes} | {size:si} | {size:iec} | {atime} | {mtime:date} | {ctime:time} | {btime:datetime}',
			),
			'-rw-r--r-- | -rw-r--r-- | 100644 | 1178 B | 1178 B | 1.18 kB | 1.15 KiB | - | 2026-10-29 | 14:00:00 | 2026-10-01 08:30:00',
		);

		assert.strictEqual(renderTemplate(sampleDirStats, '{{mode}} {{{mode}}}'), '{mode} {drwxr-xr-x}');
		assert.strictEqual(renderTemplate(sampleDirStats, '{{ {mode} | {size:iec} }}'), '{ drwxr-xr-x | 80 B }');
		assert.strictEqual(renderTemplate(sampleDirStats, '{{ {mode} | {{size}} }}'), '{ drwxr-xr-x | {size} }');
		assert.strictEqual(renderTemplate(sampleDirStats, '{ {mode} | {size:iec} }'), '{ drwxr-xr-x | 80 B }');
		assert.strictEqual(renderTemplate(sampleDirStats, '{{{{}}}}'), '{{}}');
	});

	test('should render unsupported placeholders and missing fields as the unavailable placeholder', () => {
		for (const placeholder of [
			'{unknown}',
			'{mode:invalid}',
			'{size:invalid}',
			'{size:1000}',
			'{size:1024}',
			'{mtime:invalid}',
			'{mtime:iso-datetime}',
			'{mtime:%F}',
			'{mtime:}',
			'{}',
			'{ }',
			'{ mode }',
			'{123}',
		]) {
			assert.strictEqual(renderTemplate(sampleDirStats, placeholder), '-', placeholder);
		}

		assert.strictEqual(renderTemplate(sampleDirStats, '[{unknown}] {mode:o}'), '[-] 040755');
		assert.strictEqual(renderTemplate({ ...sampleDirStats, mode: undefined }, '{mode:invalid}'), '-');
		assert.strictEqual(renderTemplate({ ...sampleDirStats, mode: undefined }, '{mode}'), '-');
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
			mode: 0o100644n,
			size: 104_857_600n,
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
			size: 128n,
			mode: 0o100600n,
			mtimeNs: baseSec * 1_000_000_000n,
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

		assert.strictEqual(renderTemplate({ filePath: '/empty.txt' }, '{mode} {size:iec} {mtime}'), '- - -');
		assert.ok(renderTooltipText({ filePath: '/empty.txt' }, 'linux').includes(' size: -'));
	});

	test('should wrap tooltip in text code block and truncate long final path segments within 80 cols', () => {
		const longFileStats: Stats = {
			filePath: `dir/${'a'.repeat(120)}.ts`,
			size: 0n,
		};
		const tooltip = renderTooltip(longFileStats, 'linux');
		assert.ok(tooltip instanceof vscode.MarkdownString);
		assert.ok(tooltip.value.startsWith('\n```text\n'));
		assert.ok(tooltip.value.endsWith('\n```\n'));

		const inner = tooltip.value.slice('\n```text\n'.length, -'\n```\n'.length);
		const lines = inner.split('\n');
		assert.strictEqual(lines.length, 9);
		assert.ok(!inner.includes('\t'));
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

		const longTargetLines = renderTooltipText(
			{
				...sampleDirStats,
				filePath: 'bin/sh',
				symlinkTarget: `/usr/local/Cellar/very-long-package-name/${'nested/'.repeat(15)}bin/bash`,
			},
			'linux',
		).split('\n');
		assert.strictEqual(longTargetLines.length, 10);
		assert.strictEqual(longTargetLines[0], ' file: bin/sh');
		assert.ok(longTargetLines[1].startsWith('       -> /usr/local/'));
		assert.strictEqual(longTargetLines[1].indexOf('-'), longTargetLines[0].indexOf('bin/sh'));
		assert.ok(longTargetLines[1].includes('/.../'));
		assert.ok(longTargetLines[1].endsWith('/bin/bash'));
		assert.ok(longTargetLines[1].length <= 80);

		const bothLongLines = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `packages/core/${'deep-source-dir/'.repeat(6)}index.ts`,
				symlinkTarget: `packages/target/${'deep-target-dir/'.repeat(6)}index.js`,
			},
			'linux',
		).split('\n');
		assert.strictEqual(bothLongLines.length, 10);
		assert.ok(bothLongLines[0].startsWith(' file: packages/core/'));
		assert.ok(bothLongLines[0].includes('/.../'));
		assert.ok(bothLongLines[0].endsWith('/index.ts'));
		assert.ok(bothLongLines[0].length <= 80);
		assert.ok(bothLongLines[1].startsWith('       -> packages/target/'));
		assert.ok(bothLongLines[1].includes('/.../'));
		assert.ok(bothLongLines[1].endsWith('/index.js'));
		assert.ok(bothLongLines[1].length <= 80);
	});

	test('should truncate paths by alternating segment boundaries and measure single-width non-ASCII accurately', () => {
		const deepPathLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath:
					'tmp/long/longlong/longlonglong/longlonglonglong/longlonglonglonglong/longlonglonglonglonglong/longlonglonglonglonglonglong.txt',
			},
			'linux',
		).split('\n')[0];
		assert.strictEqual(deepPathLine, ' file: tmp/long/.../longlonglonglonglonglong/longlonglonglonglonglonglong.txt');

		const windowsPathLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath:
					'C:\\Users\\developer\\workspace\\very-long-organization\\packages\\core\\src\\components\\statusBar.ts',
			},
			'win32',
		).split('\n')[0];
		assert.ok(windowsPathLine.startsWith(' file: C:\\Users\\'));
		assert.ok(windowsPathLine.includes('\\...\\'));
		assert.ok(windowsPathLine.endsWith('\\components\\statusBar.ts'));
		assert.ok(windowsPathLine.length <= 80);

		const trailingSlashLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `/var/lib/deeply/nested/${'directory/'.repeat(10)}avahi-daemon/`,
			},
			'linux',
		).split('\n')[0];
		assert.ok(trailingSlashLine.startsWith(' file: /var/'));
		assert.ok(trailingSlashLine.includes('/.../'));
		assert.ok(trailingSlashLine.endsWith('/avahi-daemon/'));
		assert.ok(trailingSlashLine.length <= 80);

		// NFC accented Latin and Cyrillic characters are single-width and must not truncate prematurely.
		const nfcPath = 'packages/résumé/über/café/проверка/naïve-файл-имя.ts';
		const nfdPath = nfcPath.normalize('NFD');
		assert.strictEqual(
			renderTooltipText({ ...sampleDirStats, filePath: nfcPath }, 'linux').split('\n')[0],
			` file: ${nfcPath}`,
		);
		assert.strictEqual(
			renderTooltipText({ ...sampleDirStats, filePath: nfdPath }, 'linux').split('\n')[0],
			` file: ${nfdPath}`,
		);

		// Continue filling the opposite side when one side's next segment exceeds the remaining width.
		const longHeadLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `${'a'.repeat(67)}/packages/ui/src/index.ts`,
			},
			'linux',
		).split('\n')[0];
		assert.strictEqual(longHeadLine, ' file: .../packages/ui/src/index.ts');

		const longTailParentLine = renderTooltipText(
			{
				...sampleDirStats,
				filePath: `packages/core/src/ui/${'b'.repeat(54)}/index.ts`,
			},
			'linux',
		).split('\n')[0];
		assert.strictEqual(longTailParentLine, ' file: packages/core/src/ui/.../index.ts');
	});
});

function renderTooltipText(stats: Stats, platform: NodeJS.Platform): string {
	const tooltip = renderTooltip(stats, platform);
	assert.ok(tooltip instanceof vscode.MarkdownString);
	assert.ok(tooltip.value.startsWith('\n```text\n'));
	assert.ok(tooltip.value.endsWith('\n```\n'));
	return tooltip.value.slice('\n```text\n'.length, -'\n```\n'.length);
}
