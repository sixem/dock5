import type { DocsPage } from './manifest';

export type SearchEntry = {
  title: string;
  section: string;
  href: string;
  text: string;
};
export type SearchResult = SearchEntry & { excerpt: string };

export const buildSearchIndex = (pages: DocsPage[]): SearchEntry[] =>
  pages.flatMap((page) => {
    const document = new DOMParser().parseFromString(page.html, 'text/html');
    const entries: SearchEntry[] = [
      { title: page.title, section: '', href: `#${page.slug}`, text: '' },
    ];
    let current = entries[0];
    const headings = new Map(
      page.headings.map((heading) => [heading.id, heading.text]),
    );
    const visit = (node: Node) => {
      if (node.nodeType === 1) {
        const element = node as Element;
        const section = headings.get(element.id);
        if (/^H[2-6]$/.test(element.tagName) && section) {
          current = {
            title: page.title,
            section,
            href: `#${page.slug}#${encodeURIComponent(element.id)}`,
            text: '',
          };
          entries.push(current);
        }
      }
      if (node.nodeType === 3) current.text += node.textContent ?? '';
      for (const child of node.childNodes) visit(child);
      if (
        node.nodeType === 1 &&
        /^(P|DIV|LI|PRE|BLOCKQUOTE|H[1-6]|TR|TD|TH|BR)$/.test(
          (node as Element).tagName,
        )
      )
        current.text += ' ';
    };
    visit(document.body);
    return entries.map((entry) => ({
      ...entry,
      text: entry.text.replace(/\s+/g, ' ').trim(),
    }));
  });

export const searchDocs = (
  index: SearchEntry[],
  query: string,
): SearchResult[] => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return index
    .map((entry) => {
      const title = entry.title.toLocaleLowerCase();
      const section = entry.section.toLocaleLowerCase();
      const text = entry.text.toLocaleLowerCase();
      const combined = `${title} ${section} ${text}`;
      if (!terms.every((term) => combined.includes(term))) return null;
      const score = terms.reduce(
        (sum, term) =>
          sum +
          (title.includes(term) ? 4 : 0) +
          (section.includes(term) ? 6 : 0) +
          (text.includes(term) ? 1 : 0),
        0,
      );
      const firstMatch = Math.min(
        ...terms
          .map((term) => text.indexOf(term))
          .filter((position) => position >= 0),
      );
      const start = Number.isFinite(firstMatch)
        ? Math.max(0, firstMatch - 45)
        : 0;
      const excerpt = `${start ? '…' : ''}${entry.text.slice(start, start + 160)}${entry.text.length > start + 160 ? '…' : ''}`;
      return { ...entry, score, excerpt };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => b.score - a.score || a.href.localeCompare(b.href))
    .slice(0, 20);
};
