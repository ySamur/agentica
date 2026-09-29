import { useEffect, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../../components/Icon';
import { stageCode, stages, steps } from '../../features/guide/catalog';
import { useGuideProgress } from '../../features/guide/GuideProgress';
import { completedCount, isComplete, resumeStep, stageTally, statusLabels } from '../../features/guide/progress';
import { ResumeLink } from '../../features/guide/ResumeLink';
import { StageMeter } from '../../features/guide/StageMeter';
import { useArrivalFocus } from '../../lib/arrivalFocus';
import { spotlight } from '../../lib/spotlight';
import { nbsp } from '../../lib/typography';

const trackStages = spotlight('.stage-card');

// The whole route: every stage with its steps and their status. The order is a recommendation, never a lock.
export function PathPage() {
  const { progress, ready } = useGuideProgress();
  const heading = useArrivalFocus<HTMLHeadingElement>();
  const location = useLocation();
  // The resume point is only marked once the progress is known.
  const next = ready ? resumeStep(progress) : null;
  const done = completedCount(progress);

  // A link to a stage moves focus to its card too; Layout scrolls there.
  useEffect(() => {
    if (!location.hash.startsWith('#stage-')) return;
    document.getElementById(location.hash.slice(1))?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [location.hash, location.key]);

  return <main id="main" className="account-page container path-page">
    <div className="page-heading path-heading">
      <span className="story-eyebrow"><i /> Маршрут</span>
      <h1 ref={heading} tabIndex={-1}>От клавиатуры <em className="accent">к{' '}оркестровке.</em></h1>
      <p>{nbsp('Семь этапов и выпускной проект. Продолжайте с того места, где остановились.')}</p>
      <div className="path-summary">
        <ResumeLink />
        <span className="path-total"><span>{nbsp(`${done} из ${steps.length} шагов пройдено`)}</span><i style={{ '--fill': done / steps.length } as CSSProperties} /></span>
      </div>
    </div>
    <nav className="path-stages" aria-label="Этапы маршрута"><StageMeter progress={progress} current={next?.stage.id ?? ''} linked /></nav>
    <ol className="stage-list" onPointerMove={trackStages}>
      {stages.map(stage => {
        const tally = stageTally(stage, progress);
        return <li className="stage-card" id={`stage-${stage.id}`} key={stage.id} data-complete={tally.done === tally.total || undefined}>
          <div className="stage-card-side">
            <span className="stage-card-code" aria-hidden="true">{stageCode(stage)}</span>
            <h2 tabIndex={-1}><span className="visually-hidden">{stage.number === '★' ? '' : `Этап ${stage.number}. `}</span>{stage.title}</h2>
            <p>{nbsp(stage.promise)}</p>
            <span className="stage-card-tally"><i style={{ '--fill': tally.done / tally.total } as CSSProperties} /><span>{tally.done} / {tally.total}<span className="visually-hidden"> шагов пройдено</span></span></span>
          </div>
          <ol className="step-list">
            {steps.filter(step => step.stage === stage).map(step => {
              const status = progress.get(step.id)?.status;
              return <li key={step.id}>
                <Link className="step-row" to={step.path} data-status={status ?? 'todo'} aria-current={step.id === next?.id ? 'step' : undefined}>
                  <span className="step-mark" aria-hidden="true">{isComplete(status) && <Icon name="check" size={12} />}</span>
                  <span className="step-row-code">{step.label}</span>
                  <span className="step-row-title">{nbsp(step.title)}</span>
                  <span className={`step-row-status ${status ? '' : 'visually-hidden'}`}>{statusLabels[status ?? 'todo']}</span>
                </Link>
              </li>;
            })}
          </ol>
        </li>;
      })}
    </ol>
  </main>;
}
