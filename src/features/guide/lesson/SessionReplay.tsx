import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import { prefersReducedMotion } from '../../../lib/motion';
import type { SessionLine } from './types';

const marks: Record<SessionLine['kind'], string> = { command: '$', meta: '', prompt: '>', info: '●', edit: '✎', pass: '✓', done: '●' };
// Milliseconds: per typed character, and the pause after a line.
const perCharacter = 34;
const pauseAfterTyped = 650;
const pauseAfterLine = 480;

// When each line starts; a typed line also takes time to write.
function schedule(lines: SessionLine[]) {
  let time = 0;
  const starts = lines.map(line => {
    const start = time;
    time += line.typed ? line.text.length * perCharacter + pauseAfterTyped : pauseAfterLine;
    return start;
  });
  return { starts, total: time };
}

// A scripted Claude Code session that plays once it scrolls into view, with pause and replay.
// Reduced motion shows it finished. Screen readers get `summary`; the animated log is hidden from them.
export function SessionReplay({ title, summary, lines }: { title: string; summary: string; lines: SessionLine[] }) {
  const [{ starts, total }] = useState(() => schedule(lines));
  const [still] = useState(prefersReducedMotion);
  const [time, setTime] = useState(still ? total : 0);
  const [playing, setPlaying] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const done = time >= total;

  // Starts the first time most of the window is on screen.
  useEffect(() => {
    const element = scene.current;
    if (still || !element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      setPlaying(true);
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [still]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const step = now - last;
      last = now;
      setTime(current => Math.min(total, current + step));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  // The end stops the clock; the next press replays.
  if (playing && done) setPlaying(false);

  const current = starts.filter(start => start <= time).length - 1;
  const toggle = () => {
    if (done) setTime(0);
    setPlaying(!playing || done);
  };

  return <figure className="lesson-session" ref={scene}>
    <div className="session-window">
      <div className="session-bar">
        <span className="session-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="session-path"><Icon name="terminal" size={13} /> {title}</span>
        {!still && <button type="button" className="session-control" onClick={toggle}>
          <Icon name={done ? 'refresh' : playing ? 'pause' : 'play'} size={13} />{done ? 'Повторить' : playing ? 'Пауза' : time > 0 ? 'Продолжить' : 'Показать'}
        </button>}
      </div>
      <figcaption className="visually-hidden">{summary}</figcaption>
      <ol className="session-log" aria-hidden="true">
        {lines.map((line, index) => {
          const shown = index <= current;
          const typing = index === current && line.typed && !done;
          const text = typing ? line.text.slice(0, Math.floor((time - starts[index]) / perCharacter)) : line.text;
          // Unreached lines keep their place, so the window never grows while it plays.
          return <li className={`session-line line-${line.kind}${index === current ? ' is-current' : ''}${shown ? '' : ' is-ahead'}`} key={index}>
            <span className="session-mark">{marks[line.kind]}</span>
            <span><span className="session-text">{text}</span>{line.diff && <em>{line.diff}</em>}</span>
          </li>;
        })}
      </ol>
      <div className="session-foot"><span className="session-progress" aria-hidden="true"><i style={{ scale: `${time / total} 1` } as CSSProperties} /></span></div>
    </div>
  </figure>;
}
