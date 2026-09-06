import { describe, expect, it } from 'vitest';

import { parseDocsArgs, parseGenerateArgs } from './args.ts';

describe('parseDocsArgs', () => {
  it.each([
    ['--', './my-docs'],
    ['--', '--docs', './my-docs'],
    ['--input', './my-docs'],
  ])('accepts docs selection with %j', (...args) => {
    expect(parseDocsArgs(args, { defaultDocsDir: 'docs' })).toEqual({
      docsDir: './my-docs',
      rest: [],
      help: false,
    });
  });

  it.each([
    ['--docs', './my-docs', '--port', '5174'],
    ['./my-docs', '--port', '5174'],
    ['--', '--docs', './my-docs', '--', '--port', '5174'],
  ])('preserves Vite flag values with %j', (...args) => {
    expect(parseDocsArgs(args, { defaultDocsDir: 'docs' }).rest).toEqual([
      '--port',
      '5174',
    ]);
  });

  it('does not consume a Vite flag value as the docs directory', () => {
    expect(
      parseDocsArgs(['--host', '127.0.0.1'], { defaultDocsDir: 'docs' }),
    ).toEqual({
      docsDir: 'docs',
      rest: ['--host', '127.0.0.1'],
      help: false,
    });
  });

  it('keeps forwarded flags on both sides of a separator', () => {
    expect(
      parseDocsArgs(['./my-docs', '--open', '--', '--host', '127.0.0.1'], {
        defaultDocsDir: 'docs',
      }).rest,
    ).toEqual(['--open', '--host', '127.0.0.1']);
  });
  it('defaults docsDir and forwards unknown args', () => {
    const result = parseDocsArgs(['--open'], { defaultDocsDir: 'docs' });
    expect(result.docsDir).toBe('docs');
    expect(result.rest).toEqual(['--open']);
    expect(result.help).toBe(false);
  });

  it('accepts a positional docsDir', () => {
    const result = parseDocsArgs(['./my-docs', '--open'], {
      defaultDocsDir: 'docs',
    });
    expect(result.docsDir).toBe('./my-docs');
    expect(result.rest).toEqual(['--open']);
  });

  it('accepts --docs <dir> and forwards remaining args', () => {
    const result = parseDocsArgs(['--docs', './my-docs', '--open'], {
      defaultDocsDir: 'docs',
    });
    expect(result.docsDir).toBe('./my-docs');
    expect(result.rest).toEqual(['--open']);
  });

  it('supports "--" to explicitly separate Vite args', () => {
    const result = parseDocsArgs(['--docs', './my-docs', '--', '--open'], {
      defaultDocsDir: 'docs',
    });
    expect(result.docsDir).toBe('./my-docs');
    expect(result.rest).toEqual(['--open']);
  });

  it('does not treat unknown flags as docsDir', () => {
    const result = parseDocsArgs(['--open'], { defaultDocsDir: 'docs' });
    expect(result.docsDir).toBe('docs');
  });

  it('sets help and does not forward help by default', () => {
    const result = parseDocsArgs(['--help', '--open'], {
      defaultDocsDir: 'docs',
    });
    expect(result.help).toBe(true);
    expect(result.rest).toEqual(['--open']);
  });

  it('throws when --docs is missing a value', () => {
    expect(() => parseDocsArgs(['--docs'], { defaultDocsDir: 'docs' })).toThrow(
      /requires a directory/i,
    );
  });
});

describe('parseGenerateArgs', () => {
  const defaults = {
    defaultOutFile: 'docs.json',
    defaultAssetsDir: null,
    defaultAssetsBase: null,
  };

  it('accepts a leading separator before flags', () => {
    const result = parseGenerateArgs(
      ['--', '--input', './my-docs', '--outFile', 'custom.json'],
      defaults,
    );
    expect(result.opts.inputDir).toBe('./my-docs');
    expect(result.opts.outFile).toBe('custom.json');
  });

  it('recognizes help after the optional separator', () => {
    expect(parseGenerateArgs(['--', '--help'], defaults).help).toBe(true);
  });
});
