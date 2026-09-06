import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractTitle, generate } from './generate.ts';

describe('extractTitle', () => {
  it('prefers frontmatter title', () => {
    const markdown = ['---', 'title: Hello', '---', '', '# Not used'].join(
      '\n',
    );
    expect(extractTitle(markdown, 'Fallback')).toBe('Hello');
  });

  it('uses HTML <h1> text when present', () => {
    const markdown = [
      '<h1 align="center">Configuration</h1>',
      '',
      '# Advanced',
    ].join('\n');
    expect(extractTitle(markdown, 'Fallback')).toBe('Configuration');
  });

  it('ignores HTML <h1> with no text', () => {
    const markdown = ['<h1><img src="./logo.svg"></h1>', '', '# Title'].join(
      '\n',
    );
    expect(extractTitle(markdown, 'Fallback')).toBe('Title');
  });

  it('falls back when no title is found', () => {
    expect(extractTitle('Just text', 'Fallback')).toBe('Fallback');
  });
});

describe('generate (assets)', () => {
  it('copies non-Markdown assets and rewrites relative URLs', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-'));
    try {
      const inputDir = path.join(root, 'docs');
      const outFile = path.join(root, 'out', 'docs.json');
      const assetsDir = path.join(root, 'assets');

      await fs.mkdir(path.join(inputDir, 'img'), { recursive: true });
      await fs.mkdir(path.join(inputDir, 'files'), { recursive: true });

      await fs.writeFile(
        path.join(inputDir, 'index.md'),
        [
          '# Title',
          '',
          '![Logo](./img/logo.png)',
          '',
          '[PDF](./files/x.pdf)',
        ].join('\n'),
        'utf8',
      );

      await fs.writeFile(path.join(inputDir, 'img', 'logo.png'), 'png', 'utf8');
      await fs.writeFile(path.join(inputDir, 'files', 'x.pdf'), 'pdf', 'utf8');

      await generate({
        inputDir,
        outFile,
        assetsDir,
        assetsBase: 'docs-assets',
      });

      const manifestRaw = await fs.readFile(outFile, 'utf8');
      const manifest = JSON.parse(manifestRaw) as {
        pages: Array<{ slug: string; html: string }>;
      };

      expect(manifest.pages[0]?.html ?? '').toContain(
        'src="docs-assets/img/logo.png"',
      );
      expect(manifest.pages[0]?.html ?? '').toContain(
        'href="docs-assets/files/x.pdf"',
      );

      await expect(
        fs.stat(path.join(assetsDir, 'img', 'logo.png')),
      ).resolves.toBeDefined();
      await expect(
        fs.stat(path.join(assetsDir, 'files', 'x.pdf')),
      ).resolves.toBeDefined();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe('generate (README index fallback)', () => {
  it('treats README.md as "/" when index.md is missing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-'));
    try {
      const inputDir = path.join(root, 'docs');
      const outFile = path.join(root, 'out', 'docs.json');

      await fs.mkdir(inputDir, { recursive: true });
      await fs.writeFile(
        path.join(inputDir, 'README.md'),
        ['# Hello', '', 'Welcome'].join('\n'),
        'utf8',
      );

      await generate({
        inputDir,
        outFile,
        assetsDir: null,
        assetsBase: null,
      });

      const manifestRaw = await fs.readFile(outFile, 'utf8');
      const manifest = JSON.parse(manifestRaw) as {
        pages: Array<{ slug: string; title: string }>;
      };

      expect(manifest.pages.map((p) => p.slug)).toEqual(['/']);
      expect(manifest.pages[0]?.title).toBe('Hello');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('does not override index.md when both exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-'));
    try {
      const inputDir = path.join(root, 'docs');
      const outFile = path.join(root, 'out', 'docs.json');

      await fs.mkdir(inputDir, { recursive: true });
      await fs.writeFile(
        path.join(inputDir, 'index.md'),
        ['# Index'].join('\n'),
        'utf8',
      );
      await fs.writeFile(
        path.join(inputDir, 'README.md'),
        ['# Readme'].join('\n'),
        'utf8',
      );

      await generate({
        inputDir,
        outFile,
        assetsDir: null,
        assetsBase: null,
      });

      const manifestRaw = await fs.readFile(outFile, 'utf8');
      const manifest = JSON.parse(manifestRaw) as {
        pages: Array<{ slug: string }>;
      };

      expect(manifest.pages.map((p) => p.slug).sort()).toEqual([
        '/',
        '/readme',
      ]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe('generate (site title)', () => {
  it.each([
    { config: undefined, rootFile: 'index.md', expected: 'Root title' },
    { config: undefined, rootFile: 'README.md', expected: 'Root title' },
    { config: undefined, rootFile: null, expected: 'dock5' },
    { config: '{}', rootFile: 'index.md', expected: 'Root title' },
    {
      config: '{"title":" My Project "}',
      rootFile: 'index.md',
      expected: 'My Project',
    },
  ])(
    'resolves $expected from $rootFile and $config',
    async ({ config, rootFile, expected }) => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-title-'));
      try {
        const inputDir = path.join(root, 'docs');
        const outFile = path.join(root, 'manifest.json');
        const assetsDir = path.join(root, 'assets');
        await fs.mkdir(inputDir);
        if (rootFile)
          await fs.writeFile(path.join(inputDir, rootFile), '# Root title');
        if (config !== undefined)
          await fs.writeFile(path.join(inputDir, 'dock5.config.json'), config);
        await generate({ inputDir, outFile, assetsDir });
        expect(JSON.parse(await fs.readFile(outFile, 'utf8')).title).toBe(
          expected,
        );
        await expect(
          fs.access(path.join(assetsDir, 'dock5.config.json')),
        ).rejects.toThrow();
        // Configuration changes must be picked up on subsequent generation.
        await fs.writeFile(
          path.join(inputDir, 'dock5.config.json'),
          '{"title":"Updated"}',
        );
        await generate({ inputDir, outFile, assetsDir });
        expect(JSON.parse(await fs.readFile(outFile, 'utf8')).title).toBe(
          'Updated',
        );
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  it.each(['{', 'null', '[]', '{"title":42}', '{"title":" "}'])(
    'rejects invalid config %s',
    async (config) => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-title-'));
      try {
        await fs.writeFile(path.join(root, 'dock5.config.json'), config);
        await expect(
          generate({
            inputDir: root,
            outFile: path.join(root, 'out.json'),
            assetsDir: null,
          }),
        ).rejects.toThrow('Invalid dock5.config.json');
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );
});
