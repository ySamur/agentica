import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { stageCode, stages } from './catalog';
import { stageTally, type Progress } from './progress';

// The seven stages (1–6 and the capstone) in one strip, drawn like the landing film's chapter pill: each bar fills with the
// landing's gradient as its steps are passed. On the route page the stages link to their cards.
export function StageMeter({ progress, current, linked = false }: { progress: Progress; current: string; linked?: boolean }) {
  return <ol className="stage-meter">
    {stages.map(stage => {
      const { done, total } = stageTally(stage, progress);
      const content = <>
        <span className="stage-meter-code" aria-hidden="true">{done === total ? <Icon name="check" size={13} /> : stageCode(stage)}</span>
        <span className="stage-meter-count" aria-hidden="true">{done}/{total}</span>
        <span className="stage-meter-title">{stage.title}</span>
        <span className="visually-hidden">, пройдено {done} из {total}</span>
        <i style={{ '--fill': done / total } as CSSProperties} />
      </>;
      // On the cell, not the item: screen readers announce «current» on the focused link.
      const cell = { className: 'stage-meter-cell', 'aria-current': stage.id === current ? 'step' as const : undefined };
      return <li key={stage.id} data-complete={done === total || undefined}>
        {linked ? <Link {...cell} to={`#stage-${stage.id}`}>{content}</Link> : <div {...cell}>{content}</div>}
      </li>;
    })}
  </ol>;
}
