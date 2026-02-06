import { describe, expect, it } from 'vitest';

import { compileMarkdown } from './compile.ts';

const compile = (
  markdown: string,
  {
    currentRelPath = 'page.md',
    currentSlug = '/page',
    assetsBase = null,
  }: {
    currentRelPath?: string;
    currentSlug?: string;
    assetsBase?: string | null;
  } = {},
) =>
  compileMarkdown({
    markdown,
    currentRelPath,
    currentSlug,
    toSlug: (p) => `/${p.replace(/\\.md$/i, '').replaceAll('\\', '/')}`,
    assetsBase,
  });

describe('compileMarkdown (tables)', () => {
  it('renders pipe tables as <table>', () => {
    const result = compile(
      ['Intro', '', '| A | B |', '|---|---|', '| 1 | 2 |'].join('\n'),
    );

    expect(result.html).toContain('<p>Intro</p>');
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('<thead>');
    expect(result.html).toContain('<th');
    expect(result.html).toContain('A');
    expect(result.html).toContain('<tbody>');
    expect(result.html).toContain('<td');
    expect(result.html).toContain('1');
  });

  it('does not merge table rows into paragraphs', () => {
    const result = compile(
      ['Intro', '| A | B |', '|---|---|', '| 1 | 2 |'].join('\n'),
    );

    expect(result.html).toContain('<p>Intro</p>');
    expect(result.html).toContain('<table>');
    expect(result.html).not.toContain('<p>| A | B |');
  });

  it('supports alignment markers', () => {
    const result = compile(
      ['| A | B | C |', '|:---|---:|:---:|', '| 1 | 2 | 3 |'].join('\n'),
    );

    expect(result.html).toContain('text-align: left');
    expect(result.html).toContain('text-align: right');
    expect(result.html).toContain('text-align: center');
  });

  it('preserves backslashes in cell content', () => {
    const result = compile(
      ['| Pattern |', '|---|', '| `/^.{1,10}\\\\.(jpg|png)$/` |'].join('\n'),
    );

    expect(result.html).toContain('/^.{1,10}\\\\.(jpg|png)$/');
  });
});

describe('compileMarkdown (html blocks)', () => {
  it('skips an HTML <h1> title (text)', () => {
    const result = compile(
      [
        '<h1 align="center">Configuration</h1>',
        '',
        '<p align="center">Tagline</p>',
        '',
        '<br/>',
        '',
        'Hello',
      ].join('\n'),
    );

    expect(result.html).toContain('Tagline');
    expect(result.html).toContain('Hello');
    expect(result.html).not.toContain('&lt;h1');
    expect(result.html).not.toContain('&lt;br');
    expect(result.html).not.toContain('<h1');
  });

  it('renders an HTML <h1> that contains an image', () => {
    const result = compile(
      ['<h1 align="center"><img src="./logo.svg"></h1>', '', 'Hello'].join(
        '\n',
      ),
    );

    expect(result.html).toContain('<h1');
    expect(result.html).toContain('text-align: center');
    expect(result.html).toContain('<img');
    expect(result.html).toContain('src="./logo.svg"');
  });

  it('rewrites HTML hash links like "#building" to routes', () => {
    const result = compile('<p>See <a href="#building">building</a>.</p>\n');

    expect(result.html).toContain('href="#/building"');
  });

  it('treats <br> as a safe inline break', () => {
    const result = compile('<p>Hello<br/>World</p>');
    expect(result.html).toContain('Hello<br />World');
  });

  it('escapes unknown HTML by default', () => {
    const result = compile('<script>alert(1)</script>');
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).toContain('&lt;/script&gt;');
  });
});

describe('compileMarkdown (sanitization)', () => {
  it('drops dangerous URL protocols in Markdown links/images', () => {
    const result = compile(
      [
        '[bad](javascript:alert(1))',
        '',
        '![bad](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
      ].join('\n'),
    );

    expect(result.html).toContain('<a href="">bad</a>');
    expect(result.html).toContain('<img src=""');
    expect(result.html).not.toContain('javascript:');
    expect(result.html).not.toContain('data:text/html');
  });

  it('strips event handler attributes from HTML tags', () => {
    const result = compile(
      [
        '<p><a href="https://example.com" onclick="alert(1)">ok</a></p>',
        '<p><img src="./logo.svg" onerror="alert(2)" alt="Logo"></p>',
      ].join('\n'),
    );

    expect(result.html).toContain('href="https://example.com"');
    expect(result.html).toContain('src="./logo.svg"');
    expect(result.html).not.toContain('onclick=');
    expect(result.html).not.toContain('onerror=');
  });

  it('does not preserve arbitrary attributes on allowed block tags', () => {
    const result = compile(
      '<p style="color: red" onclick="alert(1)" align="center">Hello</p>',
    );

    expect(result.html).toContain('<p style="text-align: center">Hello</p>');
    expect(result.html).not.toContain('style="color: red"');
    expect(result.html).not.toContain('onclick=');
  });

  it('escapes unknown HTML tags by default', () => {
    const result = compile('<svg onload="alert(1)">Hi</svg>');

    expect(result.html).toContain('&lt;svg');
    expect(result.html).toContain('&lt;/svg&gt;');
    expect(result.html).not.toContain('<svg');
  });
});

describe('compileMarkdown (assets)', () => {
  it('rewrites relative Markdown images to the assets base', () => {
    const result = compile('![Logo](./images/logo.png)', {
      currentRelPath: 'guides/page.md',
      currentSlug: '/guides/page',
      assetsBase: 'docs-assets',
    });

    expect(result.html).toContain('src="docs-assets/guides/images/logo.png"');
  });

  it('rewrites relative Markdown links to the assets base (non-markdown)', () => {
    const result = compile('[PDF](./files/guide.pdf)', {
      currentRelPath: 'guides/page.md',
      currentSlug: '/guides/page',
      assetsBase: 'docs-assets',
    });

    expect(result.html).toContain('href="docs-assets/guides/files/guide.pdf"');
  });

  it('does not rewrite absolute URLs or hash-router routes', () => {
    const result = compile(
      ['![A](https://example.com/a.png)', '', '[R](#/setup)'].join('\n'),
      { assetsBase: 'docs-assets' },
    );

    expect(result.html).toContain('src="https://example.com/a.png"');
    expect(result.html).toContain('href="#/setup"');
  });
});
