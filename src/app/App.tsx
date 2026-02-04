// Main app shell. Minimal docs viewer wired to a build-time generated manifest.
import { useEffect, useMemo, useState } from 'preact/hooks';

import { type DocsPage, docsManifest } from '@/docs/manifest';
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

  const [theme, setTheme] = useState<Theme>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('dock5.theme', theme);
  }, [theme]);

  const currentPage = pagesBySlug.get(path) ?? pagesBySlug.get('/') ?? null;

  useEffect(() => {
    if (!fragment) return;

    // Defer to ensure the new page content is in the DOM.
    requestAnimationFrame(() => {
      const el = document.getElementById(fragment);
      el?.scrollIntoView({ block: 'start' });
    });
  }, [currentPage?.slug, fragment]);

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
            <nav class="nav">
              {docsManifest.pages.map((page) => (
                <a
                  key={page.slug}
                  class={
                    page.slug === path
                      ? 'nav__link nav__link--active'
                      : 'nav__link'
                  }
                  href={`#${page.slug}`}
                >
                  {page.title}
                </a>
              ))}
            </nav>
          </div>

          {currentPage && currentPage.headings.length > 0 ? (
            <div class="sidebar__section">
              <div class="sidebar__title">On this page</div>
              <nav class="toc">
                {currentPage.headings.map((heading) => (
                  <a
                    key={heading.id}
                    class="toc__link"
                    href={`#${currentPage.slug}#${heading.id}`}
                    style={{
                      paddingLeft: `${Math.max(0, heading.depth - 2) * 12}px`,
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          ) : null}
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

      <footer class="footer">
        <span>pages: {docsManifest.pages.length}</span>
      </footer>
    </div>
  );
}
