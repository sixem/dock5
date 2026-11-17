// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import type { DocsPage } from './manifest';
import { buildSearchIndex, searchDocs } from './search';

const pages: DocsPage[] = [
  {
    slug: '/travel',
    title: 'Moon travel',
    html: '<p>Bookings &amp; luggage</p><h2 id="arrival">Arrival</h2><p>The crater concierge welcomes you.</p><h2 id="arrival-2">Arrival again</h2><p>Your luggage is now a moon.</p>',
    headings: [
      { id: 'arrival', depth: 2, text: 'Arrival' },
      { id: 'arrival-2', depth: 2, text: 'Arrival again' },
    ],
  },
];
it('finds page text and matching sections with distinct links', () => {
  const index = buildSearchIndex(pages);
  expect(searchDocs(index, 'bookings')[0]).toMatchObject({
    href: '#/travel',
    excerpt: 'Bookings & luggage',
  });
  expect(searchDocs(index, 'CRATER concierge')[0]).toMatchObject({
    title: 'Moon travel',
    section: 'Arrival',
    href: '#/travel#arrival',
  });
  expect(searchDocs(index, 'luggage moon')[0].href).toBe('#/travel#arrival-2');
  expect(searchDocs(index, 'absent')).toEqual([]);
  expect(searchDocs(index, '   ')).toEqual([]);
});
it('searches text without exposing generated HTML markup', () => {
  const index = buildSearchIndex([
    {
      ...pages[0],
      html: '<pre><code><span class="hljs-keyword">const</span> cabin = &quot;A&quot;;</code></pre>',
      headings: [],
    },
  ]);
  expect(searchDocs(index, 'cabin')[0].excerpt).toBe('const cabin = "A";');
  expect(searchDocs(index, 'hljs-keyword')).toEqual([]);
});

it('keeps words joined across inline formatting', () => {
  const index = buildSearchIndex([
    { ...pages[0], html: '<p>Moon<em>light</em> and stars.</p>', headings: [] },
  ]);
  expect(searchDocs(index, 'moonlight')[0].excerpt).toBe(
    'Moonlight and stars.',
  );
});

it('puts exact page and section names ahead of partial matches', () => {
  const index = buildSearchIndex(pages);
  expect(searchDocs(index, 'moon travel')[0].href).toBe('#/travel');
  expect(searchDocs(index.reverse(), 'arrival')[0].href).toBe(
    '#/travel#arrival',
  );
});
