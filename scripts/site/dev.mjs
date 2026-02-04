// Dev runner that ensures docs are generated before starting Vite.

import { parseDocsArgs } from '../lib/args.mjs';
import { runPnpm } from '../lib/pnpm.mjs';
import { watchDocsDir } from '../lib/watchDocs.mjs';
import { generate } from './generate.mjs';

const OUT_FILE = 'src/generated/docs.json';

const main = async () => {
  const { docsDir, rest: viteArgs } = parseDocsArgs(process.argv.slice(2), {
    defaultDocsDir: 'examples/docs',
  });

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

  let debounceTimer = null;
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

      // "rename" covers creates/deletes/renames; we regenerate to keep the page list accurate.
      if (eventType === 'rename') return scheduleRegenerate();

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

await main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
