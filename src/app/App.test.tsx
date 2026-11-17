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
  expect(container.querySelector('.brand img')).toBeNull();
  expect(container.querySelector('.brand')?.getAttribute('href')).toBe('#/');
  expect(
    container.querySelector('.header-links a')?.getAttribute('aria-label'),
  ).toBe('GitHub');
  expect(container.querySelector('.header-links .github-icon')).not.toBeNull();
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
    const mobileOutline = container.querySelector<HTMLDetailsElement>(
      '.page-outline-mobile',
    );
    expect(mobileOutline?.open).toBe(false);
    expect(mobileOutline?.querySelectorAll('a')).toHaveLength(3);
    if (mobileOutline) mobileOutline.open = true;
    act(() => {
      mobileOutline?.querySelector<HTMLAnchorElement>('a')?.click();
    });
    expect(mobileOutline?.open).toBe(false);
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

it('restores scroll positions per history entry, including repeated URLs', () => {
  act(() => render(<App />, container));
  const main = container.querySelector('main');
  if (!main) throw new Error('Missing main viewport');
  const home = history.state;
  const scrollTo = vi.spyOn(main, 'scrollTo');
  main.scrollTop = 115;
  navigate('/guide');
  const guide = history.state;
  main.scrollTop = 370;
  navigate('/');
  expect(history.state).not.toEqual(home);
  act(() => requestFrame.mock.calls.at(-1)?.[0](0));
  expect(scrollTo).toHaveBeenLastCalledWith({
    top: 0,
    left: 0,
    behavior: 'auto',
  });
  for (const [entry, hash, top] of [
    [guide, '#/guide', 370],
    [home, '#/', 115],
  ] as const) {
    act(() => {
      history.replaceState(entry, '', hash);
      window.dispatchEvent(new Event('hashchange'));
    });
    act(() => requestFrame.mock.calls.at(-1)?.[0](0));
    expect(scrollTo).toHaveBeenLastCalledWith({
      top,
      left: 0,
      behavior: 'auto',
    });
  }
});

it('updates both outlines on article scroll without changing the section URL', () => {
  const page = docsManifest.pages[1];
  const original = { ...page };
  try {
    Object.assign(page, {
      html: '<h2 id="first">First</h2><h2 id="second">Second</h2>',
      headings: ['first', 'second'].map((id) => ({ depth: 2, id, text: id })),
    });
    navigate('/guide#first');
    act(() => render(<App />, container));
    const main = container.querySelector('main');
    if (!main) throw new Error('Missing main viewport');
    const second = container.querySelector('#second');
    if (!second) throw new Error('Missing second heading');
    const bounds = vi.spyOn(second, 'getBoundingClientRect');
    for (const [top, id] of [
      [200, 'first'],
      [20, 'second'],
    ] as const) {
      bounds.mockReturnValue(new DOMRect(0, top, 100, 20));
      act(() => {
        main.dispatchEvent(new Event('scroll'));
      });
      act(() => requestFrame.mock.calls.at(-1)?.[0](0));
      const links = container.querySelectorAll('[aria-current="location"]');
      expect(Array.from(links, (link) => link.getAttribute('href'))).toEqual(
        Array(2).fill(`#/guide#${id}`),
      );
      expect(location.hash).toBe('#/guide#first');
    }
  } finally {
    Object.assign(page, original);
  }
});

it('copies the original code text and reports clipboard failures', async () => {
  const guide = docsManifest.pages[1];
  const original = { ...guide };
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  guide.html =
    '<pre><code><span class="hljs-keyword">const</span> x = &quot;&lt;tag&gt;&quot;;\n</code></pre>';
  try {
    navigate('/guide');
    act(() => render(<App />, container));
    const button = container.querySelector<HTMLButtonElement>('.copy-code');
    expect(button?.textContent).toBe('');
    expect(button?.querySelector('.copy-code__icon')).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('Copy code');
    await act(async () => {
      button?.click();
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith('const x = "<tag>";\n');
    expect(button?.getAttribute('aria-label')).toBe('Copied');
    expect(button?.dataset.status).toBe('copied');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button?.getAttribute('aria-label')).toBe('Copy code');
    expect(button?.dataset.status).toBeUndefined();
    writeText.mockRejectedValueOnce(new Error('Denied'));
    await act(async () => {
      button?.click();
      await Promise.resolve();
    });
    expect(button?.getAttribute('aria-label')).toBe('Copy failed');
    expect(button?.dataset.status).toBe('failed');
    navigate('/');
    expect(container.querySelector('.copy-code')).toBeNull();
  } finally {
    vi.useRealTimers();
    Object.assign(guide, original);
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  }
});
