import { expect, it } from 'vitest';
import type { DocsPage } from './manifest';
import { buildNavTree } from './navTree';

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
