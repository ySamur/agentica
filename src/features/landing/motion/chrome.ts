import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// The header stays clear over the film, turns to glass below it, and steps aside while the reader
// scrolls down (it returns on the way up). CSS reads `main[data-header]`.
export function headerStates(root: HTMLElement, film: HTMLElement) {
  const set = (state: string) => { if (root.dataset.header !== state) root.dataset.header = state; };
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: self => {
      const filmEnd = film.offsetTop + film.offsetHeight - 120;
      if (window.scrollY < filmEnd) set('clear');
      else if (self.direction === 1 && self.getVelocity() > 60) set('hidden');
      else if (self.direction === -1) set('glass');
      else if (root.dataset.header === 'clear') set('glass');
    },
  });
  return () => { root.dataset.header = 'clear'; };
}

// Call-to-action pills lean toward a mouse pointer and spring back when it leaves.
export function magnetize(root: HTMLElement, signal: AbortSignal) {
  root.querySelectorAll<HTMLElement>('.glow-button').forEach(button => {
    const moveX = gsap.quickTo(button, 'x', { duration: 0.5, ease: 'power3.out' });
    const moveY = gsap.quickTo(button, 'y', { duration: 0.5, ease: 'power3.out' });
    button.addEventListener('pointermove', event => {
      const box = button.getBoundingClientRect();
      moveX((event.clientX - box.left - box.width / 2) * 0.24);
      moveY((event.clientY - box.top - box.height / 2) * 0.36);
    }, { signal });
    button.addEventListener('pointerleave', () => { moveX(0); moveY(0); }, { signal });
  });
}

// The ticker drifts on its own, rushes and leans with a fast scroll, and rests off screen.
export function tickerSpeed(root: HTMLElement) {
  const ticker = root.querySelector<HTMLElement>('.ticker');
  const track = ticker?.querySelector<HTMLElement>('.ticker-track');
  if (!ticker || !track) return;
  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 42, repeat: -1, paused: true });
  const lean = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });
  let settle: gsap.core.Tween | undefined;
  ScrollTrigger.create({
    trigger: ticker,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => { loop.paused(!self.isActive); },
    onUpdate: self => {
      const velocity = self.getVelocity();
      loop.timeScale(gsap.utils.clamp(1, 6, 1 + Math.abs(velocity) / 350));
      lean(gsap.utils.clamp(-7, 7, velocity / -260));
      settle?.kill();
      settle = gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.1, ease: 'power2.out', onStart: () => lean(0) });
    },
  });
}

// The finale's glow follows a mouse pointer across the card.
export function outroLight(root: HTMLElement, signal: AbortSignal) {
  const card = root.querySelector<HTMLElement>('.outro-card');
  if (!card) return;
  const glowX = gsap.quickTo(card, '--gx', { duration: 0.9, ease: 'power3.out' });
  const glowY = gsap.quickTo(card, '--gy', { duration: 0.9, ease: 'power3.out' });
  card.addEventListener('pointermove', event => {
    const box = card.getBoundingClientRect();
    glowX(event.clientX - box.left - box.width / 2);
    glowY(event.clientY - box.top - box.height / 2);
  }, { signal });
  card.addEventListener('pointerleave', () => { glowX(0); glowY(0); }, { signal });
}

// A band of light runs across the footer's wordmark as it comes into view.
export function footerSweep() {
  const mark = document.querySelector<HTMLElement>('.footer-mark');
  if (!mark) return;
  gsap.fromTo(mark, { '--sweep': 100 }, { '--sweep': 40, ease: 'none', scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true } });
}
