import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../features/auth/AuthProvider';
import { steps } from '../../features/guide/catalog';
import { useGuideProgress } from '../../features/guide/GuideProgress';
import { completedCount, hasStarted, resumeStep } from '../../features/guide/progress';
import { StageMeter } from '../../features/guide/StageMeter';
import { useArrivalFocus } from '../../lib/arrivalFocus';
import { nbsp } from '../../lib/typography';

// The members' home: a greeting, the one step to take next and how far the route has come.
export function CabinetPage() {
  const { user } = useAuth();
  const { progress } = useGuideProgress();
  const heading = useArrivalFocus<HTMLHeadingElement>();
  const next = resumeStep(progress);
  const started = hasStarted(progress);
  const done = completedCount(progress);
  // Rendered while a stored session is still being restored, before the name is known.
  const firstName = user?.displayName.split(/\s+/)[0];

  return <main id="main" className="account-page container cabinet">
    <section className="cabinet-intro" aria-labelledby="cabinet-title">
      <span className="story-eyebrow"><i /> Кабинет</span>
      <h1 id="cabinet-title" ref={heading} tabIndex={-1}>{started ? 'С возвращением' : 'Добро пожаловать'}{firstName ? <>, <em className="accent">{firstName}.</em></> : '.'}</h1>
      <p className="cabinet-lead">{nbsp(started
        ? `Вы остановились на этапе «${next.stage.title}». Следующий шаг уже ждёт.`
        : 'Семь этапов от ручного кода к оркестровке агентов и выпускной проект. Начнём с точки отсчёта.')}</p>
      <div className="cabinet-actions">
        <Link className="glow-button" to={next.path}>{started ? 'Продолжить' : 'Начать маршрут'}: <b className="button-code">{next.label}</b> {nbsp(next.title)} <Icon name="arrow" size={18} /></Link>
        <Link className="ghost-button" to="/path">Весь маршрут</Link>
      </div>
    </section>
    <section className="cabinet-progress" aria-labelledby="progress-title">
      <div className="cabinet-progress-head">
        <h2 id="progress-title">Прогресс по этапам</h2>
        <span className="mono-count"><b>{done}</b> из {steps.length} шагов</span>
      </div>
      <StageMeter progress={progress} current={next.stage.id} />
    </section>
  </main>;
}
