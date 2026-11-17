// Tiny hash-router hook: enough for a static-host-friendly SPA (no backend rewrites).
import type { RefObject } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';

function normalizeLocation(raw: string): {
  path: string;
  fragment: string | null;
} {
  const value = raw.trim();
  if (!value) return { path: '/', fragment: null };

  // Accept both "#/path" and "#path".
  const withoutHash = value.startsWith('#') ? value.slice(1) : value;

  // Support in-page anchors by allowing "#/page#section".
  const splitIndex = withoutHash.indexOf('#');
  const rawPath =
    splitIndex === -1 ? withoutHash : withoutHash.slice(0, splitIndex);
  const rawFragment =
    splitIndex === -1 ? null : withoutHash.slice(splitIndex + 1) || null;

  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  // Collapse trailing slash except root.
  const normalizedPath =
    withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')
      ? withLeadingSlash.slice(0, -1)
      : withLeadingSlash;

  return { path: normalizedPath || '/', fragment: rawFragment };
}

// A URL can occur several times in history, each at a different reading position.
function historyEntry(): string {
  const existing = history.state?.dock5Entry;
  if (typeof existing === 'string') return existing;

  const id = crypto.getRandomValues(new Uint32Array(4)).join('-');
  history.replaceState({ ...history.state, dock5Entry: id }, '');
  return id;
}

export function useHashLocation(viewport: RefObject<HTMLElement>) {
  const [state, setState] = useState(() => ({
    ...normalizeLocation(location.hash),
    restoredTop: undefined as number | undefined,
  }));

  useLayoutEffect(() => {
    const positions = new Map<string, number>();
    let entry = historyEntry();
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    const onChange = () => {
      if (viewport.current) positions.set(entry, viewport.current.scrollTop);
      entry = historyEntry();
      setState({
        ...normalizeLocation(location.hash),
        restoredTop: positions.get(entry),
      });
    };
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      history.scrollRestoration = previousRestoration;
    };
  }, [viewport]);

  return state;
}
