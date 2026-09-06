// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { docsManifest } from '@/docs/manifest';
import { App } from './App';

vi.mock('@/docs/manifest', () => ({
  docsManifest: {
    title: 'My Project',
    logo: 'docs-assets/logo.svg',
    description: 'Project docs',
    favicon: 'docs-assets/favicon.svg',
    links: [{ label: 'GitHub', href: 'https://github.com/example/project' }],
    pages: [
      { slug: '/', title: 'My Project', html: '<p>Home</p>', headings: [] },
      { slug: '/guide', title: 'Guide', html: '<p>Guide</p>', headings: [] },
    ],
  },
}));

let container: HTMLDivElement;
const requestFrame = vi.fn(() => 42);
const cancelFrame = vi.fn();

beforeEach(() => {
  history.replaceState(null, '', '#/');
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  container = document.createElement('div');
  document.body.append(container);
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  delete document.documentElement.dataset.theme;
  document.title = '';
  document.querySelector('meta[name="description"]')?.remove();
  document.querySelector('link[rel="icon"]')?.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('uses the site name in the header and updates the tab title on navigation', () => {
  act(() => render(<App />, container));
  expect(container.querySelector('.brand__name')?.textContent).toBe(
    'My Project',
  );
  expect(container.querySelector('.brand__logo')?.getAttribute('src')).toBe(
    'docs-assets/logo.svg',
  );
  expect(container.querySelector('.header-links a')?.getAttribute('href')).toBe(
    'https://github.com/example/project',
  );
  expect(document.title).toBe('My Project');
  expect(
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
  ).toBe('Project docs');
  expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
    'docs-assets/favicon.svg',
  );
  act(() => {
    history.replaceState(null, '', '#/guide');
    window.dispatchEvent(new Event('hashchange'));
  });
  expect(document.title).toBe('Guide | My Project');
  expect(container.querySelector('.brand__name')?.textContent).toBe(
    'My Project',
  );
  act(() => {
    history.replaceState(null, '', '#/');
    window.dispatchEvent(new Event('hashchange'));
  });
  expect(document.title).toBe('My Project');
});

it('renders and changes theme when browser storage is unavailable', () => {
  const unavailable = () => {
    throw new Error('Storage disabled');
  };
  vi.stubGlobal('localStorage', { getItem: unavailable, setItem: unavailable });
  act(() => render(<App />, container));
  expect(container.querySelector('article')).not.toBeNull();
  expect(document.documentElement.dataset.theme).toBe('dark');

  act(() =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Open settings"]')
      ?.click(),
  );
  const light = container.querySelector<HTMLInputElement>(
    'input[value="light"]',
  );
  expect(light).not.toBeNull();
  act(() => {
    light?.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('cancels deferred scrolling when the app unmounts', () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  act(() => render(<App />, container));
  expect(requestFrame).toHaveBeenCalled();
  act(() => render(null, container));
  expect(cancelFrame).toHaveBeenCalledWith(42);
});

it('restores default identity when optional settings are removed', () => {
  const original = {
    logo: docsManifest.logo,
    description: docsManifest.description,
    favicon: docsManifest.favicon,
    links: docsManifest.links,
  };
  try {
    act(() => render(<App />, container));
    Object.assign(docsManifest, {
      logo: null,
      description: null,
      favicon: null,
      links: [],
    });
    act(() => render(<App />, container));
    expect(container.querySelector('.brand__logo')).toBeNull();
    expect(container.querySelector('.header-links')).toBeNull();
    expect(document.querySelector('meta[name="description"]')).toBeNull();
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href,
    ).toBe(new URL('icon.png', document.baseURI).href);
  } finally {
    Object.assign(docsManifest, original);
  }
});
