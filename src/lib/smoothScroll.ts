import type Lenis from 'lenis';

// The landing's smooth scroller while it is mounted (fine pointers only); everywhere else the page scrolls natively.
let scroller: Lenis | null = null;

export function setScroller(next: Lenis | null) {
  scroller = next;
}

// Lenis skips the native scroll event after its own last step, so a jump in that frame (find in page, a
// control taking focus) leaves it measuring from where it stopped. At rest it takes the page's position first.
function settle(lenis: Lenis) {
  if (!lenis.isScrolling) lenis.animatedScroll = lenis.targetScroll = lenis.actualScroll;
  return lenis;
}

// Anchors land below the sticky header: both paths honour the root's scroll-padding-top, which holds its height.
export function scrollToTarget(target: HTMLElement, immediate: boolean) {
  if (scroller) settle(scroller).scrollTo(target, { immediate, force: true });
  else target.scrollIntoView({ behavior: immediate ? 'instant' : 'auto' });
}

// Scrolls to a page offset, smoothly unless `immediate`, and calls `done` on arrival.
export function scrollToY(top: number, done?: () => void, immediate = false) {
  if (scroller) {
    settle(scroller).scrollTo(top, { immediate, force: true, onComplete: () => done?.() });
    return;
  }
  if (immediate || Math.abs(window.scrollY - top) < 2) {
    window.scrollTo({ top, behavior: 'instant' });
    done?.();
    return;
  }
  window.scrollTo({ top, behavior: 'smooth' });
  if (!done) return;
  // `scrollend` may never come (no support, or another scroll cut this one short); a timer backs it up.
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
  };
  window.addEventListener('scrollend', finish, { once: true });
  setTimeout(finish, 1200);
}

// A modal freezes the page: overflow stops native scrolling, but the smooth scroller
// scrolls programmatically and has to stop on its own.
export function lockScroll() {
  document.body.style.overflow = 'hidden';
  scroller?.stop();
}

export function unlockScroll() {
  document.body.style.overflow = '';
  scroller?.start();
}
