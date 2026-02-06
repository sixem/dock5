// Minimal HTML parsing helpers.
//
// We allow a tiny subset of HTML blocks (h1-h6, p) because many docs are copied
// from READMEs that use HTML for alignment and logos.
import type { HtmlBlock } from './types.ts';

export const extractHtmlAttr = (rawTag: string, name: string) => {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = rawTag.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
};

export const parseHtmlBlock = (
  lines: string[],
  startIndex: number,
): HtmlBlock | null => {
  const startLine = lines[startIndex] ?? '';
  const trimmedStart = startLine.trimStart();

  const startTagMatch = trimmedStart.match(/^<(h[1-6]|p)\b[^>]*>/i);
  if (!startTagMatch) return null;

  const tagName = startTagMatch[1]?.toLowerCase() ?? null;
  if (!tagName) return null;

  const startTag = startTagMatch[0];
  const align = extractHtmlAttr(startTag, 'align');
  const closeTag = `</${tagName}>`;

  const afterStart = trimmedStart.slice(startTag.length);

  const parts: string[] = [];
  const inlineCloseIndex = afterStart.toLowerCase().indexOf(closeTag);
  if (inlineCloseIndex !== -1) {
    parts.push(afterStart.slice(0, inlineCloseIndex));
    return {
      tagName: tagName as HtmlBlock['tagName'],
      align,
      inner: parts.join('\n'),
      nextIndex: startIndex + 1,
    };
  }

  parts.push(afterStart);
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const closeIndex = line.toLowerCase().indexOf(closeTag);
    if (closeIndex !== -1) {
      parts.push(line.slice(0, closeIndex));
      return {
        tagName: tagName as HtmlBlock['tagName'],
        align,
        inner: parts.join('\n'),
        nextIndex: i + 1,
      };
    }

    parts.push(line);
    i += 1;
  }

  // No closing tag found; treat it as plain text so it gets escaped.
  return null;
};
