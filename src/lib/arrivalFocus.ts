import { useEffect } from 'react';
import { useNavigationType } from 'react-router';

// After following a link to another page, focus moves to its heading (`h1` with `tabIndex={-1}`):
// screen readers announce it and the next Tab continues from there. Loads, back/forward and anchors
// keep the browser's own. Lazy pages and loading states swap their heading in later, so until the
// visitor acts, a heading lost to a re-render hands focus to the new one. The landing's takes none.
export function useArrivalFocus(pathname: string, hash: string) {
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType !== 'PUSH' || hash) return;
    // Focus never leaves something the visitor is using; the old page's link is gone by now.
    const focusHeading = () => {
      if (document.activeElement && document.activeElement !== document.body) return;
      document.querySelector<HTMLElement>('main h1[tabindex="-1"]')?.focus({ preventScroll: true });
    };
    focusHeading();
    const observer = new MutationObserver(focusHeading);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(stop, 10_000);
    window.addEventListener('pointerdown', stop, true);
    window.addEventListener('keydown', stop, true);
    function stop() {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', stop, true);
      window.removeEventListener('keydown', stop, true);
    }
    return stop;
  }, [pathname, hash, navigationType]);
}
