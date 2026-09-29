import { gsap } from 'gsap';

// The guide's cover swings open as the section scrolls in, and its chapters line up behind it.
// Wide screens keep the book's slight turn and let a mouse pointer lean it further.
export function buildBook(root: HTMLElement, { fine, wide, signal }: { fine: boolean; wide: boolean; signal: AbortSignal }) {
  const visual = root.querySelector<HTMLElement>('.guide-visual');
  const volume = visual?.querySelector<HTMLElement>('.guide-volume');
  const cover = visual?.querySelector<HTMLElement>('.guide-cover');
  if (!visual || !volume || !cover) return;
  const chapters = visual.querySelectorAll('.guide-chapters > li');
  const turn = { x: wide ? 4 : 0, y: wide ? -8 : 0 };
  gsap.set(volume, { rotationX: turn.x, rotationY: turn.y });
  gsap.set(chapters, { opacity: 0, x: 16 });
  gsap.timeline({ scrollTrigger: { trigger: visual, start: 'top 72%', end: 'center 45%', scrub: true } })
    .fromTo(cover, { rotationY: 0 }, { rotationY: -168, ease: 'power2.inOut', duration: 1 }, 0)
    .to(chapters, { opacity: 1, x: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' }, 0.45);

  if (!fine || !wide) return;
  const leanX = gsap.quickTo(volume, 'rotationX', { duration: 0.8, ease: 'power3.out' });
  const leanY = gsap.quickTo(volume, 'rotationY', { duration: 0.8, ease: 'power3.out' });
  visual.addEventListener('pointermove', event => {
    const box = visual.getBoundingClientRect();
    leanY(turn.y + ((event.clientX - box.left) / box.width - 0.5) * 10);
    leanX(turn.x - ((event.clientY - box.top) / box.height - 0.5) * 8);
  }, { signal });
  visual.addEventListener('pointerleave', () => { leanX(turn.x); leanY(turn.y); }, { signal });
}
