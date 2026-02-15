// Main app shell. Minimal docs viewer wired to a build-time generated manifest.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { type DocsPage, docsManifest } from '@/docs/manifest';
import { buildNavTree, collectAncestorKeys } from '@/docs/navTree';
import { useHashLocation } from './routing/useHashLocation';

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
  const stored = localStorage.getItem('dock5.theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return 'dark';
}

export function App() {
  const { path, fragment } = useHashLocation();

  const pagesBySlug = useMemo(() => {
    const map = new Map<string, DocsPage>();
    for (const page of docsManifest.pages) map.set(page.slug, page);
    return map;
  }, []);

  const navTree = useMemo(() => buildNavTree(docsManifest.pages), []);

  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    loadThemePreference(),
  );

  const resolvedTheme = themePreference;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    localStorage.setItem('dock5.theme', themePreference);
  }, [themePreference]);

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

  const currentPage = pagesBySlug.get(path) ?? pagesBySlug.get('/') ?? null;

  useEffect(() => {
    if (!fragment) return;

    // Defer to ensure the new page content is in the DOM.
    requestAnimationFrame(() => {
      const el = document.getElementById(fragment);
      el?.scrollIntoView({ block: 'start' });
    });
  }, [currentPage?.slug, fragment]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    // Move focus into the dialog so keyboard users don't "lose" focus behind the overlay.
    requestAnimationFrame(() => {
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
    return () => document.removeEventListener('keydown', onKeyDown);
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

  const onCategoryLinkClick = (e: MouseEvent, key: string) => {
    // Preserve normal link behavior for modified clicks (new tab, etc.).
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();
    toggleExpanded(key);
  };

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
                onClick={
                  hasChildren
                    ? (e) => onCategoryLinkClick(e, node.key)
                    : undefined
                }
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
        <div class="brand">
          <span class="brand__name">dock5</span>
          <span class="brand__meta">docs engine</span>
        </div>

        <div class="topbar__actions">
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
        <aside class="sidebar">
          <div class="sidebar__section">
            <div class="sidebar__title">Pages</div>
            <nav class="nav">{renderNavNodes(navTree)}</nav>
          </div>
        </aside>

        <main class="content">
          <div class="content__meta">
            <div class="content__path">{currentPage?.slug ?? path}</div>
          </div>

          {currentPage ? (
            <article class="doc">
              <h1 class="doc__title">{currentPage.title}</h1>
              <div
                class="doc__content"
                // HTML is generated at build-time from Markdown. The generator escapes text
                // and sanitizes URLs by default.
                dangerouslySetInnerHTML={{ __html: currentPage.html }}
              />
            </article>
          ) : (
            <article class="doc">
              <h1 class="doc__title">Not found</h1>
              <p class="doc__text">No page matches: {path}</p>
            </article>
          )}
        </main>
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
                <div class="panel__title">Interface Mode</div>
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
                      onChange={() => setThemePreference(opt.id)}
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
