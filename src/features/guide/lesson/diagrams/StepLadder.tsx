import { useId, type CSSProperties } from 'react';
import { useDrawOnView } from './useDrawOnView';

const steps = [
  { label: '1 · сериализатор строк', check: '✓ unit-тесты' },
  { label: '2 · эндпоинт /reports.csv', check: '✓ контракт' },
  { label: '3 · кнопка «Скачать»', check: '✓ e2e' },
  { label: '4 · потоковая выдача', check: '✓ 1 млн строк' },
];
const order = (index: number) => ({ '--i': index } as CSSProperties);

// One big task split into steps, each with its own pass/fail check.
export function StepLadder() {
  const id = useId();
  const { figure, play } = useDrawOnView();

  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a drawing in inline SVG, which <img> cannot hold.
  return <svg ref={figure} className="diagram" data-play={play} viewBox="0 0 800 236" role="img"
    aria-label="Схема: большая задача «экспорт отчёта в CSV» разбита на четыре шага, у каждого своя проверка: сериализатор строк — юнит-тесты, эндпоинт — контрактный тест, кнопка «Скачать» — e2e, потоковая выдача — проверка на миллионе строк.">
    <defs>
      <marker id={`${id}-head`} className="diagram-tip-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0 1 L9 5 L0 9" />
      </marker>
    </defs>
    <g className="diagram-node is-focus" style={order(0)}>
      <rect x="20" y="92" width="190" height="52" rx="16" />
      <text x="115" y="111">большая задача</text>
      <text className="diagram-node-sub" x="115" y="130">экспорт отчёта в CSV</text>
    </g>
    <path className="diagram-arrow" d="M212 118 H232 M232 36 V200" pathLength={1} style={order(1)} />
    {steps.map((step, index) => {
      const y = 16 + index * 54;
      const x = 262 + index * 40;
      return <g key={step.label} style={order(index + 2)}>
        <path className="diagram-arrow" d={`M232 ${y + 20} H${x - 4}`} pathLength={1} markerEnd={`url(#${id}-head)`} />
        <g className="diagram-step">
          <rect x={x} y={y} width="340" height="40" rx="12" />
          <text x={x + 16} y={y + 20}>{step.label}</text>
          <text className="diagram-step-check" x={x + 324} y={y + 20}>{step.check}</text>
        </g>
      </g>;
    })}
  </svg>;
}
