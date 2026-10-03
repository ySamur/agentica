import { useId, type CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const checkpoints = [70, 260, 450, 640];
const edits = [
  { label: '✎ cart.ts', x: 165, width: 92 },
  { label: '✎ total.ts', x: 355, width: 100 },
  { label: '$ rm -r cache', x: 545, width: 124, command: true },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// A session as a timeline: a checkpoint before every prompt, file edits between them, a rewind back
// to the second prompt. Edits come back; a terminal command's effect does not.
export function Checkpoints() {
  const id = useId();
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема: перед каждым запросом создаётся чекпоинт. Между запросами агент правит файлы и выполняет команды. Откат через /rewind или Esc Esc возвращает правки файлов к выбранному запросу, но не отменяет команды терминала, например удаление папки.">
    <defs>
      {['head', 'loop'].map(kind => <marker key={kind} id={`${id}-${kind}`} className={`diagram-tip-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 1 L9 5 L0 9" />
      </marker>)}
    </defs>
    <path className="diagram-arrow" d="M40 118 H736" pathLength={1} markerEnd={`url(#${id}-head)`} style={order(0)} />
    <text className="diagram-end" x="746" y="122" style={order(0)}>сейчас</text>
    {checkpoints.map((x, index) => <g key={x} className="diagram-point" style={order(index + 1)}>
      <circle cx={x} cy="118" r="9" />
      <text x={x} y="152">запрос {index + 1}</text>
    </g>)}
    {edits.map((edit, index) => <g key={edit.label} className={`diagram-node${edit.command ? ' is-warn' : ''}`} style={order(index + 2)}>
      <rect x={edit.x - edit.width / 2} y="100" width={edit.width} height="36" rx="18" />
      <text x={edit.x} y="119">{edit.label}</text>
    </g>)}
    <text className="diagram-warn-note" x="545" y="176" style={order(5)}>команды не откатываются</text>
    <path className="diagram-loop" d="M726 98 C690 22, 310 22, 266 96" pathLength={1} markerEnd={`url(#${id}-loop)`} style={order(6)} />
    <text className="diagram-loop-label" x="505" y="40" style={order(6)}>/rewind · Esc Esc</text>
    <g className="diagram-zone" style={order(7)}>
      <path d="M40 196 v10 H736 v-10" />
      <text x="388" y="230">чекпоинты живут в сессии · постоянная история — в git</text>
    </g>
  </svg>;
}
