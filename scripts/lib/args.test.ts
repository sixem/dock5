import { describe, expect, it } from 'vitest';

import { parseDocsArgs } from './args.ts';

describe('parseDocsArgs', () => {
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
    expect(() =>
      parseDocsArgs(['--docs'], { defaultDocsDir: 'docs' }),
    ).toThrow(/requires a directory/i);
  });
});

