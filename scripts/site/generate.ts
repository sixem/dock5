// Build-time docs generator.
//
// This produces a JSON manifest consumed by the SPA with pre-rendered, safe HTML.
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseGenerateArgs } from '../lib/args.ts';
import { CONFIG_FILE, loadSiteConfig } from '../lib/config.ts';
import { type PageOptions, readPageOptions } from '../lib/pageOptions.ts';

import type { HeadingEntry } from './markdown/compile.ts';
import { compileMarkdown } from './markdown/compile.ts';

const DEFAULT_OUT_FILE = path.join('src', 'generated', 'docs.json');
const DEFAULT_ASSETS_DIR = path.join('public', 'docs-assets');
const DEFAULT_ASSETS_BASE = 'docs-assets';
const printHelp = () => {
  // Keep this short; full docs can live in README/docs later.
  // A leading "--" separator is optional in pnpm scripts.
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
      '  --assetsDir       Copy non-Markdown files here (defaults to public/docs-assets)',
      '  --assetsBase      URL prefix for copied assets (defaults to docs-assets)',
      '  --base            Reserved (future: base URL, e.g. for GitHub Pages)',
    ].join('\n'),
  );
};

export const extractTitle = (markdown: string, fallback: string) => {
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

  // HTML <h1> (common in docs copied from READMEs).
  const htmlH1 = markdown.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (htmlH1?.[1]) {
    const text = htmlH1[1]
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) return text;
  }

  // First H1.
  const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
  if (h1?.[1]) return h1[1].trim();

  return fallback;
};

const humanizeFromFilename = (fileName: string) => {
  const base = fileName.replace(/\.md$/i, '');
  const spaced = base.replace(/[-_]+/g, ' ');
  return spaced.length > 0 ? spaced[0].toUpperCase() + spaced.slice(1) : base;
};

const toPosixRelPath = (relativePath: string) =>
  relativePath.split(path.sep).join('/').replaceAll('\\', '/');

const dirKey = (posixRelPathDir: string) =>
  posixRelPathDir.split('/').filter(Boolean).join('/').toLowerCase();

const makeToSlug = ({
  indexDirs,
}: {
  // Normalized (lowercased) directories that contain an index.md page.
  indexDirs: Set<string>;
}) => {
  return (relativePath: string) => {
    const posixRel = toPosixRelPath(relativePath);
    const parts = posixRel.split('/').filter(Boolean);

    const fileName = parts.pop() ?? '';
    const dir = parts.join('/');

    const name = fileName.replace(/\.md$/i, '');
    const nameLower = name.toLowerCase();

    const dirNormalized = dirKey(dir);

    // Collapse "index.md" to the folder route.
    if (nameLower === 'index') {
      return dir ? `/${dir}` : '/';
    }

    // If a folder doesn't define an index.md, treat README.md as the folder index.
    // This mirrors common repo conventions and keeps "docs as project docs" ergonomic.
    if (nameLower === 'readme' && !indexDirs.has(dirNormalized)) {
      return dir ? `/${dir}` : '/';
    }

    // Keep non-special file names stable, but normalize README to lowercase so
    // links like "./README.md" and "./readme.md" resolve consistently.
    const leaf = nameLower === 'readme' ? 'readme' : name;

    const raw = `/${dir ? `${dir}/` : ''}${leaf}`;
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  };
};

const listMarkdownFiles = async (dir: string) => {
  const results: string[] = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', '.vite']);

  const walk = async (current: string) => {
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

const listAssetFiles = async (dir: string) => {
  const results: string[] = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', '.vite']);

  const walk = async (current: string) => {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(current, entry.name);
      if (current === dir && entry.name === CONFIG_FILE) continue;
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && !entry.name.toLowerCase().endsWith('.md')) {
        results.push(fullPath);
      }
    }
  };

  await walk(dir);
  return results;
};

const ensureDirForFile = async (filePath: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

type GeneratedPage = PageOptions & {
  slug: string;
  title: string;
  html: string;
  headings: HeadingEntry[];
};

export const generate = async ({
  inputDir,
  outFile,
  assetsDir = DEFAULT_ASSETS_DIR,
  assetsBase = DEFAULT_ASSETS_BASE,
}: {
  inputDir: string;
  outFile: string;
  assetsDir?: string | null;
  assetsBase?: string | null;
}) => {
  const absInputDir = path.resolve(inputDir);
  const absOutFile = path.resolve(outFile);
  const config = await loadSiteConfig(absInputDir);

  const absAssetsDir = assetsDir ? path.resolve(assetsDir) : null;
  if (
    absAssetsDir &&
    (absAssetsDir === absInputDir ||
      absAssetsDir.startsWith(`${absInputDir}${path.sep}`))
  ) {
    throw new Error(
      `assetsDir must not be inside inputDir (avoids infinite recursion): ${assetsDir}`,
    );
  }

  const isExcluded = (file: string) => {
    const rel = toPosixRelPath(path.relative(absInputDir, file));
    return config.exclude.some(
      (entry) => rel === entry || rel.startsWith(`${entry}/`),
    );
  };
  const sources = new Map<string, { markdown: string; options: PageOptions }>();
  for (const file of await listMarkdownFiles(absInputDir)) {
    if (isExcluded(file)) continue;
    const markdown = await fs.readFile(file, 'utf8');
    const options = readPageOptions(markdown, path.relative(absInputDir, file));
    if (!options.draft) sources.set(file, { markdown, options });
  }
  const files = [...sources.keys()];

  const indexDirs = new Set<string>();
  for (const filePath of files) {
    const rel = toPosixRelPath(path.relative(absInputDir, filePath));
    const parts = rel.split('/').filter(Boolean);
    const fileName = parts.pop() ?? '';
    const dir = parts.join('/');

    const nameLower = fileName.replace(/\.md$/i, '').toLowerCase();
    if (nameLower === 'index') indexDirs.add(dirKey(dir));
  }

  const toSlug = makeToSlug({ indexDirs });

  const pages: GeneratedPage[] = [];
  for (const [filePath, { markdown, options }] of sources) {
    const rel = path.relative(absInputDir, filePath);
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
      assetsBase,
    });

    if (pages.some((page) => page.slug === slug))
      throw new Error(`Duplicate page route: ${slug}`);
    pages.push({
      ...options,
      slug,
      title,
      html: compiled.html,
      headings: compiled.headings,
    });
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));

  const assets = (await listAssetFiles(absInputDir)).filter(
    (file) => !isExcluded(file),
  );
  const assetPaths = new Set(
    assets.map((file) => toPosixRelPath(path.relative(absInputDir, file))),
  );
  const assetUrl = (key: 'logo' | 'favicon') => {
    const file = config[key];
    if (!file) return null;
    if (!assetPaths.has(file))
      throw new Error(
        `Invalid ${CONFIG_FILE}: ${key} file not found or excluded: ${file}`,
      );
    const encoded = file.split('/').map(encodeURIComponent).join('/');
    return assetsBase ? `${assetsBase.replace(/\/$/, '')}/${encoded}` : encoded;
  };
  const manifest = {
    navigation: config.navigation,
    defaultTheme: config.defaultTheme,
    description: config.description,
    logo: assetUrl('logo'),
    favicon: assetUrl('favicon'),
    links: config.links,
    title:
      config.title ??
      (pages.find((page) => page.slug === '/')?.title.trim() || 'dock5'),
    pages,
  };

  const warnings = new Set<string>();
  const checkLink = (href: string, source: string) => {
    if (!href.startsWith('#/')) return;
    const [route, fragment] = href.slice(1).split('#');
    const target = pages.find(
      (page) => page.slug === (route.replace(/\/$/, '') || '/'),
    );
    if (!target) warnings.add(`${source}: missing page ${href}`);
    else if (
      fragment &&
      !target.headings.some((heading) => heading.id === fragment)
    )
      warnings.add(`${source}: missing heading ${href}`);
  };
  for (const page of pages) {
    for (const match of page.html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
      checkLink(
        match[1]
          .replaceAll('&amp;', '&')
          .replaceAll('&quot;', '"')
          .replaceAll('&#39;', "'"),
        page.slug,
      );
    }
  }
  for (const link of config.links) checkLink(link.href, CONFIG_FILE);
  for (const route of Object.keys(config.navigation)) {
    if (
      !pages.some(
        (page) => page.slug === route || page.slug.startsWith(`${route}/`),
      )
    )
      warnings.add(`${CONFIG_FILE}: navigation route has no pages: ${route}`);
  }
  for (const warning of warnings) console.warn(`Warning: ${warning}`);

  let assetCount = 0;
  if (absAssetsDir && assetsBase) {
    for (const assetPath of assets) {
      const rel = path.relative(absInputDir, assetPath);
      const dest = path.join(absAssetsDir, rel);
      await ensureDirForFile(dest);
      await fs.copyFile(assetPath, dest);
      assetCount += 1;
    }
  }

  await ensureDirForFile(absOutFile);
  await fs.writeFile(
    absOutFile,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  return {
    absInputDir,
    absOutFile,
    pageCount: pages.length,
    assetCount,
    warnings: [...warnings],
  };
};

export const runCli = async (argv: string[] = process.argv.slice(2)) => {
  const { opts, help } = parseGenerateArgs(argv, {
    defaultOutFile: DEFAULT_OUT_FILE,
    defaultAssetsDir: DEFAULT_ASSETS_DIR,
    defaultAssetsBase: DEFAULT_ASSETS_BASE,
  });
  if (help) return printHelp();

  const result = await generate({
    inputDir: opts.inputDir ?? 'docs',
    outFile: opts.outFile,
    assetsDir: opts.assetsDir,
    assetsBase: opts.assetsBase,
  });

  console.log(
    `Generated ${result.pageCount} page(s) from "${opts.inputDir}" -> ${path.relative(process.cwd(), result.absOutFile)} (assets: ${result.assetCount})`,
  );
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
