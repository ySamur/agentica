import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToY } from '../../../lib/smoothScroll';

// Wide screens: the six steps share one pinned stage. The step on stage follows the scroll; CSS
// transitions (driven by `is-active`, `--step` and `aria-current`) move the counter, text and terminal.
export function buildPath(root: HTMLElement, signal: AbortSignal) {
  const scene = root.querySelector<HTMLElement>('.path-scene');
  if (!scene) return;
  const items = [...scene.querySelectorAll<HTMLElement>('.path-step')];
  const panes = [...scene.querySelectorAll<HTMLElement>('.path-pane')];
  const buttons = [...scene.querySelectorAll<HTMLButtonElement>('.path-rail button')];
  const count = items.length;
  let active = -1;

  const show = (next: number) => {
    if (next === active) return;
    active = next;
    scene.dataset.step = String(next);
    scene.style.setProperty('--step', String(next));
    items.forEach((item, index) => item.classList.toggle('is-active', index === next));
    panes.forEach((pane, index) => pane.classList.toggle('is-active', index === next));
    buttons.forEach((button, index) => { if (index === next) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  };
  const fromProgress = (progress: number) => show(Math.min(count - 1, Math.floor(progress * count)));

  const trigger = ScrollTrigger.create({
    trigger: scene,
    start: 'top top+=88',
    end: 'bottom bottom',
    onUpdate: self => fromProgress(self.progress),
    onRefresh: self => fromProgress(self.progress),
  });
  // Each rail button scrolls to the middle of its step's slice.
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    scrollToY(trigger.start + (trigger.end - trigger.start) * (index + 0.5) / count);
  }, { signal }));
}

// Narrow screens keep the vertical path: its line fills as the steps pass and each number
// lights up when its step arrives.
export function scrubPath(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('.path-list');
  if (!list) return;
  gsap.fromTo(list, { '--path': 0 }, { '--path': 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 65%', end: 'bottom 65%', scrub: true } });
  list.querySelectorAll<HTMLElement>('.path-number').forEach(number => ScrollTrigger.create({
    trigger: number,
    start: 'top 65%',
    onEnter: () => number.classList.add('is-lit'),
    onLeaveBack: () => number.classList.remove('is-lit'),
  }));
}
