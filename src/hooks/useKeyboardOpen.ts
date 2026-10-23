import { useEffect, useState } from 'react';

// How far the viewport must shrink below its tallest height to count as a keyboard
const KEYBOARD_MIN_PX = 150;
// After a rotation, resizes in this window set a fresh baseline height
const ORIENTATION_SETTLE_MS = 1000;

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden',
]);

const isTextEntry = (el: Element | null) => {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(el.type) && !el.readOnly && !el.disabled;
  }
  return el instanceof HTMLElement && el.isContentEditable;
};

const viewportHeight = () => window.visualViewport?.height ?? window.innerHeight;

/**
 * True while an on-screen keyboard is open: a text field is focused AND the
 * viewport has shrunk. The second check covers Android's Back button (hides
 * the keyboard but keeps focus) and hardware keyboards (never shrink).
 */
export function useKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    let maxHeight = viewportHeight();
    let resetUntil = 0;

    const update = () => {
      const h = viewportHeight();
      if (Date.now() < resetUntil) maxHeight = h;
      else if (h > maxHeight) maxHeight = h;
      const shrunk = maxHeight - h >= KEYBOARD_MIN_PX;
      setKeyboardOpen(shrunk && isTextEntry(document.activeElement));
    };
    const onOrientationChange = () => {
      resetUntil = Date.now() + ORIENTATION_SETTLE_MS;
      update();
    };

    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('orientationchange', onOrientationChange);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrientationChange);
    };
  }, []);

  return keyboardOpen;
}
