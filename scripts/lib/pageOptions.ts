import { readFrontmatter } from './frontmatter';

export type PageOptions = {
  sidebarLabel?: string;
  sidebarOrder?: number;
  sidebarHidden?: boolean;
  draft?: boolean;
  outline?: boolean;
  pagination?: boolean;
};

export const readPageOptions = (
  markdown: string,
  source: string,
): PageOptions => {
  const { data } = readFrontmatter(markdown, source);
  const result: PageOptions = {};
  if ('sidebarLabel' in data) {
    if (typeof data.sidebarLabel !== 'string' || !data.sidebarLabel.trim())
      throw new Error(`${source}: sidebarLabel must be a non-empty string`);
    result.sidebarLabel = data.sidebarLabel.trim();
  }
  if ('sidebarOrder' in data) {
    if (
      typeof data.sidebarOrder !== 'number' ||
      !Number.isFinite(data.sidebarOrder)
    )
      throw new Error(`${source}: sidebarOrder must be a number`);
    result.sidebarOrder = data.sidebarOrder;
  }
  for (const key of [
    'sidebarHidden',
    'draft',
    'outline',
    'pagination',
  ] as const) {
    if (!(key in data)) continue;
    if (typeof data[key] !== 'boolean')
      throw new Error(`${source}: ${key} must be true or false`);
    result[key] = data[key];
  }
  return result;
};
