import type { PointerEvent } from 'react';
import { Icon } from '../../components/Icon';
import { prefersReducedMotion } from '../../lib/motion';
import { marks, script, statusOf } from './sessionScript';

// The window leans toward a mouse pointer; touch and reduced motion keep it still.
function tilt(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--px', ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
  event.currentTarget.style.setProperty('--py', ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
}

function untilt(event: PointerEvent<HTMLDivElement>) {
  event.currentTarget.style.removeProperty('--px');
  event.currentTarget.style.removeProperty('--py');
}

// Rendered finished. With motion, the opening scene types it out as the page scrolls
// (see motion/session.ts), so the visitor, not a timer, sets the pace.
export function ClaudeSession() {
  const last = script.length - 1;
  return <div className="session-scene session-done" onPointerMove={tilt} onPointerLeave={untilt}>
    <div className="session-window">
      <div className="session-bar">
        <span className="session-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="session-path"><Icon name="terminal" size={13} /> ~/projects/shop</span>
        <span className="session-status"><i /><span>{statusOf(last)}</span></span>
      </div>
      <p className="visually-hidden">Симуляция сеанса Claude Code: разработчик просит добавить промокоды в корзину, агент изучает проект и предлагает план, после согласования правит три файла, прогоняет тесты и передаёт изменения на ревью.</p>
      <ol className="session-log" aria-hidden="true">
        {script.map((line, index) => <li className={`session-line line-${line.kind} ${index === last ? 'is-current' : ''}`} data-typed={line.typed ? '' : undefined} key={line.text}>
          <span className="session-mark">{marks[line.kind]}</span>
          <span><span className="session-text">{line.text}</span>{line.diff && <em>{line.diff}</em>}</span>
        </li>)}
      </ol>
      <div className="session-foot"><span className="session-progress" aria-hidden="true"><i /></span></div>
    </div>
    <span className="session-chip session-chip-plan is-shown" aria-hidden="true"><Icon name="layers" size={15} /> План согласован</span>
    <span className="session-chip session-chip-diff is-shown" aria-hidden="true"><Icon name="code" size={15} /> 3 файла · +121 −3</span>
    <span className="session-chip session-chip-tests is-shown" aria-hidden="true"><Icon name="check" size={15} /> Тесты пройдены</span>
  </div>;
}
