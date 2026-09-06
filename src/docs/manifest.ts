// Typed access to the build-time generated docs manifest.
//
// Keeping this as a small module makes it easier to swap the generator contract later
// (e.g. HTML/AST output) without touching the rest of the app.
import docsManifestJson from '@/generated/docs.json';
import type { SiteConfig } from './siteConfig';

export type DocsPage = {
  outline?: boolean;
  pagination?: boolean;
  sidebarLabel?: string;
  sidebarOrder?: number;
  sidebarHidden?: boolean;
  slug: string;
  title: string;
  html: string;
  headings: Array<{
    depth: number;
    id: string;
    text: string;
  }>;
};

export type DocsManifest = Omit<SiteConfig, 'title' | 'exclude'> & {
  title: string;
  pages: DocsPage[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function assert(condition: unknown, message: string): asserts condition {
  if (condition) return;
  throw new Error(`Invalid docs manifest: ${message}`);
}

export function assertIsDocsManifest(
  value: unknown,
): asserts value is DocsManifest {
  assert(isRecord(value), 'expected an object');
  assert(
    typeof value.title === 'string' && value.title.trim(),
    'title must be a non-empty string',
  );
  for (const key of ['description', 'logo', 'favicon']) {
    assert(
      value[key] === null || typeof value[key] === 'string',
      `${key} must be a string or null`,
    );
  }
  assert(
    value.defaultTheme === 'dark' || value.defaultTheme === 'light',
    'defaultTheme must be dark or light',
  );
  assert(isRecord(value.navigation), 'navigation must be an object');
  assert(Array.isArray(value.links), 'links must be an array');
  for (const link of value.links) {
    assert(
      isRecord(link) &&
        typeof link.label === 'string' &&
        typeof link.href === 'string',
      'links must contain label and href strings',
    );
  }
  assert(Array.isArray(value.pages), 'pages must be an array');

  for (let i = 0; i < value.pages.length; i += 1) {
    const page = value.pages[i];
    assert(isRecord(page), `pages[${i}] must be an object`);
    for (const key of ['outline', 'pagination']) {
      assert(
        page[key] === undefined || typeof page[key] === 'boolean',
        `pages[${i}].${key} must be a boolean`,
      );
    }
    assert(typeof page.slug === 'string', `pages[${i}].slug must be a string`);
    assert(
      typeof page.title === 'string',
      `pages[${i}].title must be a string`,
    );
    assert(typeof page.html === 'string', `pages[${i}].html must be a string`);
    assert(
      Array.isArray(page.headings),
      `pages[${i}].headings must be an array`,
    );

    for (let j = 0; j < page.headings.length; j += 1) {
      const heading = page.headings[j];
      assert(isRecord(heading), `pages[${i}].headings[${j}] must be an object`);
      assert(
        typeof heading.depth === 'number',
        `pages[${i}].headings[${j}].depth must be a number`,
      );
      assert(
        typeof heading.id === 'string',
        `pages[${i}].headings[${j}].id must be a string`,
      );
      assert(
        typeof heading.text === 'string',
        `pages[${i}].headings[${j}].text must be a string`,
      );
    }
  }
}

const docsManifestUnknown: unknown = docsManifestJson;
assertIsDocsManifest(docsManifestUnknown);

export const docsManifest: DocsManifest = docsManifestUnknown;
