import type { CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

// x from, x to, label, tone.
const before = [
  { from: 40, to: 105, label: 'система', tone: 'base' },
  { from: 105, to: 185, label: 'CLAUDE.md', tone: 'memory' },
  { from: 185, to: 430, label: 'прочитанные файлы', tone: 'files' },
  { from: 430, to: 570, label: 'разговор', tone: 'talk' },
  { from: 570, to: 690, label: 'вывод команд', tone: 'output' },
];
const after = [
  { from: 40, to: 105, tone: 'base' },
  { from: 105, to: 185, tone: 'memory' },
  { from: 185, to: 320, label: 'сводка', tone: 'talk' },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// The context window filling up during a session, and what is left after compaction.
export function ContextWindow() {
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема: контекстное окно заполняется по ходу сессии — системные инструкции, CLAUDE.md, прочитанные файлы, разговор, вывод команд. У предела срабатывает автосжатие: остаются системные инструкции, CLAUDE.md и краткая сводка разговора.">
    <text className="diagram-caption-left" x="40" y="30">контекстное окно</text>
    <rect className="diagram-frame" x="40" y="44" width="720" height="44" rx="12" />
    {before.map((part, index) => <g key={part.label} className={`diagram-fill tone-${part.tone}`} style={order(index)}>
      <rect x={part.from} y="44" width={part.to - part.from} height="44" />
      <text x={(part.from + part.to) / 2} y="112">{part.label}</text>
    </g>)}
    <g className="diagram-limit" style={order(5)}>
      <path d="M700 38 V96" />
      <text x="700" y="30">автосжатие</text>
    </g>
    <text className="diagram-caption-left" x="40" y="166" style={order(6)}>после сжатия</text>
    <rect className="diagram-frame" x="40" y="178" width="720" height="34" rx="10" style={order(6)} />
    {after.map((part, index) => <g key={part.from} className={`diagram-fill tone-${part.tone}`} style={order(index + 6)}>
      <rect x={part.from} y="178" width={part.to - part.from} height="34" />
      {part.label && <text className="is-inside" x={(part.from + part.to) / 2} y="196">{part.label}</text>}
    </g>)}
  </svg>;
}
