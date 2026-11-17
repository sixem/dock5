import { useMemo, useState } from 'preact/hooks';
import type { DocsPage } from '@/docs/manifest';
import { buildSearchIndex, searchDocs } from '@/docs/search';

const resultLimit = 20;

export function Search({ pages }: { pages: DocsPage[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<ReturnType<
    typeof buildSearchIndex
  > | null>(null);
  const results = useMemo(() => searchDocs(index ?? [], query), [index, query]);
  const visible = results.slice(0, resultLimit);
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
          if (open && event.key === 'Enter' && results[0]) {
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
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              const links = Array.from(
                event.currentTarget.querySelectorAll<HTMLAnchorElement>('li a'),
              );
              const index = links.indexOf(
                document.activeElement as HTMLAnchorElement,
              );
              if (index < 0) return;
              event.preventDefault();
              if (index === 0 && event.key === 'ArrowUp') {
                event.currentTarget.parentElement
                  ?.querySelector('input')
                  ?.focus();
              } else {
                links[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
              }
            }
            if (event.key === 'Escape') {
              event.currentTarget.parentElement
                ?.querySelector<HTMLInputElement>('input')
                ?.focus();
              setOpen(false);
            }
          }}
        >
          <p role="status">
            {results.length > resultLimit
              ? `Showing ${resultLimit} of ${results.length} results`
              : results.length
                ? `${results.length} result${results.length === 1 ? '' : 's'}`
                : 'No results'}
          </p>
          <ul>
            {visible.map((result) => (
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
