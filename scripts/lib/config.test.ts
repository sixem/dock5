import { describe, expect, it } from 'vitest';
import { parseSiteConfig } from '../../src/docs/siteConfig.ts';

describe('site configuration', () => {
  it('supplies defaults without requiring a config file', () => {
    expect(parseSiteConfig({})).toEqual({
      navigation: {},
      exclude: [],
      defaultTheme: 'dark',
      title: null,
      description: null,
      logo: null,
      favicon: null,
      links: [],
    });
  });
  it('normalizes identity options and preserves link order', () => {
    expect(
      parseSiteConfig({
        title: ' Project ',
        description: ' Docs ',
        logo: './assets/logo.svg',
        favicon: 'assets\\icon.png',
        links: [
          { label: ' Guide ', href: '#/guide' },
          { label: 'Contact', href: 'mailto:docs@example.com' },
        ],
      }),
    ).toEqual({
      navigation: {},
      exclude: [],
      defaultTheme: 'dark',
      title: 'Project',
      description: 'Docs',
      logo: 'assets/logo.svg',
      favicon: 'assets/icon.png',
      links: [
        { label: 'Guide', href: '#/guide' },
        { label: 'Contact', href: 'mailto:docs@example.com' },
      ],
    });
  });
  it.each([
    [{ navigation: { '/guides': { order: 'first' } } }, 'order'],
    [{ navigation: { guides: { label: 'Learn' } } }, 'routes'],
    [{ exclude: ['../private'] }, 'exclude'],
    [{ exclude: null }, 'exclude'],
    [{ defaultTheme: 'system' }, 'defaultTheme'],
    [{ defaultTheme: null }, 'defaultTheme'],
    [{ titel: 'typo' }, 'unknown option'],
    [{ description: 42 }, 'description'],
    [{ logo: '../outside.svg' }, 'logo'],
    [{ logo: '/absolute.svg' }, 'logo'],
    [{ logo: 'https://example.com/logo.svg' }, 'logo'],
    [{ favicon: 'C:\\icon.png' }, 'favicon'],
    [{ links: null }, 'links'],
    [{ links: [{}] }, 'label and href'],
    [
      { links: [{ label: 'Bad', href: 'javascript:alert(1)' }] },
      'unsupported protocol',
    ],
    [{ links: [{ label: 'Bad', href: './guide.md' }] }, 'absolute URL'],
  ])('rejects invalid options %j', (config, message) => {
    expect(() => parseSiteConfig(config)).toThrow(message as string);
  });
});
