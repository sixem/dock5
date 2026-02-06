// Main app shell. Minimal docs viewer wired to a build-time generated manifest.
import { useEffect, useMemo, useState } from 'preact/hooks';

import { type DocsPage, docsManifest } from '@/docs/manifest';
import { buildNavTree, collectAncestorKeys } from '@/docs/navTree';
import { useHashLocation } from './routing/useHashLocation';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function loadTheme(): Theme {
  const stored = localStorage.getItem('dock5.theme');
  if (stored === 'light' || stored === 'dark') return stored;

  // Default to system preference.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function App() {
  const { path, fragment } = useHashLocation();

  const pagesBySlug = useMemo(() => {
    const map = new Map<string, DocsPage>();
    for (const page of docsManifest.pages) map.set(page.slug, page);
    return map;
  }, []);

  const navTree = useMemo(() => buildNavTree(docsManifest.pages), []);

  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('dock5.theme', theme);
  }, [theme]);

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
              <a class={resolvedLinkClass} href={`#${node.page.slug}`}>
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
          <span class="brand__meta">docs engine prototype</span>
        </div>

        <div class="topbar__actions">
          <button
            class="button"
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            Theme: {theme}
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
            <div class="content__source">
              generated from: {docsManifest.inputDir}
            </div>
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
    </div>
  );
}
