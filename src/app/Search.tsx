import { useMemo, useState } from 'preact/hooks';
import type { DocsPage } from '@/docs/manifest';
import { buildSearchIndex, searchDocs } from '@/docs/search';

export function Search({ pages }: { pages: DocsPage[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<ReturnType<
    typeof buildSearchIndex
  > | null>(null);
  const results = useMemo(() => searchDocs(index ?? [], query), [index, query]);
  return (
    <div
      class="search"
      onFocusOut={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <label class="search__label" for="docs-search">
        Search docs
      </label>
      <input
        id="docs-search"
        type="search"
        value={query}
        placeholder="Search docs…"
        aria-controls="search-results"
        onFocus={() => {
          if (!index) setIndex(buildSearchIndex(pages));
          setOpen(true);
        }}
        onInput={(event) => {
          setQuery(event.currentTarget.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.currentTarget.parentElement
              ?.querySelector<HTMLAnchorElement>('.search__results a')
              ?.focus();
          }
          if (event.key === 'Enter' && results[0]) {
            location.hash = results[0].href;
            setOpen(false);
          }
        }}
      />
      {open && query.trim() ? (
        <nav
          aria-label="Search results"
          class="search__results"
          id="search-results"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.parentElement
                ?.querySelector<HTMLInputElement>('input')
                ?.focus();
              setOpen(false);
            }
          }}
        >
          <p role="status">
            {results.length
              ? `${results.length} result${results.length === 1 ? '' : 's'}`
              : 'No results'}
          </p>
          <ul>
            {results.map((result) => (
              <li key={result.href}>
                <a href={result.href} onClick={() => setOpen(false)}>
                  <strong>
                    {result.title}
                    {result.section ? ` — ${result.section}` : ''}
                  </strong>
                  {result.excerpt ? <span>{result.excerpt}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
