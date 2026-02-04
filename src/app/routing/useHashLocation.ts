// Tiny hash-router hook: enough for a static-host-friendly SPA (no backend rewrites).
import { useEffect, useState } from 'preact/hooks';

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

export function useHashLocation() {
  const [state, setState] = useState(() =>
    normalizeLocation(globalThis.location?.hash ?? ''),
  );

  useEffect(() => {
    const onChange = () =>
      setState(normalizeLocation(globalThis.location?.hash ?? ''));
    globalThis.addEventListener('hashchange', onChange);
    return () => globalThis.removeEventListener('hashchange', onChange);
  }, []);

  return state;
}
