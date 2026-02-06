// Paragraph collection for the block-level compiler loop.

import { isTableStart } from './tables.ts';
import { isBrOnlyLine } from './text.ts';

export const collectParagraph = (lines: string[], startIndex: number) => {
  const collected: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) break;
    if (isBrOnlyLine(trimmed)) break;
    if (/^<(h[1-6]|p)\b/i.test(trimmed)) break;
    if (isTableStart(lines, i)) break;
    if (trimmed.startsWith('```')) break;
    if (/^#{1,6}\s+/.test(trimmed)) break;
    if (/^>\s?/.test(trimmed)) break;
    if (/^([-*+])\s+/.test(trimmed)) break;
    if (/^\d+\.\s+/.test(trimmed)) break;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) break;

    collected.push(line);
    i += 1;
  }

  return { lines: collected, nextIndex: i };
};
