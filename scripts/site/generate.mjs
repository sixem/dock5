// Build-time docs generator.
//
// This produces a JSON manifest consumed by the SPA with pre-rendered, safe HTML.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { compileMarkdown } from './markdown/compile.mjs';

const DEFAULT_OUT_FILE = path.join('src', 'generated', 'docs.json');

const parseArgs = (argv) => {
  const opts = {
    inputDir: null,
    outFile: DEFAULT_OUT_FILE,
    base: null,
    outDir: null,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg) continue;
    if (arg === '--help' || arg === '-h')
      return { opts, positional, help: true };

    if (arg === '--input' || arg === '--docs') {
      opts.inputDir = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === '--outFile') {
      opts.outFile = argv[i + 1] ?? DEFAULT_OUT_FILE;
      i += 1;
      continue;
    }

    if (arg === '--outDir') {
      opts.outDir = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === '--base') {
      opts.base = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    positional.push(arg);
  }

  if (!opts.inputDir && positional.length > 0) {
    opts.inputDir = positional[0];
  }

  if (!opts.inputDir) {
    opts.inputDir = 'docs';
  }

  return { opts, positional, help: false };
};

const printHelp = () => {
  // Keep this short; full docs can live in README/docs later.
  // pnpm scripts require the "--" separator for args.
  console.log(
    [
      'dock5 generator',
      '',
      'Usage:',
      '  pnpm generate -- <docsDir>',
      '  pnpm generate -- --input <docsDir> --outFile <file>',
      '',
      'Options:',
      '  --input, --docs   Docs folder (defaults to "docs")',
      '  --outFile         Output manifest file (defaults to src/generated/docs.json)',
      '  --outDir          Reserved (future: static bundle output dir)',
      '  --base            Reserved (future: base URL, e.g. for GitHub Pages)',
    ].join('\n'),
  );
};

const extractTitle = (markdown, fallback) => {
  // Frontmatter title:
  // ---
  // title: Hello
  // ---
  const frontmatterMatch = markdown.match(
    /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/,
  );
  if (frontmatterMatch?.[1]) {
    const titleLine = frontmatterMatch[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().startsWith('title:'));
    if (titleLine) {
      const raw = titleLine.slice('title:'.length).trim();
      const unquoted = raw.replace(/^['"]|['"]$/g, '').trim();
      if (unquoted) return unquoted;
    }
  }

  // First H1.
  const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
  if (h1?.[1]) return h1[1].trim();

  return fallback;
};

const humanizeFromFilename = (fileName) => {
  const base = fileName.replace(/\.md$/i, '');
  const spaced = base.replace(/[-_]+/g, ' ');
  return spaced.length > 0 ? spaced[0].toUpperCase() + spaced.slice(1) : base;
};

const toSlug = (relativePath) => {
  const withForwardSlashes = relativePath.split(path.sep).join('/');
  const withoutExt = withForwardSlashes.replace(/\.md$/i, '');

  // Collapse "/index" to the folder route.
  const withoutIndex =
    withoutExt === 'index'
      ? ''
      : withoutExt.endsWith('/index')
        ? withoutExt.slice(0, -'/index'.length)
        : withoutExt;

  const raw = `/${withoutIndex}`;
  if (raw === '/') return '/';

  // No trailing slash (except root).
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const listMarkdownFiles = async (dir) => {
  const results = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', '.vite']);

  const walk = async (current) => {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        results.push(fullPath);
      }
    }
  };

  await walk(dir);
  return results;
};

const ensureDirForFile = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

export const generate = async ({ inputDir, outFile }) => {
  const absInputDir = path.resolve(inputDir);
  const absOutFile = path.resolve(outFile);

  const files = await listMarkdownFiles(absInputDir);

  const pages = [];
  for (const filePath of files) {
    const rel = path.relative(absInputDir, filePath);
    const markdown = await fs.readFile(filePath, 'utf8');
    const title = extractTitle(
      markdown,
      humanizeFromFilename(path.basename(filePath)),
    );

    const slug = toSlug(rel);
    const compiled = compileMarkdown({
      markdown,
      currentRelPath: rel,
      currentSlug: slug,
      toSlug,
    });

    pages.push({
      slug,
      title,
      html: compiled.html,
      headings: compiled.headings,
    });
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));

  const manifest = {
    inputDir,
    pages,
  };

  await ensureDirForFile(absOutFile);
  await fs.writeFile(
    absOutFile,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  return { absInputDir, absOutFile, pageCount: pages.length };
};

export const runCli = async (argv = process.argv.slice(2)) => {
  const { opts, help } = parseArgs(argv);
  if (help) return printHelp();

  const result = await generate({
    inputDir: opts.inputDir,
    outFile: opts.outFile,
  });

  console.log(
    `Generated ${result.pageCount} page(s) from "${opts.inputDir}" -> ${path.relative(process.cwd(), result.absOutFile)}`,
  );
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
