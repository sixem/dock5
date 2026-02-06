// GitHub-ish pipe table support.

import { parseInlineHtml } from './inline.ts';
import type { CompileContext, TableAlign, TableBlock } from './types.ts';

export const splitTableRow = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return [];

  let inner = trimmed;
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let inCode = false;

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];

    if (ch === '`') {
      inCode = !inCode;
      current += ch;
      continue;
    }

    // Tables often escape pipes inside cell content with "\|". We treat those as
    // literal characters, and avoid splitting on them.
    if (ch === '|' && !inCode && inner[i - 1] !== '\\') {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replaceAll('\\|', '|'));
};

const isTableSeparatorCell = (cell: string) => /^:?-{3,}:?$/.test(cell.trim());

const isTableSeparatorLine = (line: string) => {
  const cells = splitTableRow(line);
  if (cells.length < 1) return false;
  return cells.every(isTableSeparatorCell);
};

const parseTableAlign = (separatorCell: string): TableAlign => {
  const trimmed = separatorCell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
};

export const isTableStart = (lines: string[], index: number) => {
  const header = (lines[index] ?? '').trim();
  const separator = (lines[index + 1] ?? '').trim();

  if (!header || !separator) return false;
  if (!header.includes('|')) return false;
  if (!isTableSeparatorLine(separator)) return false;

  const headerCells = splitTableRow(header);
  const separatorCells = splitTableRow(separator);

  if (headerCells.length < 1) return false;
  if (headerCells.length !== separatorCells.length) return false;
  if (!headerCells.some((cell) => cell.trim().length > 0)) return false;

  return true;
};

export const parseTableBlock = (
  lines: string[],
  startIndex: number,
  ctx: CompileContext,
): TableBlock | null => {
  if (!isTableStart(lines, startIndex)) return null;

  const headerCells = splitTableRow(lines[startIndex] ?? '');
  const separatorCells = splitTableRow(lines[startIndex + 1] ?? '');
  const columnCount = headerCells.length;
  const alignments = separatorCells.map(parseTableAlign);

  const styleForAlign = (align: TableAlign) => {
    if (align === 'center') return ' style="text-align: center"';
    if (align === 'right') return ' style="text-align: right"';
    if (align === 'left') return ' style="text-align: left"';
    return '';
  };

  let i = startIndex + 2;
  const rows: string[][] = [];

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();

    if (!trimmed) break;
    if (!trimmed.includes('|')) break;

    // Stop if the table is followed by another block element.
    if (trimmed.startsWith('```')) break;
    if (/^#{1,6}\s+/.test(trimmed)) break;
    if (/^>\s?/.test(trimmed)) break;
    if (/^([-*+])\s+/.test(trimmed)) break;
    if (/^\d+\.\s+/.test(trimmed)) break;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) break;

    const cells = splitTableRow(raw);
    const normalized = cells.slice(0, columnCount);
    while (normalized.length < columnCount) normalized.push('');
    rows.push(normalized);
    i += 1;
  }

  const headerHtml = headerCells
    .map(
      (cell, idx) =>
        `<th${styleForAlign(alignments[idx] ?? null)}>${parseInlineHtml(cell, ctx)}</th>`,
    )
    .join('');

  const bodyHtml = rows
    .map((row) => {
      const cellsHtml = row
        .map(
          (cell, idx) =>
            `<td${styleForAlign(alignments[idx] ?? null)}>${parseInlineHtml(cell, ctx)}</td>`,
        )
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  return { html: tableHtml, nextIndex: i };
};
