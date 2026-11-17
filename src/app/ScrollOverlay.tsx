import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

type Metrics = { size: number; progress: number; max: number; page: number };

export function scrollMetrics(
  page: number,
  total: number,
  track: number,
  offset: number,
): Metrics {
  const max = Math.max(0, total - page);
  const size =
    max > 1 && track > 0
      ? Math.min(1, Math.max(24 / track, page / (page + max)))
      : 1;
  const progress = max > 1 ? Math.max(0, Math.min(1, offset / max)) : 0;
  return { size, progress, max, page };
}

export function ScrollOverlay({
  viewportRef,
  controls,
  label,
}: {
  viewportRef: RefObject<HTMLElement>;
  controls: string;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLSpanElement>(null);
  const bottomRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{
    id: number;
    position: number;
    offset: number;
    scale: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    size: 1,
    progress: 0,
    max: 0,
    page: 0,
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const parent = track?.parentElement;
    if (!viewport || !track || !parent) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = scrollMetrics(
        viewport.clientHeight,
        viewport.scrollHeight,
        track.clientHeight,
        viewport.scrollTop,
      );
      setMetrics((old) =>
        old.size === next.size &&
        old.progress === next.progress &&
        old.max === next.max &&
        old.page === next.page
          ? old
          : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
    const observe = () => {
      resize?.disconnect();
      resize?.observe(viewport);
      resize?.observe(track);
      for (const child of viewport.children) resize?.observe(child);
      schedule();
    };
    const mutation = new MutationObserver(observe);
    mutation.observe(viewport, { childList: true, subtree: true });
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      for (const shadow of [topRef.current, bottomRef.current]) {
        if (!shadow) continue;
        const rect = shadow.getBoundingClientRect();
        shadow.dataset.hovered = String(
          event.clientX >= rect.left &&
            event.clientX < rect.right &&
            event.clientY >= rect.top &&
            event.clientY < rect.bottom,
        );
      }
    };
    const leave = () => {
      for (const shadow of [topRef.current, bottomRef.current])
        if (shadow) shadow.dataset.hovered = 'false';
    };
    viewport.addEventListener('scroll', schedule, { passive: true });
    viewport.addEventListener('load', schedule, true);
    parent.addEventListener('pointermove', move, { passive: true });
    parent.addEventListener('pointerleave', leave);
    observe();
    return () => {
      resize?.disconnect();
      mutation.disconnect();
      viewport.removeEventListener('scroll', schedule);
      viewport.removeEventListener('load', schedule, true);
      parent.removeEventListener('pointermove', move);
      parent.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(frame);
    };
  }, [viewportRef]);

  const scrollTo = (value: number) =>
    viewportRef.current?.scrollTo({
      top: Math.max(0, Math.min(metrics.max, value)),
      behavior: 'instant',
    });
  const endDrag = (event: PointerEvent) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (
      event.currentTarget instanceof HTMLElement &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    )
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const scrollable = metrics.size < 1;
  return (
    <>
      <span
        ref={topRef}
        class="scroll-shadow scroll-shadow--top"
        data-visible={scrollable && metrics.progress * metrics.max > 1}
        aria-hidden="true"
      />
      <span
        ref={bottomRef}
        class="scroll-shadow scroll-shadow--bottom"
        data-visible={scrollable && (1 - metrics.progress) * metrics.max > 1}
        aria-hidden="true"
      />
      <div
        ref={trackRef}
        class="scroll-track"
        data-scrollable={scrollable}
        data-dragging={dragging}
        role="scrollbar"
        aria-label={label}
        aria-controls={controls}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(metrics.progress * 100)}
        aria-hidden={!scrollable}
        tabIndex={scrollable ? 0 : -1}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          const track = event.currentTarget;
          const rect = track.getBoundingClientRect();
          const travel = rect.height * (1 - metrics.size);
          if (metrics.max <= 1 || travel <= 0) return;
          event.preventDefault();
          let offset = viewportRef.current?.scrollTop ?? 0;
          if (event.target === track) {
            offset =
              Math.max(
                0,
                Math.min(
                  1,
                  (event.clientY -
                    rect.top -
                    (rect.height * metrics.size) / 2) /
                    travel,
                ),
              ) * metrics.max;
            scrollTo(offset);
          }
          dragRef.current = {
            id: event.pointerId,
            position: event.clientY,
            offset,
            scale: metrics.max / travel,
          };
          track.setPointerCapture(event.pointerId);
          track.focus({ preventScroll: true });
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (drag?.id === event.pointerId)
            scrollTo(
              drag.offset + (event.clientY - drag.position) * drag.scale,
            );
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(event) => {
          const offset = viewportRef.current?.scrollTop ?? 0;
          const delta =
            event.key === 'ArrowDown'
              ? 40
              : event.key === 'ArrowUp'
                ? -40
                : event.key === 'PageDown'
                  ? metrics.page
                  : event.key === 'PageUp'
                    ? -metrics.page
                    : event.key === ' '
                      ? metrics.page * (event.shiftKey ? -1 : 1)
                      : null;
          const target =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? metrics.max
                : delta === null
                  ? null
                  : offset + delta;
          if (target === null) return;
          event.preventDefault();
          scrollTo(target);
        }}
        onWheel={(event) => {
          if (event.ctrlKey || event.metaKey || !event.deltaY) return;
          const offset = viewportRef.current?.scrollTop ?? 0;
          if (
            (event.deltaY < 0 && offset <= 0) ||
            (event.deltaY > 0 && offset >= metrics.max)
          )
            return;
          event.preventDefault();
          scrollTo(
            offset +
              event.deltaY *
                (event.deltaMode === 1
                  ? 40
                  : event.deltaMode === 2
                    ? metrics.page
                    : 1),
          );
        }}
      >
        <span
          class="scroll-thumb"
          style={{
            height: `${metrics.size * 100}%`,
            top: `${metrics.progress * (1 - metrics.size) * 100}%`,
          }}
        />
      </div>
    </>
  );
}
