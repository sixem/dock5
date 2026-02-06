// Asset URL rewriting (images, PDFs, etc.) for the docs compiler.
//
// The generator can copy non-Markdown files out of the docs folder into a public
// assets directory. When enabled, the compiler rewrites relative URLs to point
// at that assets base.
import * as path from 'node:path';
import { toPosixPath } from './paths.ts';
import type { CompileContext } from './types.ts';

export const normalizeAssetsBase = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Allow both absolute and relative bases.
  //
  // - Absolute: "/docs-assets" (hosted at site root)
  // - Relative: "docs-assets" or "./docs-assets" (hosted relative to the built site)
  //
  // Relative is the most portable default for static hosting under sub-paths
  // (e.g. https://example.com/docs/).
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const splitSearch = (raw: string): { path: string; search: string } => {
  const idx = raw.indexOf('?');
  if (idx === -1) return { path: raw, search: '' };
  return { path: raw.slice(0, idx), search: raw.slice(idx) };
};

export const resolveAssetRelPath = (
  targetPath: string,
  ctx: CompileContext,
): { relPath: string; search: string } | null => {
  if (!ctx.assetsBase) return null;

  const normalizedTarget = targetPath.trim().replaceAll('\\', '/');
  if (!normalizedTarget) return null;
  if (normalizedTarget.startsWith('#')) return null;
  if (normalizedTarget.startsWith('/')) return null;
  if (normalizedTarget.includes(':')) return null;

  const { path: pathname, search } = splitSearch(normalizedTarget);
  const clean = pathname.replace(/^\.\//, '');
  if (!clean) return null;

  const resolved = path.normalize(
    path.join(path.dirname(ctx.currentRelPath), clean),
  );

  if (path.isAbsolute(resolved)) return null;
  if (resolved === '..' || resolved.startsWith(`..${path.sep}`)) return null;

  const relPath = toPosixPath(resolved).replace(/^\/+/, '');
  if (!relPath) return null;

  return { relPath, search };
};

export const toAssetUrl = (
  resolved: { relPath: string; search: string },
  ctx: CompileContext,
) => {
  const base = ctx.assetsBase ?? '';
  return `${base}/${resolved.relPath}${resolved.search}`;
};
