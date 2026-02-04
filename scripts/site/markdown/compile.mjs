// Minimal, safe Markdown -> HTML compiler (build-time).
//
// Why this exists:
// - Keeps runtime lean: the SPA renders prebuilt HTML.
// - Keeps docs safe by default: we escape all text and strictly sanitize URLs.
//
// Note: This is intentionally small (MVP). The entire module is a seam we can later
// replace with a full GFM pipeline (unified/remark/rehype) without changing the
// app's manifest contract.
import path from 'node:path';

const normalizeNewlines = (input) => input.replace(/\r\n/g, '\n');

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const escapeAttr = (value) => escapeHtml(value);

const stripFrontmatter = (markdown) =>
  markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

const slugify = (text) => {
  const lower = text.trim().toLowerCase();
  const cleaned = lower
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'section';
};

const safeUrl = (raw, { kind }) => {
  const value = raw.trim();
  if (!value) return '';

  // Hash-router friendly: our app uses "#/page#section". Preserve leading "#"
  // for in-page anchors; the generator rewrites them to include the page slug.
  if (kind === 'href') {
    if (value.startsWith('#')) return value;
    if (value.startsWith('/')) return value;
  }

  // Allow common absolute protocols.
  const lower = value.toLowerCase();
  if (lower.startsWith('http://')) return value;
  if (lower.startsWith('https://')) return value;
  if (lower.startsWith('mailto:')) return value;

  // Disallow dangerous/ambiguous protocols.
  if (lower.includes(':')) return '';

  // Relative URL (assets).
  return value;
};

const parseLinkTarget = (raw) => {
  const trimmed = raw.trim();
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex === -1) return { path: trimmed, fragment: null };
  return {
    path: trimmed.slice(0, hashIndex),
    fragment: trimmed.slice(hashIndex + 1) || null,
  };
};

const toPosixPath = (p) => p.split(path.sep).join('/');

const resolveMarkdownRoute = ({ targetPath, currentRelPath, toSlug }) => {
  const clean = targetPath.replace(/^\.\//, '');
  const cleanNoLeadingSlash = clean.startsWith('/') ? clean.slice(1) : clean;
  const resolved = path.normalize(
    path.join(path.dirname(currentRelPath), cleanNoLeadingSlash),
  );
  return toSlug(toPosixPath(resolved));
};

const stripInline = (text) =>
  text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

const sanitizeLang = (lang) => lang.replace(/[^a-z0-9-]/gi, '');

const parseInlineHtml = (text, ctx) => {
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
          out += `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
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

          const { path: targetPath, fragment } = parseLinkTarget(targetRaw);

          let href = safeUrl(targetPath, { kind: 'href' });
          if (href?.toLowerCase().endsWith('.md')) {
            const slug = resolveMarkdownRoute({
              targetPath: href,
              currentRelPath: ctx.currentRelPath,
              toSlug: ctx.toSlug,
            });
            href = `#${slug}${fragment ? `#${fragment}` : ''}`;
          } else if (!href && fragment) {
            // In-page anchor: rewrite "#section" into "#/page#section".
            href = `#${ctx.currentSlug}#${fragment}`;
          } else if (href?.startsWith('#')) {
            // Same-page anchor.
            href = `#${ctx.currentSlug}${href}`;
          } else if (href && fragment) {
            href = `${href}#${fragment}`;
          }

          out += `<a href="${escapeAttr(href)}">${parseInlineHtml(label, ctx)}</a>`;
          i = closeParen + 1;
          continue;
        }
      }
    }

    out += escapeHtml(text[i] ?? '');
    i += 1;
  }

  return out;
};

const collectParagraph = (lines, startIndex) => {
  const collected = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) break;
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

export const compileMarkdown = ({
  markdown,
  currentRelPath,
  currentSlug,
  toSlug,
}) => {
  const md = stripFrontmatter(normalizeNewlines(markdown));
  const lines = md.split('\n');

  const ctx = { currentRelPath, currentSlug, toSlug };

  /** @type {{ depth: number; id: string; text: string }[]} */
  const headings = [];

  /** @type {Map<string, number>} */
  const headingIdCounts = new Map();

  const allocHeadingId = (text) => {
    const base = slugify(text);
    const seen = headingIdCounts.get(base) ?? 0;
    headingIdCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  const html = [];
  let i = 0;
  let skippedFirstH1 = false;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = sanitizeLang(trimmed.slice(3).trim());
      i += 1;
      const codeLines = [];

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
      const quoteLines = [];
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
      }).html;
      html.push(`<blockquote>${innerHtml}</blockquote>`);
      continue;
    }

    if (/^([-*+])\s+/.test(trimmed)) {
      const items = [];
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
      const items = [];
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

    const paragraph = collectParagraph(lines, i);
    i = paragraph.nextIndex;

    const text = paragraph.lines.join(' ').trim();
    if (text) html.push(`<p>${parseInlineHtml(text, ctx)}</p>`);
  }

  return { html: html.join('\n'), headings };
};
