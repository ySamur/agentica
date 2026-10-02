import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from '../../../../lib/motion';

const nodes = [
  { label: 'Задача', x: 18, width: 104 },
  { label: 'Исследование', x: 150, width: 150 },
  { label: 'План', x: 335, width: 100, focus: true },
  { label: 'Код', x: 512, width: 96 },
  { label: 'Проверка', x: 653, width: 124 },
];
const arrows = [[122, 150], [300, 335], [435, 512], [608, 653]];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// Plan before code as a loop: the plan goes back to research with your corrections until you approve
// it; only then do files change. Draws itself once on screen; reduced motion shows it drawn.
export function PlanLoop() {
  const id = useId();
  const figure = useRef<SVGSVGElement>(null);
  const [play, setPlay] = useState<'pending' | 'on' | undefined>(() => prefersReducedMotion() ? undefined : 'pending');

  useEffect(() => {
    const element = figure.current;
    if (play !== 'pending' || !element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      setPlay('on');
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [play]);

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема: задача, исследование, план. С вашими правками план возвращается на исследование, пока вы его не одобрите. После одобрения — код и проверка. До одобрения файлы не меняются.">
    <defs>
      {['head', 'loop'].map(kind => <marker key={kind} id={`${id}-${kind}`} className={`diagram-tip-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 1 L9 5 L0 9" />
      </marker>)}
    </defs>
    <path className="diagram-loop" d="M385 94 C385 26, 225 26, 225 94" pathLength={1} markerEnd={`url(#${id}-loop)`} style={order(5)} />
    <text className="diagram-loop-label" x="305" y="34" style={order(5)}>ваши правки</text>
    {arrows.map(([from, to], index) => <path key={from} className="diagram-arrow" d={`M${from + 2} 118 H${to - 4}`} pathLength={1} markerEnd={`url(#${id}-head)`} style={order(index + 1)} />)}
    <g className="diagram-gate" style={order(6)}>
      <circle cx="473" cy="118" r="9" />
      <path d="M468.5 118.5 l3 3 l5.5 -6" />
      <text x="473" y="92">одобрение</text>
    </g>
    {nodes.map((node, index) => <g key={node.label} className={`diagram-node${node.focus ? ' is-focus' : ''}`} style={order(index)}>
      <rect x={node.x} y="96" width={node.width} height="44" rx="22" />
      <text x={node.x + node.width / 2} y="119">{node.label}</text>
    </g>)}
    <g className="diagram-zone" style={order(7)}>
      <path d="M18 168 v10 H435 v-10" />
      <text x="226" y="206">файлы не меняются</text>
    </g>
    <g className="diagram-zone is-work" style={order(8)}>
      <path d="M512 168 v10 H777 v-10" />
      <text x="644" y="206">правки и тесты</text>
    </g>
  </svg>;
}
