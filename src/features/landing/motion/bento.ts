import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onScreen } from './scene';

// Each skill visual tells its small story once, when its card arrives. Start states are set here;
// `--done` and `--fill` drive pseudo-elements in landing.css and stay finished without motion.
const stories: Record<string, (visual: Element, timeline: gsap.core.Timeline) => void> = {
  'visual-prompt': (visual, timeline) => {
    const chips = visual.querySelectorAll('.prompt-chips > span');
    gsap.set(chips, { opacity: 0, y: 18, scale: 0.9 });
    timeline.to(chips, { opacity: 1, y: 0, scale: 1, stagger: 0.14, duration: 0.8, ease: 'back.out(1.6)' })
      .fromTo(visual.querySelectorAll('.prompt-foot b'), { scale: 1 }, { scale: 1.2, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, '+=0.05');
  },
  // Lines of CLAUDE.md type themselves out.
  'visual-file': (visual, timeline) => {
    const lines = visual.querySelectorAll('p');
    gsap.set(lines, { clipPath: 'inset(0 100% 0 0)' });
    timeline.to(lines, { clipPath: 'inset(0 0% 0 0)', stagger: 0.32, duration: 0.5, ease: 'steps(16)' });
  },
  'visual-plan': (visual, timeline) => {
    const items = visual.querySelectorAll('li');
    gsap.set(items, { '--done': 0 });
    timeline.to(items, { '--done': 1, stagger: 0.42, duration: 0.45, ease: 'power2.out' }, 0.2);
  },
  // The diff, the reviewer's note, then the agent's answer to it.
  'visual-diff': (visual, timeline) => {
    const lines = visual.querySelectorAll('p:not(.diff-reply)');
    const note = visual.querySelectorAll('span');
    const reply = visual.querySelectorAll('.diff-reply');
    gsap.set(lines, { opacity: 0, x: -10 });
    gsap.set(note, { opacity: 0, y: 10, scale: 0.94 });
    gsap.set(reply, { clipPath: 'inset(0 100% 0 0)' });
    timeline.to(lines, { opacity: 1, x: 0, stagger: 0.28, duration: 0.6, ease: 'power3.out' })
      .to(note, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.7)' }, '+=0.1')
      .to(reply, { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'steps(24)' }, '+=0.35');
  },
  // The hook fires on the edit, each check hands over to the next and logs its time, then the check mark pops.
  'visual-pipeline': (visual, timeline) => {
    const hook = visual.querySelectorAll('.pipeline-hook');
    const links = [...visual.querySelectorAll('.pipeline-track i')];
    const logs = [...visual.querySelectorAll('.pipeline-log li')];
    const check = visual.querySelectorAll('.pipeline-track b');
    gsap.set(hook, { opacity: 0, x: -8 });
    gsap.set(links, { '--fill': 0 });
    gsap.set(logs, { opacity: 0, y: 6 });
    gsap.set(check, { scale: 0 });
    timeline.to(hook, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' });
    links.forEach((link, index) => {
      timeline.to(link, { '--fill': 1, duration: 0.45, ease: 'power1.inOut' });
      const log = logs[index];
      if (log) timeline.to(log, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, '-=0.15');
    });
    timeline.to(check, { scale: 1, duration: 0.7, ease: 'back.out(2.2)' }, '-=0.1');
  },
  // Branches draw themselves off main, gather a commit each and merge back.
  'visual-branches': (visual, timeline) => {
    const branches = visual.querySelectorAll('path:not(.branch-main)');
    const commits = visual.querySelectorAll('circle:not(.branch-merge)');
    const merges = visual.querySelectorAll('.branch-merge');
    gsap.set(branches, { drawSVG: '0%' });
    gsap.set([...commits, ...merges], { scale: 0, transformOrigin: '50% 50%' });
    timeline.to(branches, { drawSVG: '100%', stagger: 0.22, duration: 1.2, ease: 'power2.inOut' })
      .to(commits, { scale: 1, stagger: 0.18, duration: 0.4, ease: 'back.out(2)' }, 0.45)
      .to(merges, { scale: 1, stagger: 0.16, duration: 0.45, ease: 'back.out(2)' }, 1.1);
  },
};

// A pointer coming back to a finished card plays its story again.
export function playVisuals(root: HTMLElement, fine: boolean, signal: AbortSignal) {
  root.querySelectorAll<HTMLElement>('.skill-card').forEach(card => {
    const visual = card.querySelector('.skill-visual > *');
    const tell = visual && stories[visual.classList[0] ?? ''];
    if (!visual || !tell || onScreen(visual)) return;
    const timeline = gsap.timeline({ paused: true });
    tell(visual, timeline);
    ScrollTrigger.create({ trigger: card, start: 'top 72%', once: true, onEnter: () => { timeline.play(); } });
    if (fine) card.addEventListener('pointerenter', () => { if (timeline.progress() === 1) timeline.restart(); }, { signal });
  });
}

// Cards lean a few degrees toward a mouse pointer.
export function tiltCards(root: HTMLElement, signal: AbortSignal) {
  root.querySelectorAll<HTMLElement>('.skill-card').forEach(card => {
    gsap.set(card, { transformPerspective: 900 });
    const turnX = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const turnY = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    card.addEventListener('pointermove', event => {
      const box = card.getBoundingClientRect();
      turnY(((event.clientX - box.left) / box.width - 0.5) * 6);
      turnX(((event.clientY - box.top) / box.height - 0.5) * -6);
    }, { signal });
    card.addEventListener('pointerleave', () => { turnX(0); turnY(0); }, { signal });
  });
}

// On a phone the cards stack as they stick (landing.css: top 84px + 12px per card): each one
// arriving settles the one beneath it back.
export function stackCards(root: HTMLElement) {
  const cards = gsap.utils.toArray<HTMLElement>('.skill-card', root);
  cards.slice(0, -1).forEach((card, index) => {
    gsap.to(card, {
      scale: 0.94, '--shade': 0.55, ease: 'none',
      scrollTrigger: { trigger: cards[index + 1], start: 'top bottom', end: `top top+=${84 + (index + 1) * 12}`, scrub: true },
    });
  });
}
