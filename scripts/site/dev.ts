// Dev runner that ensures docs are generated before starting Vite.

import * as path from 'node:path';

import { parseDocsArgs } from '../lib/args.ts';
import { runPnpm } from '../lib/pnpm.ts';
import { watchDocsDir } from '../lib/watchDocs.ts';
import { generate } from './generate.ts';

const OUT_FILE = 'src/generated/docs.json';

const IGNORED_DIR_NAMES = new Set(['node_modules', '.git', 'dist', '.vite']);

const shouldIgnoreWatchPath = (filePath: string) => {
  const segments = filePath.split(/[\\/]+/g).filter(Boolean);
  return segments.some(
    (segment) => segment.startsWith('.') || IGNORED_DIR_NAMES.has(segment),
  );
};

const printHelp = () => {
  console.log(
    [
      'dock5 dev',
      '',
      'Usage:',
      '  pnpm dev',
      '  pnpm dev -- --docs <docsDir> [-- <vite args...>]',
      '',
      'Options:',
      '  --docs, --input   Docs folder (defaults to "docs")',
      '  -h, --help        Show this help',
      '',
      'Notes:',
      '  Use "--" to pass args through pnpm scripts.',
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

  const regenerate = async () => {
    try {
      const result = await generate({ inputDir: docsDir, outFile: OUT_FILE });
      console.log(`[docs] generated ${result.pageCount} page(s)`);
    } catch (err) {
      console.error('[docs] generation failed');
      console.error(err instanceof Error ? err.message : err);
    }
  };

  // Initial generation before the dev server starts.
  await regenerate();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let rerunRequested = false;
  let isClosed = false;

  const scheduleRegenerate = () => {
    if (isClosed) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      if (isClosed) return;
      if (isRunning) {
        rerunRequested = true;
        return;
      }

      isRunning = true;
      await regenerate();
      isRunning = false;

      if (rerunRequested) {
        rerunRequested = false;
        scheduleRegenerate();
      }
    }, 125);
  };

  const watcher = await watchDocsDir({
    dir: docsDir,
    onEvent: ({ eventType, filePath }) => {
      if (eventType === 'error') return;

      if (filePath && shouldIgnoreWatchPath(filePath)) return;

      if (eventType === 'rename') {
        // "rename" covers creates/deletes/renames. We only need to regenerate when:
        // - a Markdown file name changes (page list / slug changes)
        // - a directory changes (may affect page structure)
        if (!filePath) return scheduleRegenerate();

        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.md' || ext === '') scheduleRegenerate();
        return;
      }

      // Only rebuild for Markdown edits.
      if (!filePath || filePath.toLowerCase().endsWith('.md')) {
        scheduleRegenerate();
      }
    },
  });

  console.log(`[docs] watching ${watcher.absDir}`);

  // Start Vite dev server. Keep it as a child process so Ctrl+C works naturally.
  try {
    await runPnpm(['exec', 'vite', ...viteArgs]);
  } finally {
    isClosed = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close();
  }
};

await main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
