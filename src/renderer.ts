import * as vscode from 'vscode';
import { formatDevice } from './dev.js';
import { formatFileType, formatMode, formatPermissions } from './mode.js';
import { formatSize } from './size.js';
import { formatTimestamp } from './time.js';
import type { Stats } from './types.js';

type GridCell = readonly [label: string, value: string | undefined];
type GridRow = readonly GridCell[];

const UNAVAILABLE_PLACEHOLDER = '-';
const TEMPLATE_TOKEN_PATTERN = /\{\{|\}\}|\{([^{}]*)\}/g;
const FIELD_PATTERN = /^([a-zA-Z]+)(?::(.+))?$/;

const COLUMN_GAP = 2;
const FIRST_LABEL_WIDTH = 5;
const MAX_LINE_WIDTH = 80;

const ASCII_MAX_CODE_POINT = 0x7f;
const EXTENDED_PICTOGRAPHIC_PATTERN = /\p{Extended_Pictographic}/u;
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const WIDE_CODE_POINT_RANGES: readonly (readonly [start: number, end: number])[] = [
	[0x1100, 0x115f], // Hangul Jamo
	[0x2329, 0x232a], // Angle Brackets
	[0x2e80, 0x303e], // CJK Radicals .. CJK Symbols (excl. U+303F)
	[0x3040, 0x3247], // Hiragana .. Enclosed CJK Letters
	[0x3250, 0x4dbf], // Enclosed CJK Letters .. CJK Extension A
	[0x4e00, 0xa4c6], // CJK Unified Ideographs .. Yi Radicals
	[0xa960, 0xa97c], // Hangul Jamo Extended-A
	[0xac00, 0xd7a3], // Hangul Syllables
	[0xf900, 0xfaff], // CJK Compatibility Ideographs
	[0xfe10, 0xfe19], // Vertical Forms
	[0xfe30, 0xfe6b], // CJK Compatibility Forms .. Small Form Variants
	[0xff01, 0xff60], // Fullwidth ASCII & Punctuation
	[0xffe0, 0xffe6], // Fullwidth Symbol Variants
	[0x1b000, 0x1b001], // Kana Supplement
	[0x1f200, 0x1f251], // Enclosed Ideographic Supplement
	[0x20000, 0x3fffd], // CJK Unified Ideographs Extensions B-I
];

export function renderTemplate(stats: Stats, template: string): string {
	return template.replace(TEMPLATE_TOKEN_PATTERN, (match, placeholder: string | undefined) => {
		if (placeholder === undefined) {
			return match[0];
		}

		const [, field, modifier] = FIELD_PATTERN.exec(placeholder) ?? [];
		return (field ? formatTemplateField(stats, field, modifier) : undefined) ?? UNAVAILABLE_PLACEHOLDER;
	});
}

export function renderTooltip(stats: Stats, platform: NodeJS.Platform = process.platform): vscode.MarkdownString {
	const fileLines = formatFileLines(stats.filePath, stats.symlinkTarget, FIRST_LABEL_WIDTH, MAX_LINE_WIDTH);
	const propertyLines = formatGrid(buildPropertyRows(stats, platform), COLUMN_GAP, FIRST_LABEL_WIDTH);
	return new vscode.MarkdownString().appendCodeblock(`${fileLines}\n${propertyLines}`, 'text');
}

function formatTemplateField(stats: Stats, field: string, modifier?: string): string | undefined {
	switch (field) {
		case 'mode':
			return ifDefined(stats.mode, (mode) => formatMode(mode, modifier ?? 's'));
		case 'size':
			return ifDefined(stats.size, (size) => formatSize(size, modifier ?? 'bytes'));
		case 'atime':
		case 'mtime':
		case 'ctime':
		case 'btime':
			return ifDefined(stats[`${field}Ns`], (ns) => formatTimestamp(ns, modifier ?? 'datetime'));
		default:
			return undefined;
	}
}

function formatFileLines(
	filePath: string,
	symlinkTarget: string | undefined,
	labelWidth: number,
	maxLineWidth: number,
): string {
	const prefix = `${'file'.padStart(labelWidth, ' ')}: `;
	const availableWidth = maxLineWidth - prefix.length;

	let value: string;
	if (symlinkTarget === undefined) {
		value = truncatePathByWidth(filePath, availableWidth);
	} else {
		const link = `${filePath} -> ${symlinkTarget}`;
		if (getDisplayWidth(link) <= availableWidth) {
			value = link;
		} else {
			const indent = ' '.repeat(prefix.length);
			const path = truncatePathByWidth(filePath, availableWidth);
			const target = truncatePathByWidth(symlinkTarget, availableWidth - '-> '.length);
			value = `${path}\n${indent}-> ${target}`;
		}
	}

	return `${prefix}${value}`;
}

function buildPropertyRows(stats: Stats, platform: NodeJS.Platform): readonly GridRow[] {
	return [
		[
			['dev', ifDefined(stats.dev, (dev) => formatDevice(dev, platform))],
			['ino', stats.ino?.toString()],
			['nlink', stats.nlink?.toString()],
		],
		[
			['mode', ifDefined(stats.mode, (mode) => `${formatMode(mode, 'o')} (${formatMode(mode, 's')})`)],
			['type', ifDefined(stats.mode, formatFileType)],
			['perm', ifDefined(stats.mode, (mode) => `${formatPermissions(mode, 'o')} (${formatPermissions(mode, 's')})`)],
		],
		[
			['uid', stats.uid?.toString()],
			['gid', stats.gid?.toString()],
		],
		[
			['size', ifDefined(stats.size, (size) => `${size} (${formatSize(size, 'iec')})`)],
			['blocks', stats.blocks?.toString()],
			['blksize', stats.blksize?.toString()],
		],
		[['atime', ifDefined(stats.atimeNs, (ns) => formatTimestamp(ns, 'gnu-full-iso'))]],
		[['mtime', ifDefined(stats.mtimeNs, (ns) => formatTimestamp(ns, 'gnu-full-iso'))]],
		[['ctime', ifDefined(stats.ctimeNs, (ns) => formatTimestamp(ns, 'gnu-full-iso'))]],
		[['btime', ifDefined(stats.btimeNs, (ns) => formatTimestamp(ns, 'gnu-full-iso'))]],
	];
}

function formatGrid(rows: readonly GridRow[], columnGap: number, minFirstLabelWidth = 0): string {
	const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
	const labelWidths = new Array<number>(columnCount).fill(0);
	if (columnCount > 0) {
		labelWidths[0] = minFirstLabelWidth;
	}

	for (const row of rows) {
		for (let col = 0; col < row.length; col++) {
			labelWidths[col] = Math.max(labelWidths[col], row[col][0].length);
		}
	}

	const formattedRows = rows.map((row) =>
		row.map(([label, value], col) => `${label.padStart(labelWidths[col], ' ')}: ${value ?? UNAVAILABLE_PLACEHOLDER}`),
	);

	const columnWidths = new Array<number>(columnCount).fill(0);
	for (const row of formattedRows) {
		for (let col = 0; col < row.length - 1; col++) {
			columnWidths[col] = Math.max(columnWidths[col], row[col].length);
		}
	}

	return formattedRows
		.map((row) =>
			row.map((cell, col) => (col < row.length - 1 ? cell.padEnd(columnWidths[col] + columnGap, ' ') : cell)).join(''),
		)
		.join('\n');
}

function truncatePathByWidth(path: string, maxWidth: number): string {
	if (getDisplayWidth(path) <= maxWidth) {
		return path;
	}

	const separator = path.includes('/') ? '/' : path.includes('\\') ? '\\' : undefined;
	if (!separator) {
		return truncateMiddleByWidth(path, maxWidth);
	}

	const segments = splitPathSegments(path, separator);
	if (segments.length <= 1) {
		return truncateMiddleByWidth(path, maxWidth);
	}

	const separatorWidth = 1;
	const segmentWidths = segments.map(getDisplayWidth);

	let usedWidth = '...'.length + separatorWidth + segmentWidths[segments.length - 1];
	if (usedWidth > maxWidth) {
		return truncateMiddleByWidth(path, maxWidth);
	}

	let headCount = 0;
	let tailCount = 1;
	let headBlocked = false;
	let tailBlocked = false;
	let preferHead = true;

	while (headCount + tailCount < segments.length - 1 && (!headBlocked || !tailBlocked)) {
		const takeHead = preferHead ? !headBlocked : tailBlocked;
		const index = takeHead ? headCount : segments.length - 1 - tailCount;
		const addedWidth = separatorWidth + segmentWidths[index];

		if (usedWidth + addedWidth <= maxWidth) {
			usedWidth += addedWidth;
			if (takeHead) {
				headCount++;
			} else {
				tailCount++;
			}
		} else if (takeHead) {
			headBlocked = true;
		} else {
			tailBlocked = true;
		}

		preferHead = !preferHead;
	}

	return [...segments.slice(0, headCount), '...', ...segments.slice(segments.length - tailCount)].join(separator);
}

function splitPathSegments(path: string, separator: string): string[] {
	const parts = path.split(separator);
	const start = parts.findIndex((part) => part.length > 0);
	if (start === -1) {
		return [path];
	}

	let end = parts.length - 1;
	while (end > start && parts[end].length === 0) {
		end--;
	}

	const segments = parts.slice(start, end + 1);
	if (start > 0) {
		segments[0] = `${separator.repeat(start)}${segments[0]}`;
	}
	const trailing = parts.length - 1 - end;
	if (trailing > 0) {
		segments[segments.length - 1] = `${segments[segments.length - 1]}${separator.repeat(trailing)}`;
	}

	return segments;
}

function truncateMiddleByWidth(value: string, maxWidth: number): string {
	const graphemes = Array.from(GRAPHEME_SEGMENTER.segment(value), ({ segment }) => segment);
	const availableWidth = maxWidth - '...'.length;

	let headEnd = 0;
	let tailStart = graphemes.length;
	let usedWidth = 0;
	let pickTail = true;

	while (headEnd < tailStart) {
		const width = getGraphemeWidth(graphemes[pickTail ? tailStart - 1 : headEnd]);
		if (usedWidth + width > availableWidth) {
			break;
		}

		usedWidth += width;
		if (pickTail) {
			tailStart--;
		} else {
			headEnd++;
		}
		pickTail = !pickTail;
	}

	return `${graphemes.slice(0, headEnd).join('')}...${graphemes.slice(tailStart).join('')}`;
}

function getDisplayWidth(value: string): number {
	let width = 0;
	for (const { segment } of GRAPHEME_SEGMENTER.segment(value)) {
		width += getGraphemeWidth(segment);
	}
	return width;
}

function getGraphemeWidth(grapheme: string): number {
	const cp = grapheme.codePointAt(0);
	if (cp === undefined) {
		return 0;
	}
	if (cp <= ASCII_MAX_CODE_POINT) {
		return 1;
	}
	return isWideCodePoint(cp) || EXTENDED_PICTOGRAPHIC_PATTERN.test(grapheme) ? 2 : 1;
}

function isWideCodePoint(cp: number): boolean {
	for (const [start, end] of WIDE_CODE_POINT_RANGES) {
		if (cp < start) {
			return false;
		}
		if (cp <= end) {
			return true;
		}
	}
	return false;
}

function ifDefined<T, R>(value: T | undefined, fn: (value: T) => R): R | undefined {
	return value !== undefined ? fn(value) : undefined;
}
