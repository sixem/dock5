import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { build } from 'vite';
import { expect, it } from 'vitest';
import { docsAssetsPlugin } from './docsAssets.ts';
import { siteTitlePlugin } from './siteTitle.ts';

it('copies staged assets to a custom Vite output and replaces stale public assets', async () => {
  // Vite resolves inputs to real paths; its root must match even when TEMP is an alias.
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-build-')),
  );
  try {
    const source = path.join(root, 'staged');
    const outDir = path.join(root, 'custom-output');
    const manifestPath = path.join(root, 'manifest.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify({ title: 'Project & </title><script>bad</script>' }),
    );
    await fs.mkdir(source);
    await fs.mkdir(path.join(root, 'public/docs-assets'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'index.html'),
      '<title>dock5</title><h1>Build fixture</h1>',
    );
    await fs.writeFile(path.join(source, 'guide.pdf'), 'current asset');
    await fs.writeFile(
      path.join(root, 'public/docs-assets/stale.pdf'),
      'stale asset',
    );
    const runBuild = () =>
      build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [docsAssetsPlugin(source), siteTitlePlugin(manifestPath)],
        build: { outDir },
      });

    await runBuild();
    expect(
      await fs.readFile(path.join(outDir, 'index.html'), 'utf8'),
    ).toContain(
      '<title>Project &amp; &lt;/title&gt;&lt;script&gt;bad&lt;/script&gt;</title>',
    );
    expect(
      await fs.readFile(path.join(outDir, 'docs-assets/guide.pdf'), 'utf8'),
    ).toBe('current asset');
    await expect(
      fs.access(path.join(outDir, 'docs-assets/stale.pdf')),
    ).rejects.toThrow();
    await expect(fs.access(path.join(root, 'dist'))).rejects.toThrow();

    // A subsequent build without docs assets must not ship public leftovers.
    await fs.rm(source, { recursive: true });
    await runBuild();
    await expect(fs.access(path.join(outDir, 'docs-assets'))).rejects.toThrow();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
