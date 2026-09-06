import { parseDocument } from 'yaml';

export const readFrontmatter = (markdown: string, source: string) => {
  const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!/^---[ \t]*\n/.test(normalized))
    return { data: {} as Record<string, unknown>, content: normalized };
  const match = normalized.match(
    /^---[ \t]*\n([\s\S]*?)^(?:---|\.\.\.)[ \t]*(?:\n|$)/m,
  );
  if (!match)
    throw new Error(`${source}: frontmatter is missing its closing delimiter`);
  const doc = parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length || doc.warnings.length)
    throw new Error(
      `${source}: ${[...doc.errors, ...doc.warnings].map((error) => error.message).join('\n')}`,
    );
  const data: unknown = doc.toJS({ maxAliasCount: 50 });
  if (data !== null && (typeof data !== 'object' || Array.isArray(data)))
    throw new Error(`${source}: frontmatter must be a mapping`);
  return {
    data: (data ?? {}) as Record<string, unknown>,
    content: normalized.slice(match[0].length),
  };
};
