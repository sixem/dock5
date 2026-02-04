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

export const docsManifest = docsManifestJson as DocsManifest;
