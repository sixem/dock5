// Typed access to the build-time generated docs manifest.
//
// Keeping this as a small module makes it easier to swap the generator contract later
// (e.g. HTML/AST output) without touching the rest of the app.
import docsManifestJson from '@/generated/docs.json';

export type DocsPage = {
  slug: string;
  title: string;
  html: string;
  headings: Array<{
    depth: number;
    id: string;
    text: string;
  }>;
};

export type DocsManifest = {
  inputDir: string;
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
  assert(typeof value.inputDir === 'string', 'inputDir must be a string');
  assert(Array.isArray(value.pages), 'pages must be an array');

  for (let i = 0; i < value.pages.length; i += 1) {
    const page = value.pages[i];
    assert(isRecord(page), `pages[${i}] must be an object`);
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
