import type { RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { setScroller } from '../../../lib/smoothScroll';
import { playVisuals, stackCards, tiltCards } from './bento';
import { buildBook } from './book';
import { footerSweep, headerStates, magnetize, navSpy, outroLight, tickerSpeed } from './chrome';
import { buildFilm } from './film';
import { buildPath, scrubPath } from './path';
import { onScreen, rise } from './scene';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin);
// Mobile toolbars resize the viewport as they slide; re-measuring then would make scenes jump.
ScrollTrigger.config({ ignoreMobileResize: true });
gsap.defaults({ ease: 'expo.out', duration: 1 });

const conditions = {
  motion: '(prefers-reduced-motion: no-preference)',
  fine: '(hover: hover) and (pointer: fine)',
  wide: '(min-width: 901px)',
  narrow: '(max-width: 700px)',
};

// Wheel and trackpad scrolling glide; touch keeps the platform's own momentum.
function smoothScroll() {
  const lenis = new Lenis({ autoRaf: false, anchors: false });
  const tick = (time: number) => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  setScroller(lenis);
  return () => {
    setScroller(null);
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
  };
}

// A heading rises line by line from behind a mask; the rest of its group follows.
function revealHeads(root: HTMLElement) {
  gsap.utils.toArray<HTMLElement>('[data-reveal="head"]', root).forEach(head => {
    if (onScreen(head)) return;
    // Early enough that a heading is already rising when it comes into view, so no empty band opens above it.
    const trigger = () => ({ trigger: head, start: 'top 90%', once: true });
    const title = head.querySelector<HTMLElement>('h1, h2');
    if (title) SplitText.create(title, {
      // `reduceWhiteSpace` would turn the copy's non-breaking spaces into plain ones and free the words they bind.
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, reduceWhiteSpace: false,
      // A re-split (resize, late font) replaces this tween and keeps its progress.
      onSplit: split => gsap.from(split.lines, { yPercent: 108, duration: 1.2, stagger: 0.1, scrollTrigger: trigger() }),
    });
    gsap.from([...head.children].filter(child => child !== title), { opacity: 0, y: rise(26), stagger: 0.08, delay: 0.12, scrollTrigger: trigger() });
  });
}

// Cards and panels arrive in small waves as they enter. The pinned path runs its own steps.
function revealBlocks(root: HTMLElement, wide: boolean) {
  const blocks = gsap.utils.toArray<HTMLElement>('.reveal', root).filter(block => !onScreen(block) && !(wide && block.closest('.path-scene')));
  if (!blocks.length) return;
  gsap.set(blocks, { opacity: 0, y: rise(48) });
  ScrollTrigger.batch(blocks, {
    start: 'top 94%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, overwrite: true }),
  });
}

// Keyboard focus shows its block at once instead of waiting for, or sitting through, the entrance.
function revealOnFocus(root: HTMLElement, signal: AbortSignal) {
  root.addEventListener('focusin', event => {
    const group = (event.target as Element).closest<HTMLElement>('.reveal, [data-reveal]');
    if (!group) return;
    gsap.getTweensOf([group, ...group.querySelectorAll('*')]).forEach(tween => tween.progress(1));
    if (group.classList.contains('reveal')) gsap.set(group, { opacity: 1, y: 0 });
  }, { signal });
}

function scrubMeter(root: HTMLElement) {
  const meter = root.querySelector('.scroll-meter');
  if (meter) gsap.fromTo(meter, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
}

// Positions go stale when fonts swap in or content changes height (an answer opening, a notice above the page).
function keepMeasured(root: HTMLElement) {
  let timer = 0;
  const refresh = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  };
  const observer = new ResizeObserver(refresh);
  observer.observe(root);
  void document.fonts.ready.then(refresh);
  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
}

// Renders nothing: brings the landing's static markup to life and sets `main[data-motion]` to "on".
// Reduced motion (even when switched on later) reverts everything to the static page.
export default function LandingMotion({ main }: { main: RefObject<HTMLElement | null> }) {
  useGSAP(() => {
    const root = main.current;
    const film = root?.querySelector<HTMLElement>('.film');
    // Arriving after the page gave up waiting (see LandingPage), the layer leaves the static page alone.
    if (!root || !film || root.dataset.motion === 'off') return;
    gsap.matchMedia().add(conditions, context => {
      const { motion, fine, wide, narrow } = context.conditions as Record<keyof typeof conditions, boolean>;
      if (!motion) {
        root.dataset.motion = 'off';
        return;
      }
      const stop = new AbortController();
      const { signal } = stop;
      const stopScrolling = fine ? smoothScroll() : undefined;
      // Smooth scrolling already eases the position; touch scrolling gets its easing from the scrub.
      const stopFilm = buildFilm(film, { scrub: fine ? true : 0.4, wide, fine, signal });
      revealHeads(root);
      revealBlocks(root, wide);
      playVisuals(root, fine, signal);
      if (fine && wide) tiltCards(root, signal);
      if (narrow) stackCards(root);
      if (wide) buildPath(root, signal);
      else scrubPath(root);
      buildBook(root, { fine, wide, signal });
      const stopHeader = headerStates(root, film);
      const stopSpy = navSpy();
      if (fine) {
        magnetize(root, signal);
        outroLight(root, signal);
      }
      tickerSpeed(root);
      footerSweep();
      scrubMeter(root);
      revealOnFocus(root, signal);
      const stopMeasuring = keepMeasured(root);
      root.dataset.motion = 'on';
      return () => {
        stop.abort();
        stopMeasuring();
        stopHeader();
        stopSpy();
        stopFilm();
        stopScrolling?.();
        root.dataset.motion = 'pending';
      };
    });
  }, { scope: main });
  return null;
}
