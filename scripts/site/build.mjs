// Build runner that generates docs first, then runs `vite build`.

import { parseDocsArgs } from '../lib/args.mjs';
import { runPnpm } from '../lib/pnpm.mjs';
import { generate } from './generate.mjs';

const main = async () => {
  const { docsDir, rest: viteArgs } = parseDocsArgs(process.argv.slice(2), {
    defaultDocsDir: 'examples/docs',
  });

  await generate({ inputDir: docsDir, outFile: 'src/generated/docs.json' });

  await runPnpm(['exec', 'vite', 'build', ...viteArgs]);
};

await main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
