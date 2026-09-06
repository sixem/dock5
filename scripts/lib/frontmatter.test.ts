import { expect, it } from 'vitest';
import { extractTitle } from '../site/generate';
import { readFrontmatter } from './frontmatter';

it('parses YAML comments, quoted strings, multiline text, and nested data', () => {
  const markdown =
    '---\r\ntitle: "Flight: \\"outbound\\"" # title\r\nsummary: >-\r\n  One small\r\n  step.\r\nextra:\r\n  tags: [moon, travel]\r\n---\r\n# Body';
  const result = readFrontmatter(markdown, 'guide.md');
  expect(result.data).toMatchObject({
    summary: 'One small step.',
    extra: { tags: ['moon', 'travel'] },
  });
  expect(result.content).toBe('# Body');
  expect(extractTitle(markdown, 'Fallback')).toBe('Flight: "outbound"');
});
it.each([
  '---\ntitle: A\ntitle: B\n---\nBody',
  '---\ntitle: [broken\n---\nBody',
  '---\ntitle: A',
  '---\n- array\n---\nBody',
])('rejects invalid frontmatter with source context', (markdown) => {
  expect(() => readFrontmatter(markdown, 'guide.md')).toThrow('guide.md');
});

it('infers a title from standard underlined headings', () => {
  expect(
    extractTitle('A **small** title\n=================\n\nBody', 'Fallback'),
  ).toBe('A small title');
});

it('accepts an empty frontmatter mapping', () => {
  expect(readFrontmatter('---\n---\nBody', 'guide.md')).toEqual({
    data: {},
    content: 'Body',
  });
});
