// Vite config for the SPA + test runner.
import { fileURLToPath } from 'node:url';

import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Build output should be deployable under any sub-path (e.g. /docs/).
  // Using a relative base prevents absolute "/assets/..." URLs in index.html.
  //
  // Keep dev on "/" because Vite's dev server assumes an absolute base.
  base: command === 'build' ? './' : '/',
  plugins: [preact()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}));
