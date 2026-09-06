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

it('resolves identity assets relative to the docs folder and rejects missing files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-identity-'));
  try {
    const inputDir = path.join(root, 'docs');
    const outFile = path.join(root, 'manifest.json');
    const assetsDir = path.join(root, 'assets');
    await fs.mkdir(path.join(inputDir, 'images'), { recursive: true });
    await fs.writeFile(path.join(inputDir, 'index.md'), '# Root');
    await fs.writeFile(path.join(inputDir, 'images', 'my logo.svg'), '<svg/>');
    await fs.writeFile(path.join(inputDir, 'images', 'icon.png'), 'png');
    await fs.writeFile(
      path.join(inputDir, 'dock5.config.json'),
      JSON.stringify({
        description: 'Project docs',
        logo: './images/my logo.svg',
        favicon: './images/icon.png',
        links: [
          { label: 'GitHub', href: 'https://github.com/example/project' },
        ],
      }),
    );
    await generate({ inputDir, outFile, assetsDir, assetsBase: 'docs-assets' });
    expect(JSON.parse(await fs.readFile(outFile, 'utf8'))).toMatchObject({
      title: 'Root',
      description: 'Project docs',
      logo: 'docs-assets/images/my%20logo.svg',
      favicon: 'docs-assets/images/icon.png',
      links: [{ label: 'GitHub', href: 'https://github.com/example/project' }],
    });
    expect(
      await fs.readFile(path.join(assetsDir, 'images', 'my logo.svg'), 'utf8'),
    ).toBe('<svg/>');
    await expect(
      fs.access(path.join(assetsDir, 'dock5.config.json')),
    ).rejects.toThrow();
    await fs.rm(path.join(inputDir, 'images', 'icon.png'));
    await expect(generate({ inputDir, outFile, assetsDir })).rejects.toThrow(
      'favicon file not found',
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

it('excludes drafts and private folders, retains hidden pages, and reports missing links', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dock5-navigation-'));
  try {
    const inputDir = path.join(root, 'docs');
    const outFile = path.join(root, 'manifest.json');
    const assetsDir = path.join(root, 'assets');
    await fs.mkdir(path.join(inputDir, 'private'), { recursive: true });
    await fs.mkdir(path.join(inputDir, 'guides'));
    await fs.writeFile(
      path.join(inputDir, 'dock5.config.json'),
      JSON.stringify({
        exclude: ['private/'],
        navigation: { '/guides': { label: 'Learn', order: 1 } },
        defaultTheme: 'light',
      }),
    );
    await fs.writeFile(
      path.join(inputDir, 'index.md'),
      '# Home\n\n[Guides](./guides/) [Draft](./draft.md) [Hidden](./hidden.md) [Missing heading](./guides/#missing)',
    );
    await fs.writeFile(
      path.join(inputDir, 'draft.md'),
      '---\ndraft: true\n---\n# Draft',
    );
    await fs.writeFile(
      path.join(inputDir, 'hidden.md'),
      '---\nsidebarHidden: true\n---\n# Hidden',
    );
    await fs.writeFile(
      path.join(inputDir, 'guides/README.md'),
      '---\nsidebarLabel: Start\nsidebarOrder: 2\n---\n# Guide\n\n[Home](/index.md)\n\n## Install',
    );
    await fs.writeFile(path.join(inputDir, 'private/index.md'), '# Private');
    await fs.writeFile(path.join(inputDir, 'private/secret.txt'), 'private');
    const result = await generate({ inputDir, outFile, assetsDir });
    const manifest = JSON.parse(await fs.readFile(outFile, 'utf8'));
    expect(manifest.pages.map((page: { slug: string }) => page.slug)).toEqual([
      '/',
      '/guides',
      '/hidden',
    ]);
    expect(manifest.defaultTheme).toBe('light');
    expect(manifest.navigation['/guides'].label).toBe('Learn');
    expect(manifest.pages[0].html).toContain('href="#/guides"');
    expect(manifest.pages[1]).toMatchObject({
      sidebarLabel: 'Start',
      sidebarOrder: 2,
    });
    expect(manifest.pages[1].html).toContain('href="#/"');
    expect(manifest.pages[2].sidebarHidden).toBe(true);
    expect(result.warnings).toEqual([
      '/: missing page #/draft',
      '/: missing heading #/guides#missing',
    ]);
    await expect(
      fs.access(path.join(assetsDir, 'private/secret.txt')),
    ).rejects.toThrow();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
