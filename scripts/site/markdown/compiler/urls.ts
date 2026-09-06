// URL parsing + rewriting logic for the docs compiler.
import * as path from 'node:path';

import { resolveAssetRelPath, toAssetUrl } from './assets.ts';
import { toPosixPath } from './paths.ts';
import type { CompileContext, HashShorthand, UrlKind } from './types.ts';

export const safeUrl = (raw: string, { kind }: { kind: UrlKind }) => {
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

export const parseLinkTarget = (
  raw: string,
): { path: string; fragment: string | null } => {
  const trimmed = raw.trim();
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex === -1) return { path: trimmed, fragment: null };
  return {
    path: trimmed.slice(0, hashIndex),
    fragment: trimmed.slice(hashIndex + 1) || null,
  };
};

export const resolveMarkdownRoute = ({
  targetPath,
  currentRelPath,
  toSlug,
}: {
  targetPath: string;
  currentRelPath: string;
  toSlug: (relativePath: string) => string;
}) => {
  const clean = targetPath.replace(/^\.\//, '');
  const cleanNoLeadingSlash = clean.startsWith('/') ? clean.slice(1) : clean;
  const resolved = path.normalize(
    path.join(path.dirname(currentRelPath), cleanNoLeadingSlash),
  );
  return toSlug(toPosixPath(resolved));
};

export const rewriteHref = (
  targetRaw: string,
  ctx: CompileContext,
  { hashShorthand }: { hashShorthand: HashShorthand },
) => {
  const value = targetRaw.trim();
  if (!value) return '';

  // Already in the app's hash-router format.
  if (value.startsWith('#/')) return value;

  const { path: targetPath, fragment } = parseLinkTarget(value);

  let href = safeUrl(targetPath, { kind: 'href' });
  if (!targetPath && fragment) {
    if (hashShorthand === 'route') {
      const route = fragment.startsWith('/') ? fragment : `/${fragment}`;
      return `#${route}`;
    }
    return `#${ctx.currentSlug}#${fragment}`;
  }
  if (!href) return '';

  // External links must never be interpreted as local Markdown or assets.
  const isExternal = href.includes(':') || href.startsWith('//');
  if (!isExternal && href.toLowerCase().endsWith('.md')) {
    const slug = resolveMarkdownRoute({
      targetPath: href,
      currentRelPath: ctx.currentRelPath,
      toSlug: ctx.toSlug,
    });
    href = `#${slug}`;
  } else if (!isExternal && ctx.assetsBase && !href.startsWith('/')) {
    const resolved = resolveAssetRelPath(href, ctx);
    if (resolved) href = toAssetUrl(resolved, ctx);
  }

  return `${href}${fragment ? `#${fragment}` : ''}`;
};
