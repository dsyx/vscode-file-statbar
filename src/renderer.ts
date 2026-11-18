import * as vscode from 'vscode';
import { formatDevice } from './formatters/device.js';
import { formatFileType, formatMode, formatPermissions } from './formatters/mode.js';
import { formatSize } from './formatters/size.js';
import { formatNanosecondTimestamp, formatTimestamp } from './formatters/timestamp.js';
import type { Stats } from './types.js';

type GridCell = readonly [label: string, value: string | undefined];

const ASCII_MAX_CODE_POINT = 0x7f;
const COLUMN_GAP = 2;
const MAX_LINE_WIDTH = 80;
const SYMLINK_SEPARATOR = ' -> ';
const UNAVAILABLE_PLACEHOLDER = '-';

const PLACEHOLDER_PATTERN = /\{([^}]*)\}/g;
const FIELD_PATTERN = /^([a-zA-Z]+)(?::(.+))?$/;
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function renderTemplate(stats: Stats, template: string): string {
	return template.replace(PLACEHOLDER_PATTERN, (_match, body: string) => {
		const parsed = FIELD_PATTERN.exec(body);
		const rendered = parsed ? renderTemplateField(stats, parsed[1], parsed[2]) : undefined;
		return rendered ?? UNAVAILABLE_PLACEHOLDER;
	});
}

export function renderTooltip(stats: Stats, platform: NodeJS.Platform = process.platform): vscode.MarkdownString {
	return new vscode.MarkdownString(formatCodeBlock(renderTooltipText(stats, platform)));
}

export function renderTooltipText(stats: Stats, platform: NodeJS.Platform = process.platform): string {
	const detailRows: readonly (readonly GridCell[])[] = [
		[
			['dev', stats.dev !== undefined ? formatDevice(stats.dev, platform) : undefined],
			['ino', stats.ino !== undefined ? stats.ino.toString(10) : undefined],
			['nlink', formatOptionalInteger(stats.nlink)],
		],
		[
			['mode', formatModeCell(stats.mode)],
			['type', stats.mode !== undefined ? formatFileType(stats.mode) : undefined],
			['perm', stats.mode !== undefined ? formatPermissions(stats.mode) : undefined],
		],
		[
			['uid', formatOptionalInteger(stats.uid)],
			['gid', formatOptionalInteger(stats.gid)],
		],
		[
			['size', formatSizeCell(stats.size)],
			['blocks', formatOptionalInteger(stats.blocks)],
			['blksize', formatOptionalInteger(stats.blksize)],
		],
		[['atime', formatNanosecondTimestamp(stats.atimeNs, stats.atime)]],
		[['mtime', formatNanosecondTimestamp(stats.mtimeNs, stats.mtime)]],
		[['ctime', formatNanosecondTimestamp(stats.ctimeNs, stats.ctime)]],
		[['btime', formatNanosecondTimestamp(stats.btimeNs, stats.btime)]],
	];

	const fileLabel = 'file';
	const col0LabelWidth = detailRows.reduce((max, row) => Math.max(max, row[0][0].length), fileLabel.length);
	const maxFileValueWidth = Math.max(0, MAX_LINE_WIDTH - (col0LabelWidth + ': '.length));
	const fileRow: readonly GridCell[] = [
		[fileLabel, formatFileValue(stats.filePath, stats.symlinkTarget, maxFileValueWidth)],
	];

	return formatGrid([fileRow, ...detailRows], COLUMN_GAP);
}

function renderTemplateField(stats: Stats, field: string, modifier?: string): string | undefined {
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

function formatGrid(rows: readonly (readonly GridCell[])[], gapMin: number): string {
	const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
	const labelWidths = new Array<number>(maxCols).fill(0);

	for (const row of rows) {
		for (let col = 0; col < row.length; col++) {
			labelWidths[col] = Math.max(labelWidths[col], row[col][0].length);
		}
	}

	const renderedRows = rows.map((row) =>
		row.map(([label, value], col) => `${label.padStart(labelWidths[col], ' ')}: ${value ?? UNAVAILABLE_PLACEHOLDER}`),
	);

	const colWidths = new Array<number>(maxCols).fill(0);
	for (const row of renderedRows) {
		for (let col = 0; col < row.length - 1; col++) {
			colWidths[col] = Math.max(colWidths[col], row[col].length);
		}
	}

	return renderedRows
		.map((row) =>
			row.map((cell, col) => (col < row.length - 1 ? cell.padEnd(colWidths[col] + gapMin, ' ') : cell)).join(''),
		)
		.join('\n');
}

function formatCodeBlock(text: string): string {
	let maxBackticks = 0;
	for (const match of text.matchAll(/`+/g)) {
		if (match[0].length > maxBackticks) {
			maxBackticks = match[0].length;
		}
	}

	const fence = '`'.repeat(Math.max(3, maxBackticks + 1));
	return `${fence}text\n${text}\n${fence}`;
}

function formatFileValue(filePath: string, symlinkTarget: string | undefined, maxWidth: number): string {
	const sanitizedPath = sanitizeSingleLine(filePath);
	if (symlinkTarget === undefined) {
		return truncateMiddleByWidth(sanitizedPath, maxWidth);
	}

	const sanitizedTarget = sanitizeSingleLine(symlinkTarget);
	const sepWidth = getDisplayWidth(SYMLINK_SEPARATOR);
	const leftWidth = getDisplayWidth(sanitizedPath);
	const rightWidth = getDisplayWidth(sanitizedTarget);
	if (leftWidth + sepWidth + rightWidth <= maxWidth) {
		return `${sanitizedPath}${SYMLINK_SEPARATOR}${sanitizedTarget}`;
	}

	const contentBudget = Math.max(0, maxWidth - sepWidth);
	const halfBudget = Math.floor(contentBudget / 2);
	let leftBudget: number;
	let rightBudget: number;

	if (leftWidth <= halfBudget) {
		leftBudget = leftWidth;
		rightBudget = contentBudget - leftWidth;
	} else if (rightWidth <= halfBudget) {
		rightBudget = rightWidth;
		leftBudget = contentBudget - rightWidth;
	} else {
		leftBudget = Math.ceil(contentBudget / 2);
		rightBudget = contentBudget - leftBudget;
	}

	const left = truncateMiddleByWidth(sanitizedPath, leftBudget);
	const right = truncateMiddleByWidth(sanitizedTarget, rightBudget);
	return `${left}${SYMLINK_SEPARATOR}${right}`;
}

function sanitizeSingleLine(value: string): string {
	return value.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

function truncateMiddleByWidth(value: string, maxWidth: number): string {
	if (getDisplayWidth(value) <= maxWidth) {
		return value;
	}

	const ellipsis = '...';
	if (maxWidth <= ellipsis.length) {
		return ellipsis.slice(0, Math.max(0, maxWidth));
	}

	const segments = Array.from(GRAPHEME_SEGMENTER.segment(value), (part) => part.segment);
	const available = maxWidth - ellipsis.length;
	const headBudget = Math.ceil(available / 2);

	let headEnd = 0;
	let headWidth = 0;
	while (headEnd < segments.length) {
		const w = getSegmentWidth(segments[headEnd]);
		if (headWidth + w > headBudget) {
			break;
		}
		headWidth += w;
		headEnd++;
	}

	const tailBudget = available - headWidth;
	let tailStart = segments.length;
	let tailWidth = 0;
	while (tailStart > headEnd) {
		const w = getSegmentWidth(segments[tailStart - 1]);
		if (tailWidth + w > tailBudget) {
			break;
		}
		tailWidth += w;
		tailStart--;
	}

	return `${segments.slice(0, headEnd).join('')}${ellipsis}${segments.slice(tailStart).join('')}`;
}

function getDisplayWidth(value: string): number {
	let width = 0;
	for (const { segment } of GRAPHEME_SEGMENTER.segment(value)) {
		width += getSegmentWidth(segment);
	}
	return width;
}

function getSegmentWidth(segment: string): number {
	const cp = segment.codePointAt(0);
	if (cp === undefined) {
		return 0;
	}
	return cp <= ASCII_MAX_CODE_POINT ? 1 : 2;
}

function formatOptionalInteger(value?: number): string | undefined {
	return value !== undefined ? String(value) : undefined;
}

function formatModeCell(mode?: number): string | undefined {
	if (mode === undefined) {
		return undefined;
	}

	const octal = formatMode(mode, 'o');
	const symbolic = formatMode(mode, 's');
	return octal !== undefined && symbolic !== undefined ? `${octal} (${symbolic})` : undefined;
}

function formatSizeCell(size: number): string | undefined {
	const iec = formatSize(size, 'iec');
	return iec !== undefined ? `${size} (${iec})` : undefined;
}
