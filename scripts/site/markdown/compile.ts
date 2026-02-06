// Minimal, safe Markdown -> HTML compiler (build-time).
//
// Why this exists:
// - Keeps runtime lean: the SPA renders prebuilt HTML.
// - Keeps docs safe by default: we escape all text and strictly sanitize URLs.
//
// Note: This is intentionally small (MVP). The entire module is a seam we can later
// replace with a full GFM pipeline (unified/remark/rehype) without changing the
// app's manifest contract.
import { normalizeAssetsBase } from './compiler/assets.ts';
import { parseHtmlBlock } from './compiler/html.ts';
import { parseInlineHtml } from './compiler/inline.ts';
import { collectParagraph } from './compiler/paragraph.ts';
import { parseTableBlock } from './compiler/tables.ts';
import {
  collapseInlineWhitespace,
  collapseWhitespace,
  escapeAttr,
  escapeHtml,
  isBrOnlyLine,
  normalizeNewlines,
  sanitizeLang,
  slugify,
  stripFrontmatter,
  stripHtmlTags,
  stripInline,
} from './compiler/text.ts';
import type {
  CompileContext,
  CompileMarkdownOptions,
  CompileMarkdownResult,
  HeadingEntry,
} from './compiler/types.ts';

export type {
  CompileMarkdownOptions,
  CompileMarkdownResult,
  HeadingEntry,
} from './compiler/types.ts';

export const compileMarkdown = ({
  markdown,
  currentRelPath,
  currentSlug,
  toSlug,
  assetsBase,
}: CompileMarkdownOptions): CompileMarkdownResult => {
  const md = stripFrontmatter(normalizeNewlines(markdown));
  const lines = md.split('\n');

  const ctx: CompileContext = {
    currentRelPath,
    currentSlug,
    toSlug,
    assetsBase: normalizeAssetsBase(assetsBase),
  };

  const headings: HeadingEntry[] = [];

  const headingIdCounts = new Map<string, number>();

  const allocHeadingId = (text: string) => {
    const base = slugify(text);
    const seen = headingIdCounts.get(base) ?? 0;
    headingIdCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  const html: string[] = [];
  let i = 0;
  let skippedFirstH1 = false;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (isBrOnlyLine(trimmed)) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = sanitizeLang(trimmed.slice(3).trim());
      i += 1;
      const codeLines: string[] = [];

      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }

      if (i < lines.length) i += 1;

      const code = codeLines.join('\n');
      const cls = lang ? ` class="language-${escapeAttr(lang)}"` : '';
      html.push(`<pre><code${cls}>${escapeHtml(code)}</code></pre>`);
      continue;
    }

    const htmlBlock = parseHtmlBlock(lines, i);
    if (htmlBlock) {
      i = htmlBlock.nextIndex;

      const align = (htmlBlock.align ?? '').toLowerCase();
      const style =
        align === 'center' || align === 'left' || align === 'right'
          ? ` style="text-align: ${align}"`
          : '';

      const inner = collapseInlineWhitespace(htmlBlock.inner);
      const text = collapseWhitespace(stripInline(stripHtmlTags(inner)));

      if (htmlBlock.tagName.startsWith('h')) {
        const depth = Number(htmlBlock.tagName.slice(1));
        const id = text ? allocHeadingId(text) : null;

        if (depth === 1 && !skippedFirstH1 && text) {
          skippedFirstH1 = true;
          continue;
        }

        if (depth >= 2 && id) headings.push({ depth, id, text });

        const idAttr = id ? ` id="${escapeAttr(id)}"` : '';
        html.push(
          `<h${depth}${idAttr}${style}>${parseInlineHtml(inner, ctx)}</h${depth}>`,
        );
        continue;
      }

      if (htmlBlock.tagName === 'p') {
        if (inner) html.push(`<p${style}>${parseInlineHtml(inner, ctx)}</p>`);
        continue;
      }
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const rawText = headingMatch[2] ?? '';
      const text = stripInline(rawText).trim();
      const id = allocHeadingId(text);

      if (depth === 1 && !skippedFirstH1) {
        skippedFirstH1 = true;
        i += 1;
        continue;
      }

      if (depth >= 2) headings.push({ depth, id, text });

      html.push(
        `<h${depth} id="${escapeAttr(id)}">${parseInlineHtml(rawText, ctx)}</h${depth}>`,
      );
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      html.push('<hr />');
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? '').trim())) {
        const q = (lines[i] ?? '').trim().replace(/^>\s?/, '');
        quoteLines.push(q);
        i += 1;
      }

      const inner = quoteLines.join('\n');
      const innerHtml = compileMarkdown({
        markdown: inner,
        currentRelPath,
        currentSlug,
        toSlug,
        assetsBase,
      }).html;
      html.push(`<blockquote>${innerHtml}</blockquote>`);
      continue;
    }

    if (/^([-*+])\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^([-*+])\s+/.test((lines[i] ?? '').trim())) {
        const content = (lines[i] ?? '').trim().replace(/^([-*+])\s+/, '');
        items.push(content);
        i += 1;
      }

      html.push(
        `<ul>${items.map((item) => `<li>${parseInlineHtml(item, ctx)}</li>`).join('')}</ul>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? '').trim())) {
        const content = (lines[i] ?? '').trim().replace(/^\d+\.\s+/, '');
        items.push(content);
        i += 1;
      }

      html.push(
        `<ol>${items.map((item) => `<li>${parseInlineHtml(item, ctx)}</li>`).join('')}</ol>`,
      );
      continue;
    }

    const table = parseTableBlock(lines, i, ctx);
    if (table) {
      html.push(table.html);
      i = table.nextIndex;
      continue;
    }

    const paragraph = collectParagraph(lines, i);
    i = paragraph.nextIndex;

    const text = paragraph.lines.join(' ').trim();
    if (text) html.push(`<p>${parseInlineHtml(text, ctx)}</p>`);
  }

  return { html: html.join('\n'), headings };
};
