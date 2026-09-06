export type PageOptions = {
  sidebarLabel?: string;
  sidebarOrder?: number;
  sidebarHidden?: boolean;
  draft?: boolean;
  outline?: boolean;
  pagination?: boolean;
};

// These flat scalar fields use the same frontmatter convention as title.
export const readPageOptions = (
  markdown: string,
  source: string,
): PageOptions => {
  const block = markdown.match(
    /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/,
  )?.[1];
  const result: PageOptions = {};
  for (const line of block?.split(/\r?\n/) ?? []) {
    const match = line.match(
      /^(sidebarLabel|sidebarOrder|sidebarHidden|draft|outline|pagination):\s*(.*?)\s*$/,
    );
    if (!match) continue;
    const [, key, raw] = match;
    if (key in result) throw new Error(`${source}: duplicate ${key}`);
    if (key === 'sidebarLabel') {
      const label = raw.replace(/^(['"])(.*)\1$/, '$2');
      if (!label.trim())
        throw new Error(`${source}: sidebarLabel must be non-empty`);
      result.sidebarLabel = label;
    } else if (key === 'sidebarOrder') {
      if (!raw || !Number.isFinite(Number(raw)))
        throw new Error(`${source}: sidebarOrder must be a number`);
      result.sidebarOrder = Number(raw);
    } else if (
      key === 'sidebarHidden' ||
      key === 'draft' ||
      key === 'outline' ||
      key === 'pagination'
    ) {
      if (raw !== 'true' && raw !== 'false')
        throw new Error(`${source}: ${key} must be true or false`);
      result[key] = raw === 'true';
    }
  }
  return result;
};
