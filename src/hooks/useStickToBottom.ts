import { useCallback, useRef } from 'react';

/**
 * Keeps a scrolling list pinned to its newest (bottom) item when the list
 * gets shorter, e.g. when the on-screen keyboard opens and shrinks the page,
 * as long as the user was already at the bottom. Reading older messages
 * (scrolled up) is left alone. Returns a callback ref for the list element.
 */
export function useStickToBottom() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((el: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) return;
    const atBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    let wasAtBottom = atBottom();
    let lastTop = el.scrollTop;
    // Only scrolling up unpins; a smooth scroll down to a new message keeps it pinned
    const onScroll = () => {
      if (atBottom()) wasAtBottom = true;
      else if (el.scrollTop < lastTop - 2) wasAtBottom = false;
      lastTop = el.scrollTop;
    };
    const ro = new ResizeObserver(() => {
      if (wasAtBottom) el.scrollTop = el.scrollHeight;
    });
    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    cleanupRef.current = () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);
}
