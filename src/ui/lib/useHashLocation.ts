// Tiny hash-router hook: enough for a static-host-friendly SPA (no backend rewrites).
import { useEffect, useState } from 'preact/hooks';

function normalizePath(raw: string): string {
  const value = raw.trim();
  if (!value) return '/';

  // Accept both "#/path" and "#path".
  const withoutHash = value.startsWith('#') ? value.slice(1) : value;
  const withLeadingSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;

  // Collapse trailing slash except root.
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

export function useHashLocation() {
  const [path, setPath] = useState(() => normalizePath(globalThis.location?.hash ?? ''));

  useEffect(() => {
    const onChange = () => setPath(normalizePath(globalThis.location?.hash ?? ''));
    globalThis.addEventListener('hashchange', onChange);
    return () => globalThis.removeEventListener('hashchange', onChange);
  }, []);

  return { path };
}

