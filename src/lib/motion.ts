// One live query for the whole app; `.matches` follows OS setting changes.
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

// Network Information and Device Memory: Chromium only; elsewhere both read as unknown.
const device = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };

export function savesData() {
  return device.connection?.saveData === true;
}

// A slow connection (2g/3g) or a device with 2 GB of memory or less: media that fits the budget.
export function leanDevice() {
  return /2g|3g/.test(device.connection?.effectiveType ?? '') || (device.deviceMemory ?? 8) <= 2;
}

// The landing's scenes need motion, data to spare for the film's frames and room for a pinned stage.
export function motionAllowed() {
  return !prefersReducedMotion() && !savesData() && window.innerHeight >= 560;
}
