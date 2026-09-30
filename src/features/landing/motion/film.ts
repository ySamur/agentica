import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { scrollToY } from '../../../lib/smoothScroll';
import { frameCount, heroAt, phases } from '../introPhases';
import { frameSequence } from './frames';
import { rise, sceneOffset, sceneRange } from './scene';
import { buildSession } from './session';

const scrambleChars = 'абвгдежзиклмнопрстуфхцчшэюя01{}<>/=';

// The opening scene: hands type while the story unfolds, the agent's terminal takes over, and the
// hero resolves it. Everything follows the scroll; see introPhases.ts for where each part sits.
export function buildFilm(film: HTMLElement, { scrub, wide, fine, signal }: { scrub: boolean | number; wide: boolean; fine: boolean; signal: AbortSignal }) {
  const find = (selector: string) => film.querySelector<HTMLElement>(selector);
  const canvas = film.querySelector<HTMLCanvasElement>('.film-canvas');
  const [hands, lines, agent] = (['hands', 'lines', 'agent'] as const).map(key => find(`[data-beat="${key}"]`));
  const hero = find('.film-hero-copy');
  const title = hero?.querySelector<HTMLElement>('h1');
  const heroRest = hero ? [...hero.children].filter(child => child !== title) : [];

  // The footage follows the scroll to a fraction of a frame; the sequence blends the two nearest ones.
  const sequence = canvas ? frameSequence(canvas) : null;
  const frame = { position: 0 };
  // A refresh moves the proxy without its update, hence the second hook.
  gsap.to(frame, { position: frameCount - 1, ease: 'none', scrollTrigger: { ...sceneRange(film, ...phases.frames, scrub), onRefresh: () => sequence?.show(frame.position) }, onUpdate: () => sequence?.show(frame.position) });
  sequence?.show(0);

  // "Строка за строкой. Символ за символом." arrives character by character. Scrubbed staggers only
  // render their first target's start, so every start state below is set explicitly first.
  const characters = lines ? SplitText.create(lines, { type: 'words,chars', aria: 'none' }).chars : [];
  gsap.set(characters, { opacity: 0 });
  gsap.set(heroRest, { opacity: 0, y: rise(22) });

  // Reverting replays updates; once the cleanup below has run, the section keeps its static state.
  let active = true;
  const master = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      ...sceneRange(film, 0, 1, scrub),
      onUpdate: self => {
        if (active) film.classList.toggle('is-hero', self.progress >= phases.heroLive);
      },
    },
  });
  master.to({}, { duration: 1 }, 0);
  if (canvas) master.fromTo(canvas, { scale: 1.02 }, { scale: 1.08, duration: phases.frames[1] }, 0);
  master.fromTo(film, { '--dim': 0 }, { '--dim': 0.5, duration: 0.12 }, phases.agentIn)
    .to(film, { '--dim': 0.76, duration: 0.08 }, phases.heroIn[0])
    .to(find('.film-cue'), { opacity: 0, duration: 0.03 }, 0)
    .to(hands, { yPercent: -35, opacity: 0, duration: 0.05 }, phases.handsOut)
    .set(lines, { opacity: 1 }, phases.linesIn[0])
    .to(characters, { opacity: 1, duration: 0.004, stagger: { amount: phases.linesIn[1] - phases.linesIn[0] } }, phases.linesIn[0])
    .to(lines, { yPercent: -35, opacity: 0, duration: 0.04 }, phases.linesOut)
    .fromTo(agent, { opacity: 0, yPercent: 25 }, { opacity: 1, yPercent: 0, duration: 0.03 }, phases.agentIn)
    .to([agent, find('.film-eyebrow')], { yPercent: -35, opacity: 0, duration: 0.04 }, phases.agentOut)
    .fromTo(find('.session-scene'), { opacity: 0, y: 70, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.08 }, phases.terminalIn)
    .to(heroRest, { opacity: 1, y: 0, duration: 0.05, stagger: 0.012 }, phases.heroIn[0] + 0.03)
    .to(find('.film-skip'), { opacity: 0, duration: 0.03 }, phases.heroIn[0]);
  // On a phone the terminal takes the eyebrow's place and later yields the stage to the hero;
  // on wide screens it stays beside it.
  if (!wide) master.to(find('.film-eyebrow'), { opacity: 0, duration: 0.03 }, phases.terminalIn)
    .to(find('.session-scene'), { opacity: 0, y: -40, scale: 0.94, duration: 0.05 }, phases.heroIn[0]);

  // The hero's title rises line by line; it has its own trigger because a re-split replaces the tween.
  if (title) {
    gsap.set(title, { opacity: 1 });
    SplitText.create(title, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, reduceWhiteSpace: false,
      onSplit: split => {
        gsap.set(split.lines, { yPercent: 110 });
        return gsap.to(split.lines, { yPercent: 0, ease: 'power2.out', stagger: 0.25, scrollTrigger: sceneRange(film, ...phases.heroIn, scrub) });
      },
    });
  }

  // "Теперь код пишет агент." decodes itself as the agent takes over.
  const agentLines = agent ? [...agent.querySelectorAll('span')].map(span => [span, span.textContent ?? ''] as const) : [];
  ScrollTrigger.create({
    ...sceneRange(film, phases.agentIn, 1, false),
    onEnter: () => agentLines.forEach(([span, text], index) => gsap.to(span, { duration: 1, delay: index * 0.15, scrambleText: { text, chars: scrambleChars, revealDelay: 0.3, speed: 0.5 }, overwrite: true })),
  });

  // Tabbing into the hero before it is on stage brings the stage there at once.
  hero?.addEventListener('focusin', () => {
    if (!film.classList.contains('is-hero')) scrollToY(sceneOffset(film, heroAt), undefined, true);
  }, { signal });

  // The footage leans away from a mouse pointer while the film is on screen.
  if (fine) window.addEventListener('pointermove', event => {
    if (film.getBoundingClientRect().bottom <= 0) return;
    film.style.setProperty('--mx', (event.clientX / window.innerWidth - 0.5).toFixed(3));
    film.style.setProperty('--my', (event.clientY / window.innerHeight - 0.5).toFixed(3));
  }, { passive: true, signal });

  const stopSession = buildSession(film, scrub, wide);
  return () => {
    active = false;
    sequence?.destroy();
    stopSession();
    agentLines.forEach(([span, text]) => { span.textContent = text; });
    film.classList.remove('is-hero');
    ['--dim', '--mx', '--my'].forEach(property => film.style.removeProperty(property));
  };
}
