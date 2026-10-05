import { useId, type CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const modes = [
  { name: 'plan', x: 90, lines: ['читает,', 'не правит'] },
  { name: 'default', x: 250, lines: ['спрашивает', 'правки и команды'] },
  { name: 'acceptEdits', x: 405, lines: ['правит сам,', 'команды — с вопросом'] },
  { name: 'auto', x: 560, lines: ['решает классификатор,', 'рискованное блокирует'] },
  { name: 'bypassPermissions', x: 705, lines: ['ничего не спрашивает,', 'только в контейнере'] },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// The permission modes on one scale, from the most control to the most freedom.
export function PermissionModes() {
  const id = useId();
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 220" role="img"
    aria-label="Шкала режимов разрешений от большего контроля к большей свободе: plan — читает, не правит; default — спрашивает о правках и командах; acceptEdits — правит сам, команды согласует; auto — решает классификатор и блокирует рискованное; bypassPermissions — ничего не спрашивает, только в контейнере.">
    <defs>
      <linearGradient id={`${id}-scale`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#62e6d1" />
        <stop offset=".55" stopColor="#a28fff" />
        <stop offset="1" stopColor="#ff9470" />
      </linearGradient>
    </defs>
    <path className="diagram-scale" d="M50 100 H750" pathLength={1} stroke={`url(#${id}-scale)`} style={order(0)} />
    {modes.map((mode, index) => <g key={mode.name} className={`diagram-stop${index === modes.length - 1 ? ' is-warn' : ''}`} style={order(index + 1)}>
      <text className="diagram-stop-name" x={mode.x} y="76">{mode.name}</text>
      <circle cx={mode.x} cy="100" r="8" />
      {mode.lines.map((line, row) => <text key={line} className="diagram-stop-note" x={mode.x} y={134 + row * 18}>{line}</text>)}
    </g>)}
    <g className="diagram-zone" style={order(7)}>
      <text x="50" y="206" textAnchor="start">← больше контроля</text>
      <text x="750" y="206" textAnchor="end">больше свободы →</text>
    </g>
  </svg>;
}
