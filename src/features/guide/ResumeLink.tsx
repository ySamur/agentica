import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { nbsp } from '../../lib/typography';
import { useGuideProgress } from './GuideProgress';
import { resumeStep, resumeVerb } from './progress';

// The route's one main action (cabinet, route): the step to take next. Until the progress is known it
// says so, and if loading failed it offers to try again.
export function ResumeLink() {
  const { progress, ready, error, reload } = useGuideProgress();
  if (error) return <div className="progress-error">
    <p role="alert">{nbsp(error)}</p>
    <button type="button" className="ghost-button" onClick={reload}>Повторить загрузку <Icon name="refresh" size={16} /></button>
  </div>;
  if (!ready) return <span className="glow-button resume-pending" role="status">Загружаем прогресс…</span>;
  const step = resumeStep(progress);
  return <Link className="glow-button" to={step.path}>{resumeVerb(progress)}: <b className="button-code">{step.label}</b> {nbsp(step.title)} <Icon name="arrow" size={18} /></Link>;
}
