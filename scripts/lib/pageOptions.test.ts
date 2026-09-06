import { expect, it } from 'vitest';
import { readPageOptions } from './pageOptions';

it('reads page navigation options from CRLF frontmatter', () => {
  expect(
    readPageOptions(
      '---\r\nsidebarLabel: "Start here"\r\nsidebarOrder: -1\r\nsidebarHidden: false\r\ndraft: true\r\n---\r\n# Page',
      'guide.md',
    ),
  ).toEqual({
    sidebarLabel: 'Start here',
    sidebarOrder: -1,
    sidebarHidden: false,
    draft: true,
  });
});
it.each([
  'outline: yes',
  'pagination: 0',
  'draft: yes',
  'sidebarHidden: 1',
  'sidebarOrder: many',
  'sidebarLabel:',
  'draft: true\ndraft: false',
])('reports invalid metadata with the source filename (%s)', (field) => {
  expect(() =>
    readPageOptions(`---\n${field}\n---\n# Page`, 'guide.md'),
  ).toThrow('guide.md');
});

it('reads explicit reading controls', () => {
  expect(
    readPageOptions(
      '---\noutline: false\npagination: true\n---\n# Page',
      'guide.md',
    ),
  ).toEqual({ outline: false, pagination: true });
});
