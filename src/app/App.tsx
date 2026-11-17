// Main app shell. Minimal docs viewer wired to a build-time generated manifest.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { type DocsPage, docsManifest } from '@/docs/manifest';
import {
  buildNavTree,
  collectAncestorKeys,
  collectNavPages,
} from '@/docs/navTree';
import { copyText } from './copyText';
import { useHashLocation } from './routing/useHashLocation';
import { ScrollOverlay } from './ScrollOverlay';
import { Search } from './Search';

type ResolvedTheme = 'light' | 'dark';
type ThemePreference = ResolvedTheme;

const THEME_OPTIONS: Array<{
  id: ThemePreference;
  label: string;
  description: string;
  swatchClass: string;
}> = [
  {
    id: 'dark',
    label: 'Black',
    description: 'Pure black canvas with cyan accents.',
    swatchClass: 'theme-option__swatch--dark',
  },
  {
    id: 'light',
    label: 'White',
    description: 'True white surface with clean contrast.',
    swatchClass: 'theme-option__swatch--light',
  },
];

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

function loadThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem('dock5.theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage may be disabled by browser privacy settings.
  }

  return docsManifest.defaultTheme;
}

export function App() {
  const { path, fragment } = useHashLocation();

  const pagesBySlug = useMemo(() => {
    const map = new Map<string, DocsPage>();
    for (const page of docsManifest.pages) map.set(page.slug, page);
    return map;
  }, []);

  const navTree = useMemo(
    () => buildNavTree(docsManifest.pages, docsManifest.navigation),
    [],
  );

  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    loadThemePreference(),
  );

  const resolvedTheme = themePreference;

  const selectTheme = (theme: ThemePreference) => {
    setThemePreference(theme);
    try {
      localStorage.setItem('dock5.theme', theme);
    } catch {
      // Theme changes still work when storage is unavailable.
    }
  };

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const [isNavOpen, setIsNavOpen] = useState(false);
  const navButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    setIsNavOpen(false);
  }, [path]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);

  const [expandedNav, setExpandedNav] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    // Ensure the current page is visible in the tree by expanding its ancestors.
    const keys = collectAncestorKeys(path);
    if (keys.length === 0) return;

    setExpandedNav((prev) => {
      const next = new Set(prev);
      for (const key of keys) next.add(key);
      return next;
    });
  }, [path]);

  const currentPage = pagesBySlug.get(path) ?? null;
  const readingOrder = useMemo(() => collectNavPages(navTree), [navTree]);
  const pageIndex = readingOrder.findIndex(
    (page) => page.slug === currentPage?.slug,
  );
  const previousPage = pageIndex > 0 ? readingOrder[pageIndex - 1] : null;
  const nextPage = pageIndex >= 0 ? readingOrder[pageIndex + 1] : null;
  const showPagination =
    currentPage?.pagination !== false && (previousPage || nextPage);
  const showOutline =
    currentPage &&
    currentPage.outline !== false &&
    currentPage.headings.length >= (currentPage.outline === true ? 1 : 2);
  const renderOutline = () => (
    <ul>
      {currentPage?.headings.map((heading) => (
        <li
          key={heading.id}
          style={{
            paddingInlineStart: `${Math.max(0, heading.depth - 2) * 12}px`,
          }}
        >
          <a
            href={`#${currentPage.slug}#${encodeURIComponent(heading.id)}`}
            aria-current={
              fragment === encodeURIComponent(heading.id)
                ? 'location'
                : undefined
            }
            onClick={(event) => {
              const details = event.currentTarget.closest('details');
              if (details) details.open = false;
            }}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
  const sidebarRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const links: HTMLAnchorElement[] = [];
    for (const heading of contentRef.current?.querySelectorAll<HTMLElement>(
      'h2[id], h3[id], h4[id], h5[id], h6[id]',
    ) ?? []) {
      const link = document.createElement('a');
      link.className = 'heading-permalink';
      link.href = `#${currentPage?.slug}#${encodeURIComponent(heading.id)}`;
      link.setAttribute('aria-label', `Link to ${heading.textContent}`);
      link.textContent = '#';
      heading.append(link);
      links.push(link);
    }
    return () => {
      for (const link of links) link.remove();
    };
  }, [currentPage]);
  useEffect(() => {
    const buttons: HTMLButtonElement[] = [];
    let active = true;
    for (const code of contentRef.current?.querySelectorAll<HTMLElement>(
      'pre > code',
    ) ?? []) {
      const button = document.createElement('button');
      button.className = 'copy-code';
      button.type = 'button';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code');
      const icon = document.createElement('span');
      icon.className = 'copy-code__icon';
      icon.setAttribute('aria-hidden', 'true');
      const status = document.createElement('span');
      status.className = 'visually-hidden';
      status.setAttribute('aria-live', 'polite');
      button.append(icon, status);
      button.onclick = async () => {
        try {
          await copyText(code.textContent ?? '');
          if (active) {
            button.dataset.status = 'copied';
            button.setAttribute('aria-label', 'Copied');
            status.textContent = 'Copied';
          }
        } catch (error) {
          console.warn('[copy] clipboard unavailable or denied', error);
          if (active) {
            button.dataset.status = 'failed';
            button.setAttribute('aria-label', 'Copy failed');
            status.textContent = 'Copy failed';
          }
        }
      };
      code.parentElement?.append(button);
      buttons.push(button);
    }
    return () => {
      active = false;
      for (const button of buttons) button.remove();
    };
  }, [currentPage]);
  useEffect(() => {
    const pageTitle = currentPage?.title.trim() || 'Not found';
    document.title =
      pageTitle === docsManifest.title
        ? docsManifest.title
        : `${pageTitle} | ${docsManifest.title}`;
  }, [currentPage?.title, docsManifest.title]);
  useEffect(() => {
    let description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (docsManifest.description) {
      if (!description) {
        description = document.createElement('meta');
        description.name = 'description';
        document.head.append(description);
      }
      description.content = docsManifest.description;
    } else {
      description?.remove();
    }
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.append(favicon);
    }
    favicon.href =
      docsManifest.favicon ?? new URL('icon.png', document.baseURI).href;
    favicon.removeAttribute('type');
  }, [docsManifest.description, docsManifest.favicon]);
  const previousPathRef = useRef(path);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const pathChanged = previousPath !== path;
    previousPathRef.current = path;

    // Defer to ensure the new page content is in the DOM.
    const frame = requestAnimationFrame(() => {
      if (fragment) {
        const decodedFragment = (() => {
          try {
            return decodeURIComponent(fragment);
          } catch {
            return fragment;
          }
        })();

        const el = Array.from(
          contentRef.current?.querySelectorAll<HTMLElement>('[id]') ?? [],
        ).find((element) => element.id === decodedFragment);
        if (el) {
          el.scrollIntoView({ block: 'start', behavior: 'auto' });
          return;
        }
      }

      // Standard SPA behavior:
      // - no fragment: jump to top
      // - fragment missing on navigation: also fall back to top
      if (!fragment || pathChanged) {
        mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [path, currentPage?.slug, fragment]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    // Move focus into the dialog so keyboard users don't "lose" focus behind the overlay.
    const frame = requestAnimationFrame(() => {
      const panel = settingsPanelRef.current;
      if (!panel) return;

      const firstFocusable = panel.querySelector<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSettingsOpen(false);
      }

      if (e.key !== 'Tab') return;

      // Lightweight focus trap for the settings panel.
      const panel = settingsPanelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(','),
      );

      const items = Array.from(focusable).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last?.focus();
        }
        return;
      }

      if (active === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (isSettingsOpen) return;
    settingsButtonRef.current?.focus();
  }, [isSettingsOpen]);

  const toggleExpanded = (key: string) =>
    setExpandedNav((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderNavNodes = (nodes: ReturnType<typeof buildNavTree>) =>
    nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = hasChildren ? expandedNav.has(node.key) : false;
      const isActive = node.page?.slug === path;
      const isActiveAncestor =
        !isActive && hasChildren && path.startsWith(`${node.key}/`);

      const linkClass = isActive
        ? 'nav__link nav__link--active'
        : isActiveAncestor
          ? 'nav__link nav__link--ancestor'
          : 'nav__link';

      const resolvedLinkClass = hasChildren
        ? linkClass
        : `${linkClass} nav__link--leaf`;

      return (
        <div key={node.key} class="nav__item">
          <div class="nav__row">
            {hasChildren ? (
              <button
                class="nav__toggle"
                type="button"
                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                aria-expanded={isExpanded}
                onClick={() => toggleExpanded(node.key)}
              >
                <span class="nav__caret" aria-hidden="true" />
              </button>
            ) : null}

            {node.page ? (
              <a
                class={resolvedLinkClass}
                href={`#${node.page.slug}`}
                onClick={() => setIsNavOpen(false)}
              >
                <span class="nav__pill">{node.title}</span>
              </a>
            ) : (
              <button
                class="nav__group"
                type="button"
                onClick={() => toggleExpanded(node.key)}
              >
                <span class="nav__pill">{node.title}</span>
              </button>
            )}
          </div>

          {hasChildren && isExpanded ? (
            <div class="nav__children">{renderNavNodes(node.children)}</div>
          ) : null}
        </div>
      );
    });

  return (
    <div class="app">
      <header class="topbar">
        <a class="brand" href="#/" aria-label={`${docsManifest.title} home`}>
          <span class="brand__name">{docsManifest.title}</span>
          <span class="brand__meta">docs</span>
        </a>

        <div class="topbar__actions">
          <Search pages={docsManifest.pages} />
          <button
            ref={navButtonRef}
            class="button mobile-nav-toggle"
            type="button"
            aria-expanded={isNavOpen}
            aria-controls="page-navigation"
            onClick={() => setIsNavOpen((open) => !open)}
          >
            Pages
          </button>
          {docsManifest.links.length ? (
            <nav class="header-links" aria-label="Project links">
              {docsManifest.links.map((link) =>
                /^https?:\/\/(?:www\.)?github\.com(?:[/:?#]|$)/i.test(
                  link.href,
                ) ? (
                  <a
                    key={`${link.label}:${link.href}`}
                    href={link.href}
                    class="button button--icon"
                    aria-label={link.label}
                  >
                    <span class="github-icon" aria-hidden="true" />
                    <span class="visually-hidden">{link.label}</span>
                  </a>
                ) : (
                  <a key={`${link.label}:${link.href}`} href={link.href}>
                    {link.label}
                  </a>
                ),
              )}
            </nav>
          ) : null}
          <button
            ref={settingsButtonRef}
            class="button button--icon"
            type="button"
            aria-label="Open settings"
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen(true)}
          >
            <svg
              class="icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.32-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.05.31-.07.62-.07.94 0 .31.02.63.06.94L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.39 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.13-.55 1.63-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <div class="layout">
        <div
          class={`scroll-frame scroll-frame--sidebar${isNavOpen ? ' scroll-frame--open' : ''}`}
        >
          <aside
            ref={sidebarRef}
            id="page-navigation"
            class={`sidebar${isNavOpen ? ' sidebar--open' : ''}`}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsNavOpen(false);
                navButtonRef.current?.focus();
              }
            }}
          >
            <div class="sidebar__section">
              <div class="sidebar__title">Pages</div>
              <nav class="nav" aria-label="Pages">
                {renderNavNodes(navTree)}
              </nav>
            </div>
          </aside>
          <ScrollOverlay
            viewportRef={sidebarRef}
            controls="page-navigation"
            label="Pages scroll position"
          />
        </div>

        <div class="scroll-frame scroll-frame--content">
          <main ref={mainRef} id="page-content" class="content">
            <div class="content__meta">
              <div class="content__path">{currentPage?.slug ?? path}</div>
            </div>

            <div
              class={`content__layout${showOutline ? ' content__layout--outline' : ''}`}
            >
              {currentPage ? (
                <article class="doc">
                  <h1 class="doc__title">{currentPage.title}</h1>
                  {showOutline ? (
                    <details class="page-outline-mobile">
                      <summary>On this page</summary>
                      <nav aria-label="On this page">{renderOutline()}</nav>
                    </details>
                  ) : null}
                  <div
                    ref={contentRef}
                    class="doc__content"
                    // HTML is generated at build-time from Markdown. The generator escapes text
                    // and sanitizes URLs by default.
                    dangerouslySetInnerHTML={{ __html: currentPage.html }}
                  />
                  {showPagination ? (
                    <nav class="pagination" aria-label="Page navigation">
                      {previousPage ? (
                        <a
                          class="pagination__previous"
                          rel="prev"
                          href={`#${previousPage.slug}`}
                        >
                          <span>Previous</span>
                          {docsManifest.navigation[previousPage.slug]?.label ??
                            previousPage.sidebarLabel ??
                            previousPage.title}
                        </a>
                      ) : null}
                      {nextPage ? (
                        <a
                          class="pagination__next"
                          rel="next"
                          href={`#${nextPage.slug}`}
                        >
                          <span>Next</span>
                          {docsManifest.navigation[nextPage.slug]?.label ??
                            nextPage.sidebarLabel ??
                            nextPage.title}
                        </a>
                      ) : null}
                    </nav>
                  ) : null}
                </article>
              ) : (
                <article class="doc">
                  <h1 class="doc__title">Not found</h1>
                  <p class="doc__text">No page matches: {path}</p>
                </article>
              )}
              {showOutline ? (
                <aside class="page-outline" aria-label="On this page">
                  <div class="page-outline__title">On this page</div>
                  <nav aria-label="On this page">{renderOutline()}</nav>
                </aside>
              ) : null}
            </div>
          </main>
          <ScrollOverlay
            viewportRef={mainRef}
            controls="page-content"
            label="Content scroll position"
          />
        </div>
      </div>

      {isSettingsOpen ? (
        <div class="overlay" role="presentation">
          <button
            class="overlay__backdrop"
            type="button"
            aria-label="Close settings"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div
            ref={settingsPanelRef}
            class="panel panel--settings"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <div class="panel__header">
              <div class="panel__intro">
                <div class="panel__eyebrow">Preferences</div>
                <div class="panel__title">Appearance</div>
              </div>
              <button
                class="button button--icon button--close"
                type="button"
                aria-label="Close settings"
                onClick={() => setIsSettingsOpen(false)}
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>

            <div class="panel__section">
              <div class="panel__label">Theme</div>
              <div class="theme-list" role="radiogroup" aria-label="Theme">
                {THEME_OPTIONS.map((opt) => (
                  <label key={opt.id} class="theme-option">
                    <input
                      class="theme-option__input"
                      type="radio"
                      name="theme"
                      value={opt.id}
                      checked={themePreference === opt.id}
                      onChange={() => selectTheme(opt.id)}
                    />
                    <span class="theme-option__body">
                      <span class="theme-option__main">
                        <span class="theme-option__name">{opt.label}</span>
                        <span class="theme-option__desc">
                          {opt.description}
                        </span>
                      </span>
                      <span class={`theme-option__swatch ${opt.swatchClass}`} />
                    </span>
                  </label>
                ))}
              </div>
              <div class="panel__hint panel__hint--status">
                Current: <span class="mono">{resolvedTheme}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
