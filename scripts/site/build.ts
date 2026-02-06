// Build runner that generates docs first, then runs `vite build`.

import { parseDocsArgs } from '../lib/args.ts';
import { runPnpm } from '../lib/pnpm.ts';
import { generate } from './generate.ts';

const printHelp = () => {
  console.log(
    [
      'dock5 build',
      '',
      'Usage:',
      '  pnpm build',
      '  pnpm build -- --docs <docsDir> [-- <vite args...>]',
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

  await generate({ inputDir: docsDir, outFile: 'src/generated/docs.json' });

  await runPnpm(['exec', 'vite', 'build', ...viteArgs]);
};

await main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
