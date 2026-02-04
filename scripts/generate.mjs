// Compatibility wrapper. New home: scripts/site/generate.mjs
export * from './site/generate.mjs';

import { pathToFileURL } from 'node:url';
import { runCli } from './site/generate.mjs';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
