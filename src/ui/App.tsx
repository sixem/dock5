// Main app shell. For now this is a tiny docs viewer wired to a generated manifest.
import { useEffect, useMemo, useState } from 'preact/hooks';

import docsManifestJson from '../generated/docs.json';
import { useHashLocation } from './lib/useHashLocation';

type DocsPage = {
  slug: string;
  title: string;
  markdown: string;
};

type DocsManifest = {
  generatedAt: string;
  inputDir: string;
  pages: DocsPage[];
};

const docsManifest = docsManifestJson as DocsManifest;

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function loadTheme(): Theme {
  const stored = localStorage.getItem('dock5.theme');
  if (stored === 'light' || stored === 'dark') return stored;

  // Default to system preference.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const { path } = useHashLocation();

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
                  class={page.slug === path ? 'nav__link nav__link--active' : 'nav__link'}
                  href={`#${page.slug}`}
                >
                  {page.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main class="content">
          <div class="content__meta">
            <div class="content__path">{currentPage?.slug ?? path}</div>
            <div class="content__source">generated from: {docsManifest.inputDir}</div>
          </div>

          {currentPage ? (
            <article class="doc">
              <h1 class="doc__title">{currentPage.title}</h1>
              <pre class="doc__markdown">{currentPage.markdown}</pre>
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
        <span>generated at {docsManifest.generatedAt}</span>
      </footer>
    </div>
  );
}

