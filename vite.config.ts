// Vite config for the SPA + test runner.
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

const srcRoot = fileURLToPath(new URL('./src', import.meta.url));
const defaultManifestPath = fileURLToPath(
  new URL('./src/generated/docs.json', import.meta.url),
);

const manifestPath = process.env.DOCK5_MANIFEST_FILE
  ? path.resolve(process.cwd(), process.env.DOCK5_MANIFEST_FILE)
  : defaultManifestPath;

export default defineConfig(({ command }) => ({
  // Build output should be deployable under any sub-path (e.g. /docs/).
  // Using a relative base prevents absolute "/assets/..." URLs in index.html.
  //
  // Keep dev on "/" because Vite's dev server assumes an absolute base.
  base: command === 'build' ? './' : '/',
  plugins: [preact()],
  resolve: {
    alias: [
      {
        find: '@/generated/docs.json',
        replacement: manifestPath,
      },
      {
        find: '@',
        replacement: srcRoot,
      },
    ],
  },
}));
