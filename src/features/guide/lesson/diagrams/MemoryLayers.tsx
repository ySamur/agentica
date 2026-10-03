import type { CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const layers = [
  { path: '~/.claude/CLAUDE.md', note: 'ваши привычки во всех проектах' },
  { path: './CLAUDE.md', note: 'проект, общий для команды' },
  { path: './CLAUDE.local.md', note: 'ваше, в git не попадает' },
  { path: '.claude/rules/*.md', note: 'правила для части файлов' },
  { path: 'src/billing/CLAUDE.md', note: 'читается, когда агент там' },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// Where Claude Code's memory lives, from the broadest scope to the narrowest.
export function MemoryLayers() {
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема слоёв памяти, от широкого к узкому: ~/.claude/CLAUDE.md — ваши привычки во всех проектах; ./CLAUDE.md — проект, общий для команды; ./CLAUDE.local.md — ваше, в git не попадает; .claude/rules — правила для части файлов; CLAUDE.md в подпапке читается, когда агент работает там.">
    {layers.map((layer, index) => {
      const width = 720 - index * 80;
      const x = 400 - width / 2;
      return <g key={layer.path} className="diagram-layer" style={order(index)}>
        <rect x={x} y={8 + index * 44} width={width} height="36" rx="11" />
        <text className="diagram-layer-path" x={x + 18} y={27 + index * 44}>{layer.path}</text>
        <text className="diagram-layer-note" x={x + width - 18} y={27 + index * 44}>{layer.note}</text>
      </g>;
    })}
  </svg>;
}
