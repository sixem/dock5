import hljs from 'highlight.js';
import MarkdownIt, { type Token } from 'markdown-it';
import { readFrontmatter } from '../../lib/frontmatter';
import {
  normalizeAssetsBase,
  resolveAssetRelPath,
  toAssetUrl,
} from './compiler/assets';
import { extractHtmlAttr, parseHtmlBlock } from './compiler/html';
import { parseInlineHtml } from './compiler/inline';
import {
  escapeAttr,
  slugify,
  stripHtmlTags,
  stripInline,
} from './compiler/text';
import type {
  CompileContext,
  CompileMarkdownOptions,
  CompileMarkdownResult,
  HeadingEntry,
} from './compiler/types';
import { rewriteHref, safeUrl } from './compiler/urls';

export type {
  CompileMarkdownOptions,
  CompileMarkdownResult,
  HeadingEntry,
} from './compiler/types';

export const compileMarkdown = (
  options: CompileMarkdownOptions,
): CompileMarkdownResult => {
  const { content } = readFrontmatter(options.markdown, options.currentRelPath);
  const ctx: CompileContext = {
    ...options,
    assetsBase: normalizeAssetsBase(options.assetsBase),
  };
  const headings: HeadingEntry[] = [];
  const counts = new Map<string, number>();
  let skippedTitle = false;
  const headingId = (text: string) => {
    const base = slugify(text);
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
  const md = new MarkdownIt({
    html: true,
    xhtmlOut: true,
    highlight(code, language) {
      return language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : '';
    },
  });
  // Parse every destination, then apply the same strict policy to Markdown and HTML.
  md.validateLink = () => true;
  const renderLink = md.renderer.rules.link_open;
  md.renderer.rules.link_open = (tokens, index, settings, env, renderer) => {
    const token = tokens[index];
    token.attrSet(
      'href',
      rewriteHref(String(token.attrGet('href') ?? ''), ctx, {
        hashShorthand: 'anchor',
      }),
    );
    return renderLink
      ? renderLink(tokens, index, settings, env, renderer)
      : renderer.renderToken(tokens, index, settings);
  };
  const renderImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, index, settings, env, renderer) => {
    const token = tokens[index];
    const src = safeUrl(String(token.attrGet('src') ?? ''), { kind: 'src' });
    const resolved = resolveAssetRelPath(src, ctx);
    token.attrSet('src', resolved ? toAssetUrl(resolved, ctx) : src);
    token.attrSet('loading', 'lazy');
    return renderImage
      ? renderImage(tokens, index, settings, env, renderer)
      : '';
  };
  // Keep the existing small HTML compatibility surface; never render arbitrary raw HTML.
  md.renderer.rules.html_inline = (tokens, index) => {
    const raw = tokens[index].content;
    if (/^<a\b/i.test(raw))
      return `<a href="${escapeAttr(rewriteHref(extractHtmlAttr(raw, 'href') ?? '', ctx, { hashShorthand: 'route' }))}">`;
    if (/^<\/a\s*>$/i.test(raw)) return '</a>';
    return parseInlineHtml(raw, ctx);
  };
  md.renderer.rules.html_block = (tokens, index) => {
    const lines = tokens[index].content.split('\n');
    const output: string[] = [];
    for (let i = 0; i < lines.length; ) {
      const block = parseHtmlBlock(lines, i);
      if (!block) {
        if (!/^\s*<br\s*\/?>(?:\s*)$/i.test(lines[i]))
          output.push(parseInlineHtml(lines[i], ctx));
        i++;
        continue;
      }
      i = block.nextIndex;
      const text = stripInline(stripHtmlTags(block.inner)).trim();
      const depth = block.tagName.startsWith('h')
        ? Number(block.tagName.slice(1))
        : 0;
      const id = depth && text ? headingId(text) : null;
      if (depth === 1 && text && !skippedTitle) {
        skippedTitle = true;
        continue;
      }
      if (depth >= 2 && id) headings.push({ depth, id, text });
      const style = ['left', 'right', 'center'].includes(block.align ?? '')
        ? ` style="text-align: ${block.align}"`
        : '';
      output.push(
        `<${block.tagName}${id ? ` id="${escapeAttr(id)}"` : ''}${style}>${parseInlineHtml(block.inner, ctx)}</${block.tagName}>`,
      );
    }
    return output.join('\n');
  };
  const plainText = (tokens: Token[]): string =>
    tokens
      .map((token) =>
        token.type === 'text' || token.type === 'code_inline'
          ? token.content
          : token.type === 'image'
            ? token.content
            : token.children
              ? plainText(token.children)
              : '',
      )
      .join('');
  md.renderer.rules.heading_open = (
    tokens,
    index,
    settings,
    _env,
    renderer,
  ) => {
    const token = tokens[index];
    const text = plainText(tokens[index + 1]?.children ?? []);
    const depth = Number(token.tag.slice(1));
    const id = headingId(text);
    if (depth === 1 && !skippedTitle && token.level === 0) {
      skippedTitle = true;
      tokens[index + 1].hidden = true;
      tokens[index + 2].hidden = true;
      tokens[index + 1].children = [];
      return '';
    }
    token.attrSet('id', id);
    if (depth >= 2) headings.push({ depth, id, text });
    return renderer.renderToken(tokens, index, settings);
  };
  // Normalize table style spacing for the existing generated HTML contract.
  for (const tag of ['th_open', 'td_open'])
    md.renderer.rules[tag] = (tokens, index, settings, _env, renderer) => {
      const style = tokens[index].attrGet('style');
      if (style)
        tokens[index].attrSet(
          'style',
          String(style).replace('text-align:', 'text-align: '),
        );
      return renderer.renderToken(tokens, index, settings);
    };
  const html = md.render(content);
  return { html, headings };
};
