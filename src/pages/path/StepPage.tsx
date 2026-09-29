import { Link, Navigate, useParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { PageStatus } from '../../components/PageStatus';
import { findStep, steps } from '../../features/guide/catalog';
import { useArrivalFocus } from '../../lib/arrivalFocus';
import { nbsp } from '../../lib/typography';

// One step of the route, at its own address, with its neighbours in the recommended order.
export function StepPage() {
  const params = useParams();
  const step = findStep(params.step);
  const heading = useArrivalFocus<HTMLHeadingElement>(step?.id);
  if (!step) return <PageStatus title="Страница не найдена" message="Такого шага нет в маршруте. Откройте карту и выберите нужный." />;
  // A step that has moved to another stage keeps working from old links and bookmarks.
  if (step.stage.id !== params.stage) return <Navigate to={step.path} replace />;

  const { stage } = step;
  const position = stage.steps.findIndex(item => item.id === step.id) + 1;
  const previous = steps[step.order - 1];
  const following = steps[step.order + 1];

  return <main id="main" className="account-page container step-page">
    <nav className="step-trail" aria-label="Вы здесь">
      <Link to="/path">Маршрут</Link>
      <span aria-hidden="true">/</span>
      <Link to={`/path#stage-${stage.id}`}>{stage.number === '★' ? stage.title : `Этап ${stage.number} · ${stage.title}`}</Link>
    </nav>
    <div className="step-heading">
      <span className="step-code">{step.code}</span>
      <h1 id="step-title" ref={heading} tabIndex={-1}>{nbsp(step.title)}</h1>
      <p className="step-meta">{nbsp(`Шаг ${position} из ${stage.steps.length} · ${stage.promise}`)}</p>
    </div>
    <article className="step-window" aria-labelledby="step-title">
      <div className="step-window-bar">
        <span className="session-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="step-window-path"><Icon name="terminal" size={13} /> ~/agentica/path/{stage.id}/{step.id}.md</span>
      </div>
      <div className="step-body">
        <p>{nbsp('Материал этого шага готовится.')}</p>
        <p className="step-body-note">{nbsp('Жёсткого порядка нет: можно перейти к следующему шагу и вернуться сюда позже.')}</p>
      </div>
    </article>
    <nav className="step-pager" aria-label="Соседние шаги">
      {previous
        ? <Link className="pager-link pager-previous" to={previous.path} rel="prev"><span><Icon name="arrow" size={14} /> Назад · {previous.label}</span><strong>{nbsp(previous.title)}</strong></Link>
        : <Link className="pager-link pager-previous" to="/path"><span><Icon name="arrow" size={14} /> Назад</span><strong>Карта маршрута</strong></Link>}
      {following
        ? <Link className="pager-link pager-next" to={following.path} rel="next"><span>Дальше · {following.label} <Icon name="arrow" size={14} /></span><strong>{nbsp(following.title)}</strong></Link>
        : <Link className="pager-link pager-next" to="/path"><span>Готово <Icon name="arrow" size={14} /></span><strong>Карта маршрута</strong></Link>}
    </nav>
  </main>;
}
