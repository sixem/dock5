import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import type { DocsManifest } from '../../src/docs/manifest';
import { buildNavTree, type NavNode } from '../../src/docs/navTree';
import { generate } from './generate';

const examplesDir = fileURLToPath(new URL('../../examples/', import.meta.url));
const visibleRoutes = (nodes: NavNode[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.page ? [node.page.slug] : []),
    ...visibleRoutes(node.children),
  ]);

it.each([
  ['space', 5, 'dark'],
  ['orbit', 4, 'dark'],
  ['fieldnotes', 3, 'light'],
  ['forge', 3, 'dark'],
  ['waypoint', 4, 'light'],
] as const)(
  'generates the %s example with working links and assets',
  async (name, count, theme) => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-example-'));
    try {
      const outFile = path.join(temp, 'manifest.json');
      const assetsDir = path.join(temp, 'assets');
      const result = await generate({
        inputDir: path.join(examplesDir, name),
        outFile,
        assetsDir,
      });
      const manifest: DocsManifest = JSON.parse(
        await fs.readFile(outFile, 'utf8'),
      );
      expect(result.warnings).toEqual([]);
      expect(result.pageCount).toBe(count);
      expect(manifest.defaultTheme).toBe(theme);
      for (const page of manifest.pages) {
        for (const match of page.html.matchAll(
          /(?:src|href)="docs-assets\/([^"]+)"/g,
        )) {
          await fs.access(path.join(assetsDir, decodeURIComponent(match[1])));
        }
      }
      for (const url of [manifest.logo, manifest.favicon]) {
        if (url)
          await fs.access(
            path.join(
              assetsDir,
              decodeURIComponent(url.replace('docs-assets/', '')),
            ),
          );
      }
      await expect(
        fs.access(path.join(assetsDir, 'dock5.config.json')),
      ).rejects.toThrow();
      if (name === 'space') {
        const tree = buildNavTree(manifest.pages, manifest.navigation);
        expect(tree.map((node) => node.key)).toEqual([
          '/',
          '/travel',
          '/facts',
        ]);
        expect(visibleRoutes(tree)).not.toContain('/lost-property');
        expect(
          manifest.pages.some((page) => page.slug === '/lost-property'),
        ).toBe(true);
        expect(manifest.pages.some((page) => page.slug === '/wormholes')).toBe(
          false,
        );
        await expect(
          fs.access(path.join(assetsDir, 'unpublished/budget.txt')),
        ).rejects.toThrow();
      }
      if (name === 'waypoint')
        expect(
          manifest.pages.find((page) => page.slug === '/packing'),
        ).toMatchObject({ outline: false, pagination: false });
      if (name === 'fieldnotes')
        expect(
          manifest.pages.find((page) => page.slug === '/equipment')?.outline,
        ).toBe(true);
      if (name === 'forge') expect(manifest.title).toBe('Forge');
    } finally {
      await fs.rm(temp, { recursive: true, force: true });
    }
  },
);
