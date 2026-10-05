import { Link } from 'react-router';
import { useAuth } from '../../features/auth/AuthProvider';
import { steps } from '../../features/guide/catalog';
import { useGuideProgress } from '../../features/guide/GuideProgress';
import { completedCount, hasStarted, resumeStep } from '../../features/guide/progress';
import { ResumeLink } from '../../features/guide/ResumeLink';
import { StageMeter } from '../../features/guide/StageMeter';
import { nbsp } from '../../lib/typography';

// The members' home: a greeting, the one step to take next and how far the route has come.
export function CabinetPage() {
  const { user } = useAuth();
  const { progress, ready } = useGuideProgress();
  const next = resumeStep(progress);
  // Until the progress is known, a returning member is the likelier guess.
  const started = !ready || hasStarted(progress);
  const done = completedCount(progress);
  // Rendered while a stored session is still being restored, before the name is known.
  const firstName = user?.displayName.split(/\s+/)[0];

  return <main id="main" className="account-page container cabinet">
    <section className="cabinet-intro" aria-labelledby="cabinet-title">
      <span className="story-eyebrow"><i /> Кабинет</span>
      <h1 id="cabinet-title" tabIndex={-1}>{started ? 'С возвращением' : 'Добро пожаловать'}{firstName ? <>, <em className="accent">{firstName}.</em></> : '.'}</h1>
      <p className="cabinet-lead">{nbsp(!ready
        ? 'Маршрут от ручного кода к оркестровке агентов.'
        : started ? `Вы остановились на этапе «${next.stage.title}». Следующий шаг уже ждёт.`
        : 'Шесть этапов от ручного кода к оркестровке агентов и выпускной проект. Начнём с первого запуска.')}</p>
      <div className="cabinet-actions">
        <ResumeLink />
        <Link className="ghost-button" to="/path">Весь маршрут</Link>
      </div>
    </section>
    <section className="cabinet-progress" aria-labelledby="progress-title">
      <div className="cabinet-progress-head">
        <h2 id="progress-title">{nbsp('Прогресс по этапам')}</h2>
        <span className="mono-count">{nbsp(`${done} из ${steps.length} шагов`)}</span>
      </div>
      <StageMeter progress={progress} current={ready ? next.stage.id : ''} />
    </section>
  </main>;
}
