// Build a nested navigation tree from the docs manifest.
//
// The generator produces a flat list of pages with slugs like:
// - "/"
// - "/setup"
// - "/guides/markdown"
//
// For a nicer sidebar UX we group pages by folder segments and expose nodes
// that can be expanded/collapsed (chevrons) in the UI.
import type { DocsPage } from './manifest';

export type NavNode = {
  // Unique path key (always starts with "/").
  key: string;
  // Display label.
  title: string;
  // A node may or may not correspond to a real page.
  page: DocsPage | null;
  // Nested children.
  children: NavNode[];
};

const humanizeSegment = (segment: string) => {
  const spaced = segment.replace(/[-_]+/g, ' ');
  return spaced.length > 0
    ? spaced[0].toUpperCase() + spaced.slice(1)
    : segment;
};

const compareNodes = (a: NavNode, b: NavNode) => {
  // Keep the root page at the top.
  if (a.key === '/') return -1;
  if (b.key === '/') return 1;

  const titleCompare = a.title.localeCompare(b.title, undefined, {
    sensitivity: 'base',
  });
  if (titleCompare !== 0) return titleCompare;
  return a.key.localeCompare(b.key);
};

const sortTree = (nodes: NavNode[]) => {
  nodes.sort(compareNodes);
  for (const node of nodes) sortTree(node.children);
};

export const buildNavTree = (pages: DocsPage[]) => {
  /** @type {Map<string, NavNode>} */
  const nodesByKey = new Map<string, NavNode>();
  const childKeysByParent = new WeakMap<NavNode, Set<string>>();

  const attachChild = (parent: NavNode, child: NavNode) => {
    const key = child.key;
    if (!key) return;

    const existing = childKeysByParent.get(parent);
    if (existing) {
      if (existing.has(key)) return;
      existing.add(key);
      parent.children.push(child);
      return;
    }

    childKeysByParent.set(parent, new Set([key]));
    parent.children.push(child);
  };

  const getOrCreateNode = (key: string, fallbackTitle: string) => {
    const existing = nodesByKey.get(key);
    if (existing) return existing;

    const created: NavNode = {
      key,
      title: fallbackTitle,
      page: null,
      children: [],
    };
    nodesByKey.set(key, created);
    return created;
  };

  const root: NavNode = {
    key: '',
    title: '',
    page: null,
    children: [],
  };

  const rootPage = pages.find((page) => page.slug === '/') ?? null;
  if (rootPage) {
    const rootNode = {
      key: '/',
      title: rootPage.title,
      page: rootPage,
      children: [],
    };
    attachChild(root, rootNode);
    nodesByKey.set('/', rootNode);
  }

  for (const page of pages) {
    if (page.slug === '/') continue;

    const segments = page.slug.replace(/^\//, '').split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let parent = root;
    let currentKey = '';

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i] ?? '';
      if (!segment) continue;

      currentKey = `${currentKey}/${segment}`;
      const isLeaf = i === segments.length - 1;

      const node = getOrCreateNode(currentKey, humanizeSegment(segment));

      // Attach node to tree if it isn't already attached.
      attachChild(parent, node);

      if (isLeaf) {
        node.page = page;
        node.title = page.title;
      }

      parent = node;
    }
  }

  sortTree(root.children);
  return root.children;
};

export const collectAncestorKeys = (path: string) => {
  if (!path || path === '/') return [];

  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  const ancestors: string[] = [];
  let current = '';

  for (const segment of segments) {
    current = `${current}/${segment}`;
    ancestors.push(current);
  }

  return ancestors;
};
