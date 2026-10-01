import { gsap } from 'gsap';
import { frameCount } from '../introPhases';

type FrameSet = 'desktop' | 'desktop-hd' | 'mobile';

const framePath = (set: FrameSet, index: number) => `/frames/typing/${set}/f_${String(index + 1).padStart(3, '0')}.webp`;
const lanes = 6;
// Seconds: how closely the picture trails the scroll while it moves, how softly it settles once it
// rests, and how long without a new position counts as resting.
const follow = 0.04;
const settle = 0.1;
const restAfter = 0.12;
// Milliseconds after the poster before a reader who has not scrolled yet gets the rest anyway.
const idleAfter = 2500;

const slowNetwork = () => /2g|3g/.test((navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? '');

// Phones get the portrait crop around the hands; wide or dense screens on a fast connection the 1920px set.
function pickSet(slow: boolean): FrameSet {
  if (window.matchMedia('(max-aspect-ratio: 4/5)').matches) return 'mobile';
  return window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1700 && !slow ? 'desktop-hd' : 'desktop';
}

// Coarse to fine. Right after the poster: every 16th frame and the last, where the scene rests, so
// a visitor who leaves from the first screen costs a few hundred kilobytes. The rest halves the step
// (8, 4, 2, 1), so scrubbing sharpens as it arrives; a slow connection skips the finest step and the
// blending bridges every other frame.
function loadPlan(slow: boolean) {
  const queued = new Set([0, frameCount - 1]);
  const pass = (step: number) => {
    const indexes: number[] = [];
    for (let index = 0; index < frameCount; index += step) if (!queued.has(index)) { queued.add(index); indexes.push(index); }
    return indexes;
  };
  return { coarse: [frameCount - 1, ...pass(16)], rest: (slow ? [8, 4, 2] : [8, 4, 2, 1]).flatMap(pass) };
}

// Plays the frames as one continuous picture. Between two frames it cross-fades them, so the image
// changes with every pixel of scroll instead of stepping every few dozen; at rest it settles on the
// nearest whole frame, so a still is never a double exposure. Frames still loading are bridged by
// the nearest loaded ones.
export function frameSequence(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { alpha: false });
  const slow = slowNetwork();
  const set = pickSet(slow);
  const images: HTMLImageElement[] = [];
  const ready = new Set<number>();
  const { coarse, rest } = loadPlan(slow);
  const queue = coarse;
  const stop = new AbortController();
  // Downloads in flight, and whether the poster is in (until then it loads alone).
  let busy = 0;
  let primed = false;
  let idle = 0;
  // Where the scroll puts the footage and what the canvas shows, both in frames.
  let target = 0;
  let shown = 0;
  let movedAt = 0;
  let tickedAt = 0;
  let playing = false;
  let drawn = '';

  const loaded = (from: number, direction: 1 | -1) => {
    for (let index = from; index >= 0 && index < frameCount; index += direction) if (ready.has(index)) return index;
    return -1;
  };

  const cover = (image: HTMLImageElement, alpha: number) => {
    if (!context) return;
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.globalAlpha = alpha;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  };

  const paint = () => {
    const before = loaded(Math.floor(shown), -1);
    const after = loaded(Math.ceil(shown), 1);
    const base = before === -1 ? after : before;
    const next = after === -1 ? base : after;
    const first = images[base];
    const second = images[next];
    if (!context || !first || !second) return;
    // Steps of 1/64 are finer than the eye can tell apart, and a repeated one draws nothing.
    const mix = next === base ? 0 : Math.round(((shown - base) / (next - base)) * 64) / 64;
    const key = `${base} ${next} ${mix}`;
    if (key === drawn) return;
    cover(first, 1);
    if (mix > 0) cover(second, mix);
    context.globalAlpha = 1;
    canvas.classList.add('is-ready');
    drawn = key;
  };

  // Runs on GSAP's ticker after the scroll has updated, so the picture moves in the same frame as the
  // rest of the scene. It stops once the picture rests on a whole frame.
  const tick = (time: number) => {
    const resting = time - movedAt > restAfter;
    const goal = resting ? Math.round(target) : target;
    const elapsed = tickedAt ? Math.min(time - tickedAt, 0.1) : 1 / 60;
    tickedAt = time;
    // Far behind (after a jump or a flick) it catches up quickly; only the last frame settles softly.
    const lag = resting && Math.abs(goal - shown) < 1 ? settle : follow;
    shown += (goal - shown) * (1 - Math.exp(-elapsed / lag));
    if (Math.abs(goal - shown) < 0.002) shown = goal;
    paint();
    if (!resting || shown !== goal) return;
    gsap.ticker.remove(tick);
    playing = false;
    tickedAt = 0;
  };

  const resize = () => {
    // Past the frames' own density a bigger canvas only costs memory.
    const ratio = Math.min(window.devicePixelRatio || 1, set === 'desktop' ? 1.5 : 2);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    drawn = '';
    paint();
  };

  const fetchFrame = async (index: number) => {
    const image = new Image();
    image.src = framePath(set, index);
    images[index] = image;
    // Decoded ahead of drawing, so scrubbing never waits on the main thread.
    try { await image.decode(); } catch { return; }
    if (stop.signal.aborted) return;
    ready.add(index);
    paint();
  };

  const pump = () => {
    if (!primed) return;
    while (busy < lanes && queue.length && !stop.signal.aborted) {
      busy++;
      void fetchFrame(queue.shift() ?? 0).finally(() => { busy--; pump(); });
    }
  };

  const release = () => {
    window.clearTimeout(idle);
    queue.push(...rest.splice(0));
    pump();
  };

  // The first frame comes alone, so it never waits behind the others.
  void fetchFrame(0).then(() => {
    if (stop.signal.aborted) return;
    resize();
    primed = true;
    pump();
    idle = window.setTimeout(release, idleAfter);
  });
  window.addEventListener('resize', resize, { signal: stop.signal });
  // A reader already down the page (a reload, a link to a section) or starting to scroll needs it all.
  if (window.scrollY > 0) release();
  else window.addEventListener('scroll', release, { once: true, passive: true, signal: stop.signal });

  return {
    // `position` is the frame the scroll points at, fractions included.
    show(position: number) {
      target = Math.min(Math.max(position, 0), frameCount - 1);
      movedAt = gsap.ticker.time;
      if (playing) return;
      playing = true;
      gsap.ticker.add(tick);
    },
    destroy() {
      stop.abort();
      window.clearTimeout(idle);
      gsap.ticker.remove(tick);
      images.forEach((image, index) => { if (!ready.has(index)) image.src = ''; });
    },
  };
}
