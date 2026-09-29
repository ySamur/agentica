import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { stageCode, stages } from './catalog';
import { stageTally, type Progress } from './progress';

// The eight stages in one strip, drawn like the landing film's chapter pill: each bar fills with the
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
      return <li key={stage.id} aria-current={stage.id === current ? 'step' : undefined} data-complete={done === total || undefined}>
        {linked ? <Link className="stage-meter-cell" to={`#stage-${stage.id}`}>{content}</Link> : <div className="stage-meter-cell">{content}</div>}
      </li>;
    })}
  </ol>;
}
