// Text helpers used across the Markdown compiler.

export const normalizeNewlines = (input: string) =>
  input.replace(/\r\n/g, '\n');

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const escapeAttr = (value: string) => escapeHtml(value);

export const escapeHtmlChar = (ch: string) => {
  switch (ch) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case "'":
      return '&#39;';
    default:
      return ch;
  }
};

export const stripFrontmatter = (markdown: string) =>
  markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

export const slugify = (text: string) => {
  const lower = text.trim().toLowerCase();
  const cleaned = lower
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'section';
};

export const stripInline = (text: string) =>
  text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

export const stripHtmlTags = (value: string) => value.replace(/<[^>]*>/g, '');

export const collapseWhitespace = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

export const collapseInlineWhitespace = (value: string) =>
  value.replace(/\s*\n\s*/g, ' ').trim();

export const isBrOnlyLine = (trimmed: string) =>
  /^<\/?br\s*\/?>$/i.test(trimmed);

export const sanitizeLang = (lang: string) => lang.replace(/[^a-z0-9-]/gi, '');
