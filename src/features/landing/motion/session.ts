import { gsap } from 'gsap';
import { phases } from '../introPhases';
import { chipSteps, script, statusOf } from '../sessionScript';
import { sceneRange } from './scene';

// Script timing in abstract units: typed lines take time per character, every line leaves a pause.
const perCharacter = 0.035;
const schedule = (() => {
  let time = 0;
  return script.map(line => {
    const start = time;
    const typing = line.typed ? line.text.length * perCharacter : 0;
    time += typing + (line.typed ? 0.5 : 0.6);
    return { start, typing };
  });
})();
const total = (schedule.at(-1)?.start ?? 0) + 0.6;
const chipKeys = ['plan', 'diff', 'tests'] as const;

// The terminal types its script as the intro scrolls; scrolling back rewinds it. Returns a cleanup
// that puts the finished session back for the static page. A wide window keeps room for every line
// from the start; a narrow one grows like a real terminal, newest line at the bottom.
export function buildSession(film: HTMLElement, scrub: boolean | number, wide: boolean) {
  const scene = film.querySelector<HTMLElement>('.session-scene');
  if (!scene) return () => {};
  const lines = [...scene.querySelectorAll<HTMLElement>('.session-line')];
  const texts = lines.map(line => line.querySelector<HTMLElement>('.session-text'));
  const status = scene.querySelector<HTMLElement>('.session-status > span');
  const bar = scene.querySelector<HTMLElement>('.session-progress > i');
  // Chips keep their CSS transitions and pointer parallax, so they are toggled by class, not tweened.
  const chips = chipKeys.map(key => scene.querySelector<HTMLElement>(`.session-chip-${key}`));
  let step = -2;
  let typed = -2;
  // Reverting the scene replays the clock's update; by then the static session is back and must stay.
  let active = true;

  const render = (time: number) => {
    if (!active) return;
    let current = -1;
    schedule.forEach((line, index) => { if (line.start <= time) current = index; });
    const line = script[current];
    const characters = line?.typed ? Math.min(line.text.length, Math.floor((time - schedule[current].start) / perCharacter)) : -1;
    if (current !== step) {
      step = current;
      lines.forEach((element, index) => {
        element.style.setProperty(wide ? 'visibility' : 'display', index <= current ? '' : wide ? 'hidden' : 'none');
        element.classList.toggle('is-current', index === current);
      });
      texts.forEach((text, index) => { if (text && script[index].typed && index !== current) text.textContent = index < current ? script[index].text : ''; });
      if (status) status.textContent = statusOf(Math.max(0, current));
      scene.classList.toggle('session-done', current === script.length - 1);
      bar?.style.setProperty('scale', `${(current + 1) / script.length} 1`);
      chips.forEach((chip, index) => chip?.classList.toggle('is-shown', current >= chipSteps[chipKeys[index]]));
    }
    const text = texts[current];
    if (line?.typed && text && characters !== typed) text.textContent = line.text.slice(0, Math.max(0, characters));
    typed = characters;
  };

  const clock = { time: 0 };
  // A refresh sets the clock without firing its update (say, the page was scrolled before the first
  // measure), so the terminal renders on both.
  gsap.to(clock, { time: total, ease: 'none', scrollTrigger: { ...sceneRange(film, ...phases.typing, scrub), onRefresh: () => render(clock.time) }, onUpdate: () => render(clock.time) });
  render(0);

  return () => {
    active = false;
    bar?.style.removeProperty('scale');
    chips.forEach(chip => chip?.classList.add('is-shown'));
    lines.forEach((element, index) => {
      element.style.removeProperty('visibility');
      element.style.removeProperty('display');
      element.classList.toggle('is-current', index === lines.length - 1);
    });
    texts.forEach((text, index) => { if (text) text.textContent = script[index].text; });
    if (status) status.textContent = statusOf(script.length - 1);
    scene.classList.add('session-done');
  };
}
