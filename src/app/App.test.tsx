// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('@/docs/manifest', () => ({
  docsManifest: {
    title: 'My Project',
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
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('uses the site name in the header and updates the tab title on navigation', () => {
  act(() => render(<App />, container));
  expect(container.querySelector('.brand__name')?.textContent).toBe(
    'My Project',
  );
  expect(document.title).toBe('My Project');
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
