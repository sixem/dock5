import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Plugin } from 'vite';

// Copy after Vite's public directory so assets from earlier dev sessions cannot
// leak into a build. Use the actual output directory, including CLI overrides.
export const docsAssetsPlugin = (sourceDir: string): Plugin => ({
  name: 'dock5-docs-assets',
  apply: 'build',
  async writeBundle(output) {
    if (!output.dir) throw new Error('Dock5 requires a build output directory');
    const target = path.join(output.dir, 'docs-assets');
    await fs.rm(target, { recursive: true, force: true });
    try {
      await fs.access(sourceDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    await fs.cp(sourceDir, target, { recursive: true });
  },
});
