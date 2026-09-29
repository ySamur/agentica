// One live query for the whole app; `.matches` follows OS setting changes.
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

export function savesData() {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

// The landing's scenes need motion, data to spare for the film's frames and room for a pinned stage.
export function motionAllowed() {
  return !prefersReducedMotion() && !savesData() && window.innerHeight >= 560;
}
