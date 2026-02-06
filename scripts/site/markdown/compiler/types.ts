// Shared types for the build-time Markdown compiler.

export type HeadingEntry = {
  depth: number;
  id: string;
  text: string;
};

export type CompileMarkdownOptions = {
  markdown: string;
  currentRelPath: string;
  currentSlug: string;
  toSlug: (relativePath: string) => string;
  // URL base for assets copied out of the docs folder (e.g. "/docs-assets").
  // When set, relative links/images are rewritten to point at this base.
  assetsBase?: string | null;
};

export type CompileMarkdownResult = {
  html: string;
  headings: HeadingEntry[];
};

export type CompileContext = {
  currentRelPath: string;
  currentSlug: string;
  toSlug: (relativePath: string) => string;
  assetsBase: string | null;
};

export type UrlKind = 'href' | 'src';

export type HashShorthand = 'anchor' | 'route';

export type HtmlBlock = {
  tagName: `h${1 | 2 | 3 | 4 | 5 | 6}` | 'p';
  align: string | null;
  inner: string;
  nextIndex: number;
};

export type TableBlock = {
  html: string;
  nextIndex: number;
};

export type TableAlign = 'left' | 'right' | 'center' | null;
