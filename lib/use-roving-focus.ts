import { useCallback } from "react";

/**
 * useRovingFocus
 * Horizontal roving focus across a list of focusable elements (e.g., chips / bubbles).
 * Supports ArrowLeft, ArrowRight, Home, End. Wraps at edges.
 */
export function useRovingFocus<T extends HTMLElement>(refs: React.RefObject<T[]>) {
  return useCallback((e: React.KeyboardEvent) => {
    if (!refs.current || !refs.current.length) return;
    const elList = refs.current.filter(Boolean);
    if (!elList.length) return;
    let index = elList.findIndex(el => el === document.activeElement);
    if (index === -1) index = 0;
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const next = (index + 1) % elList.length;
        elList[next]?.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = (index - 1 + elList.length) % elList.length;
        elList[prev]?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        elList[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        elList[elList.length - 1]?.focus();
        break;
      }
    }
  }, [refs]);
}
