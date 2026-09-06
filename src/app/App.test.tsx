// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { docsManifest } from '@/docs/manifest';
import { App } from './App';

vi.mock('@/docs/manifest', () => ({
  docsManifest: {
    navigation: {},
    defaultTheme: 'dark',
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
const requestFrame = vi.fn((_callback: FrameRequestCallback) => 42);
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

it.each([null, 'invalid', 'dark'])(
  'uses the configured theme unless a valid preference is saved (%s)',
  (saved) => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => saved, setItem });
    docsManifest.defaultTheme = 'light';
    try {
      act(() => render(<App />, container));
      expect(document.documentElement.dataset.theme).toBe(
        saved === 'dark' ? 'dark' : 'light',
      );
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      docsManifest.defaultTheme = 'dark';
    }
  },
);

it('opens the mobile navigation and closes it on page selection or Escape', () => {
  act(() => render(<App />, container));
  const button =
    container.querySelector<HTMLButtonElement>('.mobile-nav-toggle');
  act(() => button?.click());
  expect(button?.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('.sidebar--open')).not.toBeNull();
  act(() =>
    container
      .querySelector<HTMLAnchorElement>('.sidebar a[href="#/guide"]')
      ?.click(),
  );
  expect(button?.getAttribute('aria-expanded')).toBe('false');
  act(() => button?.click());
  act(
    () =>
      void container
        .querySelector('.sidebar')
        ?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        ),
  );
  expect(button?.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(button);
});

it('lets folder page links navigate while the separate toggle expands children', () => {
  docsManifest.pages.push({
    slug: '/guide/child',
    title: 'Child',
    html: '',
    headings: [],
  });
  try {
    act(() => render(<App />, container));
    const link = container.querySelector<HTMLAnchorElement>(
      '.sidebar a[href="#/guide"]',
    );
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      link?.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    act(() =>
      link?.parentElement
        ?.querySelector<HTMLButtonElement>('.nav__toggle')
        ?.click(),
    );
    expect(
      container.querySelector('.sidebar a[href="#/guide/child"]'),
    ).not.toBeNull();
  } finally {
    docsManifest.pages.pop();
  }
});

const navigate = (path: string) =>
  act(() => {
    history.replaceState(null, '', `#${path}`);
    window.dispatchEvent(new Event('hashchange'));
  });

it('links the outline and heading permalinks to unique sections across navigation', () => {
  const guide = docsManifest.pages[1];
  const original = { ...guide };
  Object.assign(guide, {
    html: '<h2 id="arrival">Arrival</h2><h3 id="check-in">Check-in</h3><h2 id="arrival-2">Arrival</h2>',
    headings: [
      { depth: 2, id: 'arrival', text: 'Arrival' },
      { depth: 3, id: 'check-in', text: 'Check-in' },
      { depth: 2, id: 'arrival-2', text: 'Arrival' },
    ],
  });
  try {
    navigate('/guide');
    act(() => render(<App />, container));
    expect(
      [...container.querySelectorAll('.page-outline a')].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual(['#/guide#arrival', '#/guide#check-in', '#/guide#arrival-2']);
    expect(
      container.querySelector('h2#arrival-2 a')?.getAttribute('href'),
    ).toBe('#/guide#arrival-2');
    expect(
      container.querySelector('h2#arrival a')?.getAttribute('aria-label'),
    ).toBe('Link to Arrival');
    navigate('/');
    expect(container.querySelector('.page-outline')).toBeNull();
    expect(container.querySelector('.heading-permalink')).toBeNull();
    navigate('/guide');
    expect(container.querySelectorAll('.heading-permalink')).toHaveLength(3);
  } finally {
    Object.assign(guide, original);
  }
});

it.each([undefined, true, false])(
  'handles one-heading outlines with outline=%s',
  (outline) => {
    const guide = docsManifest.pages[1];
    const original = { ...guide };
    Object.assign(guide, {
      outline,
      html: '<h2 id="start">Start</h2>',
      headings: [{ depth: 2, id: 'start', text: 'Start' }],
    });
    try {
      navigate('/guide');
      act(() => render(<App />, container));
      expect(Boolean(container.querySelector('.page-outline'))).toBe(
        outline === true,
      );
      expect(container.querySelector('.heading-permalink')).not.toBeNull();
    } finally {
      Object.assign(guide, original);
      delete guide.outline;
    }
  },
);

it('shows pagination boundaries and honors page-level disabling', () => {
  act(() => render(<App />, container));
  expect(container.querySelector('[rel="prev"]')).toBeNull();
  expect(container.querySelector('[rel="next"]')?.getAttribute('href')).toBe(
    '#/guide',
  );
  navigate('/guide');
  expect(container.querySelector('[rel="prev"]')?.getAttribute('href')).toBe(
    '#/',
  );
  expect(container.querySelector('[rel="next"]')).toBeNull();
  docsManifest.pages[1].pagination = false;
  try {
    act(() => render(<App />, container));
    expect(container.querySelector('.pagination')).toBeNull();
  } finally {
    delete docsManifest.pages[1].pagination;
  }
  navigate('/does-not-exist');
  expect(container.querySelector('.doc__title')?.textContent).toBe('Not found');
  expect(container.querySelector('.pagination')).toBeNull();
});

it('scrolls the reading pane on navigation and resolves section IDs within the article', () => {
  const guide = docsManifest.pages[1];
  const original = { ...guide };
  Object.assign(guide, {
    html: '<h2 id="page-navigation">Navigation</h2>',
    headings: [{ depth: 2, id: 'page-navigation', text: 'Navigation' }],
  });
  try {
    act(() => render(<App />, container));
    const main = container.querySelector('main');
    const scrollTop = vi.fn();
    Object.defineProperty(main, 'scrollTo', {
      value: scrollTop,
      configurable: true,
    });
    navigate('/guide');
    act(() => {
      requestFrame.mock.calls.at(-1)?.[0](0);
    });
    expect(scrollTop).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
    const heading = container.querySelector('h2');
    const scrollSection = vi.fn();
    Object.defineProperty(heading, 'scrollIntoView', {
      value: scrollSection,
      configurable: true,
    });
    navigate('/guide#page-navigation');
    act(() => {
      requestFrame.mock.calls.at(-1)?.[0](0);
    });
    expect(scrollSection).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto',
    });
  } finally {
    Object.assign(guide, original);
  }
});
