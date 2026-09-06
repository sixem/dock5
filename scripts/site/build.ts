// Build runner that generates docs first, then runs `vite build`.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { parseDocsArgs } from '../lib/args.ts';
import { runPnpm } from '../lib/pnpm.ts';
import { generate } from './generate.ts';

const STAGING_ROOT = path.join('.dock5', 'build');
const STAGING_MANIFEST = path.join(STAGING_ROOT, 'generated', 'docs.json');
const STAGING_ASSETS_DIR = path.join(STAGING_ROOT, 'docs-assets');
const printHelp = () => {
  console.log(
    [
      'dock5 build',
      '',
      'Usage:',
      '  pnpm build',
      '  pnpm build -- <docsDir> [vite args...]',
      '  pnpm build -- --docs <docsDir> [vite args...]',
      '  pnpm build -- --docs <docsDir> -- <vite args...>',
      '',
      'Options:',
      '  --docs, --input   Docs folder (defaults to "docs")',
      '  -h, --help        Show this help',
    ].join('\n'),
  );
};

const main = async () => {
  const {
    docsDir,
    rest: viteArgs,
    help,
  } = parseDocsArgs(process.argv.slice(2), {
    defaultDocsDir: 'docs',
  });

  if (help) {
    printHelp();
    return;
  }

  // Build in a staging area so external docs builds don't mutate src/generated.
  await fs.rm(STAGING_ROOT, { recursive: true, force: true });
  await generate({
    inputDir: docsDir,
    outFile: STAGING_MANIFEST,
    assetsDir: STAGING_ASSETS_DIR,
    assetsBase: 'docs-assets',
  });

  await runPnpm(['exec', 'vite', 'build', ...viteArgs], {
    env: {
      DOCK5_MANIFEST_FILE: STAGING_MANIFEST,
      DOCK5_ASSETS_DIR: STAGING_ASSETS_DIR,
    },
  });
};

await main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
