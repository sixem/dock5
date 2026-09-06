import { expect, it } from 'vitest';
import type { DocsPage } from './manifest';
import { buildNavTree, collectNavPages } from './navTree';

const page = (slug: string, options: Partial<DocsPage> = {}): DocsPage => ({
  slug,
  title: slug,
  html: '',
  headings: [],
  ...options,
});

it('orders and labels pages and folder groups while discovering new children', () => {
  const tree = buildNavTree(
    [
      page('/'),
      page('/reference'),
      page('/guides/setup', { sidebarLabel: 'Start', sidebarOrder: 1 }),
      page('/guides/advanced'),
      page('/hidden', { sidebarHidden: true }),
    ],
    { '/guides': { label: 'Learn', order: 1 }, '/reference': { order: 2 } },
  );
  expect(tree.map((node) => node.key)).toEqual(['/guides', '/reference', '/']);
  expect(tree[0].title).toBe('Learn');
  expect(tree[0].children.map((node) => node.title)).toEqual([
    'Start',
    '/guides/advanced',
  ]);
});

it('keeps children of a hidden folder page accessible without exposing its link', () => {
  const tree = buildNavTree([
    page('/guides', { sidebarHidden: true }),
    page('/guides/setup'),
  ]);
  expect(tree[0].page).toBeNull();
  expect(tree[0].children[0].page?.slug).toBe('/guides/setup');
});

it('flattens reading order with landing pages before children and skips hidden pages', () => {
  const tree = buildNavTree(
    [
      page('/'),
      page('/guides'),
      page('/guides/b'),
      page('/guides/a', { sidebarOrder: 1 }),
      page('/guides/hidden', { sidebarHidden: true }),
      page('/reference'),
    ],
    { '/': { order: 0 }, '/guides': { order: 1 }, '/reference': { order: 2 } },
  );
  expect(collectNavPages(tree).map((page) => page.slug)).toEqual([
    '/',
    '/guides',
    '/guides/a',
    '/guides/b',
    '/reference',
  ]);
});
