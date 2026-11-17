import type { RefObject } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import type { DocsPage } from '@/docs/manifest';

export function useActiveHeading(
  viewportRef: RefObject<HTMLElement>,
  articleRef: RefObject<HTMLElement>,
  page: DocsPage | null,
) {
  const [active, setActive] = useState<string | null>(null);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const article = articleRef.current;
    if (!page || !viewport || !article) {
      setActive(null);
      return;
    }
    const ids = new Set(page.headings.map((heading) => heading.id));
    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(
        'h2[id],h3[id],h4[id],h5[id],h6[id]',
      ),
    ).filter((heading) => ids.has(heading.id));
    let frame = 0;
    const measure = () => {
      frame = 0;
      // A heading reached by an anchor sits just below the top scroll margin.
      const line = viewport.getBoundingClientRect().top + 32;
      let low = 0;
      let high = headings.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (headings[mid].getBoundingClientRect().top <= line) low = mid + 1;
        else high = mid;
      }
      const atEnd =
        viewport.scrollTop > 0 &&
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;
      setActive(headings[atEnd ? headings.length - 1 : low - 1]?.id ?? null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
    resize?.observe(viewport);
    resize?.observe(article);
    viewport.addEventListener('scroll', schedule, { passive: true });
    viewport.addEventListener('toggle', schedule, true);
    measure();
    return () => {
      viewport.removeEventListener('scroll', schedule);
      viewport.removeEventListener('toggle', schedule, true);
      resize?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [viewportRef, articleRef, page]);
  return active;
}
