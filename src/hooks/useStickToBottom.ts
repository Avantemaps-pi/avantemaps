import { useCallback, useRef } from 'react';

/**
 * Keeps a scrolling list pinned to its newest (bottom) item when the list
 * gets shorter, e.g. when the on-screen keyboard opens and shrinks the page,
 * or when an item in it grows (a verification card revealing its rows), as
 * long as the user was already at the bottom. Reading older messages
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
    // Item heights seen so far. A new item's first report is skipped, so a new message
    // keeps its own (smooth) scroll; only an item that changes height re-pins
    const heights = new WeakMap<Element, number>();
    const ro = new ResizeObserver((entries) => {
      const grew = entries.some((entry) => {
        if (entry.target === el) return true;
        const height = entry.contentRect.height;
        const before = heights.get(entry.target);
        heights.set(entry.target, height);
        return before !== undefined && before !== height;
      });
      if (grew && wasAtBottom) el.scrollTop = el.scrollHeight;
    });
    const mo = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) ro.observe(node);
      }));
    });
    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));
    mo.observe(el, { childList: true });
    cleanupRef.current = () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
}
