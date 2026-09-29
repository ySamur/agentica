import { useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { prefersReducedMotion } from '../../lib/motion';

const rows = [
  { before: 'Пишу каждую строку сам', after: 'Формулирую цель и границы задачи' },
  { before: 'Часами ищу ответ в документации', after: 'Агент сам изучает код и документацию' },
  { before: 'Держу контекст проекта в голове', after: 'Контекст записан в CLAUDE.md' },
  { before: 'Тесты — «потом, если успею»', after: 'Тесты — часть каждой задачи' },
  { before: 'Ценность — скорость набора', after: 'Ценность — качество решений' },
];

// One cycle: rest where both columns read, slow sweep left as the new replaces the old,
// a beat at the edge, then a quick snap back. It runs on its own; reduced motion keeps it at rest.
const timing = { rest: 140, sweep: 9000, edge: 80, snap: 600 };
type Phase = 'rest' | 'sweep' | 'edge' | 'snap';
const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 4;

export function RoleShift() {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let rest = 60;
    let value = rest;
    let phase: Phase = 'rest';
    let phaseStart = performance.now();
    let from = value;
    let frame = 0;

    const paint = (next: number) => {
      value = next;
      element.style.setProperty('--split', `${next.toFixed(2)}%`);
    };

    // The rest position sits just left of the widest "Стало" line, so the border never covers it.
    const measure = () => {
      const box = element.getBoundingClientRect();
      if (!box.width) return;
      const text = document.createRange();
      let left = box.right;
      element.querySelectorAll('.shift-after .shift-title, .shift-after li').forEach(node => {
        text.selectNodeContents(node);
        left = Math.min(left, text.getBoundingClientRect().left);
      });
      rest = Math.min(90, Math.max(40, (left - box.left - 20) / box.width * 100));
      if (phase === 'rest') paint(rest);
    };

    const go = (next: Phase, now: number) => { phase = next; phaseStart = now; from = value; };
    const ease = (duration: number, to: number, curve: (t: number) => number, now: number) => {
      const t = Math.min(1, (now - phaseStart) / duration);
      paint(from + (to - from) * curve(t));
      return t === 1;
    };

    const tick = (now: number) => {
      switch (phase) {
        case 'rest': paint(rest); if (now - phaseStart >= timing.rest) go('sweep', now); break;
        case 'sweep': if (ease(timing.sweep, 0, easeInOut, now)) go('edge', now); break;
        case 'edge': if (now - phaseStart >= timing.edge) go('snap', now); break;
        case 'snap': if (ease(timing.snap, rest, easeOut, now)) go('rest', now); break;
      }
      frame = requestAnimationFrame(tick);
    };

    // Frames run only while the block is on screen; each return starts a fresh cycle.
    const observer = prefersReducedMotion() ? null : new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (!entry?.isIntersecting) return;
      go(phase === 'rest' ? 'rest' : 'snap', performance.now());
      frame = requestAnimationFrame(tick);
    });
    const resize = new ResizeObserver(measure);
    observer?.observe(element);
    resize.observe(element);
    void document.fonts.ready.then(measure);
    paint(rest);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); resize.disconnect(); };
  }, []);

  return <div className="shift-stage reveal" ref={stage}>
    <div className="shift-layer shift-before">
      <h3 className="shift-title"><span>Было</span>Разработчик-исполнитель</h3>
      <ul>{rows.map(row => <li key={row.before}><Icon name="close" size={15} />{row.before}</li>)}</ul>
    </div>
    <div className="shift-reveal">
      <div className="shift-layer shift-after">
        <h3 className="shift-title"><span>Стало</span>Разработчик-оркестратор</h3>
        <ul>{rows.map(row => <li key={row.after}>{row.after}<Icon name="spark" size={15} /></li>)}</ul>
      </div>
    </div>
    <span className="shift-handle" aria-hidden="true"><span className="shift-knob"><Icon name="code" size={20} /></span></span>
  </div>;
}
