// Build runner that generates docs first, then runs `vite build`.
import { spawn } from 'node:child_process';

import { generate } from './generate.mjs';

function parseArgs(argv) {
  let docsDir = 'examples/docs';
  const viteArgs = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--docs' || arg === '--input') {
      docsDir = argv[i + 1] ?? docsDir;
      i += 1;
      continue;
    }

    viteArgs.push(arg);
  }

  return { docsDir, viteArgs };
}

function pnpmBin() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function runPnpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pnpmBin(), args, {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): pnpm ${args.join(' ')}`));
    });
    child.on('error', reject);
  });
}

try {
  const { docsDir, viteArgs } = parseArgs(process.argv.slice(2));

  await generate({ inputDir: docsDir, outFile: 'src/generated/docs.json' });

  await runPnpm(['exec', 'vite', 'build', ...viteArgs]);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

