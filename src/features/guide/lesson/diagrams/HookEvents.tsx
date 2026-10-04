import { useId, type CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const events = [
  { label: 'SessionStart', x: 10, width: 118, note: ['загрузить', 'контекст'] },
  { label: 'UserPromptSubmit', x: 146, width: 150, note: ['проверить', 'запрос'] },
  { label: 'PreToolUse', x: 314, width: 112, note: ['может', 'запретить'], warn: true },
  { label: 'инструмент', x: 444, width: 96, tool: true },
  { label: 'PostToolUse', x: 558, width: 118, note: ['форматтер,', 'линтер'] },
  { label: 'Stop', x: 694, width: 96, note: ['финальная', 'проверка'] },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// When hooks fire during one turn: before and after every tool, and when the agent wants to stop.
export function HookEvents() {
  const id = useId();
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема событий хуков в ходе работы агента: SessionStart — загрузить контекст; UserPromptSubmit — проверить запрос; PreToolUse перед каждым инструментом — может запретить действие; после инструмента PostToolUse — форматтер или линтер; цикл повторяется для следующего инструмента; Stop — финальная проверка перед концом хода. Код выхода 2 блокирует действие и передаёт агенту причину.">
    <defs>
      {['head', 'loop'].map(kind => <marker key={kind} id={`${id}-${kind}`} className={`diagram-tip-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 1 L9 5 L0 9" />
      </marker>)}
    </defs>
    {events.slice(1).map((event, index) => {
      const from = events[index].x + events[index].width;
      return <path key={event.label} className="diagram-arrow" d={`M${from + 2} 116 H${event.x - 3}`} pathLength={1} markerEnd={`url(#${id}-head)`} style={order(index + 1)} />;
    })}
    <path className="diagram-loop" d="M617 94 C600 38, 387 38, 370 94" pathLength={1} markerEnd={`url(#${id}-loop)`} style={order(6)} />
    <text className="diagram-loop-label" x="493" y="44" style={order(6)}>следующий инструмент</text>
    {events.map((event, index) => <g key={event.label} className={`diagram-node is-event${event.warn ? ' is-warn' : ''}${event.tool ? ' is-focus' : ''}`} style={order(index)}>
      <rect x={event.x} y="96" width={event.width} height="40" rx="12" />
      <text x={event.x + event.width / 2} y="117">{event.label}</text>
      {event.note?.map((line, row) => <text key={line} className="diagram-node-note" x={event.x + event.width / 2} y={160 + row * 17}>{line}</text>)}
    </g>)}
    <text className="diagram-warn-note" x="400" y="222" style={order(7)}>код выхода 2 — заблокировать и сообщить агенту причину</text>
  </svg>;
}
