import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { nbsp } from '../../lib/typography';
import { stageCode, stageMinutes, stages } from './catalog';
import { stageTally, type Progress } from './progress';

// Counted the way a reader says it, as on the landing: «61 минута», «5 шагов».
const plural = new Intl.PluralRules('ru');
const words: Record<'minutes' | 'steps', Record<'one' | 'few' | 'many', string>> = {
  minutes: { one: 'минута', few: 'минуты', many: 'минут' },
  steps: { one: 'шаг', few: 'шага', many: 'шагов' },
};
const counted = (count: number, kind: keyof typeof words) => {
  const form = plural.select(count);
  return `${count} ${words[kind][form === 'one' || form === 'few' ? form : 'many']}`;
};

// The seven stages (1–6 and the capstone) in one strip, drawn like the landing film's chapter pill: each bar fills with the
// landing's gradient as its steps are passed. On the route page the stages link to their cards, and hovering or focusing
// one tells its reading time; Esc hides that note until the link is hovered anew or loses focus.
export function StageMeter({ progress, current, linked = false }: { progress: Progress; current: string; linked?: boolean }) {
  const [dismissed, setDismissed] = useState('');
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
      if (!linked) return <li key={stage.id} data-complete={done === total || undefined}><div {...cell}>{content}</div></li>;
      const tip = `stage-time-${stage.id}`;
      return <li key={stage.id} data-complete={done === total || undefined} data-dismissed={dismissed === stage.id || undefined}>
        <Link {...cell} to={`#stage-${stage.id}`} aria-describedby={tip} onPointerEnter={() => setDismissed('')} onBlur={() => setDismissed('')}
          onKeyDown={event => { if (event.key === 'Escape') setDismissed(stage.id); }}>{content}</Link>
        <span className="stage-time" id={tip} role="tooltip">{nbsp(`≈${counted(stageMinutes(stage), 'minutes')} чтения · ${counted(total, 'steps')}`)}</span>
      </li>;
    })}
  </ol>;
}
