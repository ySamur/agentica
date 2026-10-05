import type { CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const cells = [
  { x: 110, y: 20, tone: 'hand', lines: ['пишете сами;', 'агент исследует и ревьюит'] },
  { x: 445, y: 20, tone: 'plan', lines: ['агент пишет по плану,', 'вы читаете каждую строку'] },
  { x: 110, y: 125, tone: 'try', lines: ['прототип с агентом:', 'пробуйте и откатывайте'] },
  { x: 445, y: 125, tone: 'give', lines: ['отдайте агенту целиком,', 'проверка — тестами'] },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// Who writes the code, by the price of a mistake and how clear the task is.
export function DelegationGrid() {
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 262" role="img"
    aria-label="Матрица: по вертикали цена ошибки, по горизонтали ясность задачи. Высокая цена и неясная задача — пишете сами, агент исследует и ревьюит. Высокая цена и ясная задача — агент пишет по плану, вы читаете каждую строку. Низкая цена и неясная задача — прототип с агентом. Низкая цена и ясная задача — отдайте агенту целиком, проверка тестами.">
    {cells.map((cell, index) => <g key={cell.tone} className={`diagram-cell tone-${cell.tone}`} style={order(index)}>
      <rect x={cell.x} y={cell.y} width="325" height="95" rx="14" />
      {cell.lines.map((line, row) => <text key={line} x={cell.x + 162} y={cell.y + 40 + row * 22}>{line}</text>)}
    </g>)}
    <g className="diagram-zone" style={order(4)}>
      <text x="56" y="120" textAnchor="middle" transform="rotate(-90 56 120)">цена ошибки →</text>
      <text x="440" y="250">ясность задачи →</text>
    </g>
  </svg>;
}
