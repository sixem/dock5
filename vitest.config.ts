// Vitest config is kept separate from Vite config to avoid coupling test configuration
// to the Vite plugin graph.
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // "happy-dom" is a fast, lightweight DOM implementation.
    environment: 'happy-dom',
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
