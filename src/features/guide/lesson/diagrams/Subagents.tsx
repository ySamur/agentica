import { useId, type CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const helpers = [
  { name: 'Explore', task: 'найти все вызовы платёжного API', y: 12 },
  { name: 'reviewer', task: 'свежим взглядом проверить diff', y: 82 },
  { name: 'test-writer', task: 'написать тесты по требованиям', y: 152 },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// The main session hands work to subagents; each reads in its own context and sends back only findings.
export function Subagents() {
  const id = useId();
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема: основная сессия раздаёт задачи трём субагентам — Explore ищет вызовы API, reviewer проверяет diff, test-writer пишет тесты. Каждый работает в своём контекстном окне и возвращает только выводы, поэтому окно основной сессии остаётся почти пустым.">
    <defs>
      {['head', 'loop'].map(kind => <marker key={kind} id={`${id}-${kind}`} className={`diagram-tip-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 1 L9 5 L0 9" />
      </marker>)}
    </defs>
    <g className="diagram-node is-focus" style={order(0)}>
      <rect x="20" y="12" width="250" height="190" rx="16" />
      <text x="145" y="44">основная сессия</text>
      <text className="diagram-node-sub" x="145" y="76">план, решения,</text>
      <text className="diagram-node-sub" x="145" y="96">итоговые правки</text>
    </g>
    <rect className="diagram-frame" x="44" y="140" width="202" height="18" rx="6" style={order(1)} />
    <g className="diagram-fill tone-memory" style={order(1)}>
      <rect x="44" y="140" width="56" height="18" />
      <text x="145" y="184">окно почти пустое</text>
    </g>
    {helpers.map((helper, index) => <g key={helper.name} style={order(index + 2)}>
      <path className="diagram-arrow" d={`M274 ${helper.y + 17} H514`} pathLength={1} markerEnd={`url(#${id}-head)`} />
      <path className="diagram-loop is-still" d={`M514 ${helper.y + 33} H278`} pathLength={1} markerEnd={`url(#${id}-loop)`} />
      <g className="diagram-step">
        <rect x="520" y={helper.y} width="260" height="50" rx="12" />
        <text className="diagram-step-name" x="536" y={helper.y + 17}>{helper.name}</text>
        <text className="diagram-step-task" x="536" y={helper.y + 35}>{helper.task}</text>
      </g>
    </g>)}
    <g className="diagram-zone" style={order(5)}>
      <text x="394" y="226">→ задача · ← только выводы</text>
    </g>
  </svg>;
}
