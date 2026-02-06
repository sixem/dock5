// Inline Markdown parsing (links, images, emphasis, safe HTML snippets).
import { resolveAssetRelPath, toAssetUrl } from './assets.ts';
import { extractHtmlAttr } from './html.ts';
import { escapeAttr, escapeHtml, escapeHtmlChar } from './text.ts';
import type { CompileContext } from './types.ts';
import { rewriteHref, safeUrl } from './urls.ts';

export const parseInlineHtml = (text: string, ctx: CompileContext) => {
  let i = 0;
  let out = '';

  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        out += `<strong>${parseInlineHtml(inner, ctx)}</strong>`;
        i = end + 2;
        continue;
      }
    }

    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        const inner = text.slice(i + 1, end);
        out += `<em>${parseInlineHtml(inner, ctx)}</em>`;
        i = end + 1;
        continue;
      }
    }

    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        const code = text.slice(i + 1, end);
        out += `<code>${escapeHtml(code)}</code>`;
        i = end + 1;
        continue;
      }
    }

    if (text.startsWith('![', i)) {
      const closeBracket = text.indexOf(']', i + 2);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const alt = text.slice(i + 2, closeBracket);
          const srcRaw = text.slice(closeBracket + 2, closeParen);
          const src = safeUrl(srcRaw, { kind: 'src' });
          const resolved = resolveAssetRelPath(src, ctx);
          const finalSrc = resolved ? toAssetUrl(resolved, ctx) : src;
          out += `<img src="${escapeAttr(finalSrc)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
          i = closeParen + 1;
          continue;
        }
      }
    }

    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(i + 1, closeBracket);
          const targetRaw = text.slice(closeBracket + 2, closeParen);

          const href = rewriteHref(targetRaw, ctx, { hashShorthand: 'anchor' });

          out += `<a href="${escapeAttr(href)}">${parseInlineHtml(label, ctx)}</a>`;
          i = closeParen + 1;
          continue;
        }
      }
    }

    if (text[i] === '<') {
      const tagEnd = text.indexOf('>', i);
      if (tagEnd !== -1) {
        const rawTag = text.slice(i, tagEnd + 1);
        const lower = rawTag.toLowerCase();

        // Common "line break" patterns found in Markdown copied from HTML sources.
        if (/^<\/?br\s*\/?>$/i.test(rawTag)) {
          out += '<br />';
          i = tagEnd + 1;
          continue;
        }

        if (lower.startsWith('<img') && /^<img\b/i.test(rawTag)) {
          const srcRaw = extractHtmlAttr(rawTag, 'src') ?? '';
          const altRaw = extractHtmlAttr(rawTag, 'alt') ?? '';
          const src = safeUrl(srcRaw, { kind: 'src' });
          const resolved = resolveAssetRelPath(src, ctx);
          const finalSrc = resolved ? toAssetUrl(resolved, ctx) : src;
          out += `<img src="${escapeAttr(finalSrc)}" alt="${escapeAttr(altRaw)}" loading="lazy" />`;
          i = tagEnd + 1;
          continue;
        }

        if (lower.startsWith('<a') && /^<a\b/i.test(rawTag)) {
          const close = text.toLowerCase().indexOf('</a>', tagEnd + 1);
          if (close !== -1) {
            const inner = text.slice(tagEnd + 1, close);
            const hrefRaw = extractHtmlAttr(rawTag, 'href') ?? '';
            const href = rewriteHref(hrefRaw, ctx, { hashShorthand: 'route' });
            out += `<a href="${escapeAttr(href)}">${parseInlineHtml(inner, ctx)}</a>`;
            i = close + '</a>'.length;
            continue;
          }
        }

        if (lower.startsWith('<span') && /^<span\b/i.test(rawTag)) {
          const close = text.toLowerCase().indexOf('</span>', tagEnd + 1);
          if (close !== -1) {
            const inner = text.slice(tagEnd + 1, close);
            out += parseInlineHtml(inner, ctx);
            i = close + '</span>'.length;
            continue;
          }

          // No closing tag; drop the start tag.
          i = tagEnd + 1;
          continue;
        }

        if (lower.startsWith('</span') && /^<\/span\b/i.test(rawTag)) {
          i = tagEnd + 1;
          continue;
        }
      }
    }

    out += escapeHtmlChar(text[i] ?? '');
    i += 1;
  }

  return out;
};
