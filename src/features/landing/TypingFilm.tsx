import { useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { motionAllowed } from '../../lib/motion';
import { scrollToY } from '../../lib/smoothScroll';
import { nbsp } from '../../lib/typography';
import { ClaudeSession } from './ClaudeSession';
import { heroAt } from './introPhases';

// Stills cut from "A Person Typing on a Keyboard" by Mikhail Nilov (Pexels license, free to use), with the
// brand grade baked in. The motion layer (motion/film.ts) plays them and every other part of this scene.
const beats = [
  { key: 'hands', text: <>Годами разработчик<br />писал код руками.</> },
  { key: 'lines', text: <>{nbsp('Строка за строкой.')}<br />{nbsp('Символ за символом.')}</> },
  { key: 'agent', text: <><span>Теперь код</span><br /><span>пишет агент.</span></> },
];

// One sticky stage for the opening: the film's story, then the agent's terminal, then the hero
// (`children`). Without motion the same parts simply stack: a still with every line, then the hero.
export function TypingFilm({ children }: { children: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  // Reduced motion and data saver get one still instead of several megabytes of frames.
  const [moving] = useState(motionAllowed);

  function skipIntro() {
    const film = section.current;
    if (!film) return;
    const cta = film.querySelector<HTMLElement>('.film-hero .glow-button');
    scrollToY(film.offsetTop + (film.offsetHeight - window.innerHeight) * heroAt, () => cta?.focus({ preventScroll: true }));
  }

  return <section ref={section} className="film" id="home" aria-label="Вступление">
    <div className="film-sticky">
      <div className="film-scene">
        <div className="film-media" aria-hidden="true">
          {moving && <canvas className="film-canvas" />}
          <div className="film-shade" />
        </div>
        <div className="film-copy container">
          <span className="film-eyebrow"><i /> Эпоха ИИ-агентов</span>
          {/* Lines are split into characters and scrambled on screen; readers get them whole. */}
          <p className="visually-hidden">Годами разработчик писал код руками. Строка за строкой, символ за символом. Теперь код пишет агент.</p>
          <div className="film-lines" aria-hidden="true">
            {beats.map(beat => <p className="film-line" data-beat={beat.key} key={beat.key}>{beat.text}</p>)}
          </div>
        </div>
      </div>
      <div className="film-hero container">
        <div className="film-hero-copy">{children}</div>
        <ClaudeSession />
      </div>
      {moving && <>
        <button type="button" className="film-skip" onClick={skipIntro}>Пропустить интро <Icon name="arrow" size={15} /></button>
        <span className="film-cue" aria-hidden="true">Листайте<i /></span>
      </>}
    </div>
  </section>;
}
