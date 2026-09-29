import { frameCount } from '../introPhases';

type FrameSet = 'desktop' | 'desktop-hd' | 'mobile';

const framePath = (set: FrameSet, index: number) => `/frames/typing/${set}/f_${String(index + 1).padStart(3, '0')}.webp`;
const lanes = 6;

// Phones get the portrait crop around the hands; wide or dense screens on a fast connection the 1920px set.
function pickSet(): FrameSet {
  if (window.matchMedia('(max-aspect-ratio: 4/5)').matches) return 'mobile';
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const slow = /2g|3g/.test(connection?.effectiveType ?? '');
  return window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1700 && !slow ? 'desktop-hd' : 'desktop';
}

// Coarse to fine: every 8th frame first (and the last, where the scene rests), then the gaps,
// so scrubbing works early and sharpens as the rest arrives.
function loadOrder() {
  const order = [0, frameCount - 1];
  for (let step = 8; step >= 1; step /= 2) {
    for (let index = 0; index < frameCount; index += step) if (!order.includes(index)) order.push(index);
  }
  return order;
}

// Draws the frame nearest to the one asked for, and swaps in the exact one when it arrives.
export function frameSequence(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { alpha: false });
  const set = pickSet();
  const images: HTMLImageElement[] = [];
  const ready = new Set<number>();
  const queue = loadOrder();
  const stop = new AbortController();
  let wanted = 0;
  let drawn = -1;

  const nearest = (index: number) => {
    for (let distance = 0; distance < frameCount; distance++) {
      if (ready.has(index - distance)) return index - distance;
      if (ready.has(index + distance)) return index + distance;
    }
    return -1;
  };

  const paint = () => {
    const index = nearest(wanted);
    const image = images[index];
    if (!context || !image || index === drawn) return;
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    canvas.classList.add('is-ready');
    drawn = index;
  };

  const resize = () => {
    // Past the frames' own density a bigger canvas only costs memory.
    const ratio = Math.min(window.devicePixelRatio || 1, set === 'desktop' ? 1.5 : 2);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    drawn = -1;
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

  const lane = async () => {
    for (let index = queue.shift(); index !== undefined && !stop.signal.aborted; index = queue.shift()) await fetchFrame(index);
  };

  // The first frame comes alone, so it never waits behind the others.
  void fetchFrame(queue.shift() ?? 0).then(() => {
    if (stop.signal.aborted) return;
    resize();
    for (let count = 0; count < lanes; count++) void lane();
  });
  window.addEventListener('resize', resize, { signal: stop.signal });

  return {
    show(index: number) {
      wanted = Math.round(index);
      paint();
    },
    destroy() {
      stop.abort();
      images.forEach(image => { if (!ready.has(images.indexOf(image))) image.src = ''; });
    },
  };
}
