import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { PageStatus } from '../../components/PageStatus';
import { useAuth } from '../../features/auth/AuthProvider';
import { findStep, stageCode, stages, steps } from '../../features/guide/catalog';
import { useGuideProgress } from '../../features/guide/GuideProgress';
import { Check } from '../../features/guide/lesson/Check';
import { LessonBody } from '../../features/guide/lesson/Lesson';
import { Rich } from '../../features/guide/lesson/Rich';
import type { Lesson } from '../../features/guide/lesson/types';
import { isComplete, statusLabels, type StepStatus } from '../../features/guide/progress';
import { scrollToTarget } from '../../lib/smoothScroll';
import { getSupabase } from '../../lib/supabase';
import { nbsp } from '../../lib/typography';

const notes: Record<StepStatus, string> = {
  done: 'Шаг выполнен.',
  skipped: 'Отмечено «Уже умею»: шаг засчитан.',
  in_progress: 'Шаг снова в работе.',
};

// «Уже умею» on a step with a check: straight to the check.
function toCheck() {
  const heading = document.getElementById('check-title');
  if (!heading) return;
  scrollToTarget(heading, false);
  heading.focus({ preventScroll: true });
}

// One step of the route, at its own address: a lesson, the practice and the check, all members-only
// (`guide_steps`). Opening it records the resume point. A step with a check is passed by the check;
// one without (or not written yet) the member marks done or already known.
export function StepPage() {
  const params = useParams();
  const found = findStep(params.step);
  // A step that has moved to another stage keeps working from old links and bookmarks.
  const step = found && found.stage.id === params.stage ? found : undefined;
  const stepId = step?.id;
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const { progress, ready, error: progressError, reload, setStatus, open } = useGuideProgress();
  // `null` inside: the lesson is not written yet.
  const [loaded, setLoaded] = useState<{ lesson: Lesson | null } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState('');
  const actions = useRef<HTMLDivElement>(null);
  // After the status changes, the buttons are replaced; focus moves to the new first one.
  const refocus = useRef(false);
  const status = stepId ? progress.get(stepId)?.status : undefined;
  const finished = isComplete(status);
  const lesson = loaded?.lesson ?? null;
  const checked = Boolean(lesson?.check);
  const stageDone = Boolean(step && ready && step.stage.steps.every(item => isComplete(progress.get(item.id)?.status)));
  // Only finishing the stage here earns the card, not visiting a stage passed before.
  const [stageDoneOnArrival, setStageDoneOnArrival] = useState<boolean | null>(null);
  if (ready && stageDoneOnArrival === null) setStageDoneOnArrival(stageDone);
  const stageJustDone = stageDoneOnArrival === false && stageDone;

  useEffect(() => {
    if (ready && stepId) open(stepId);
  }, [ready, stepId, open]);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending || !userId || !stepId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const client = await pending;
        if (controller.signal.aborted) return;
        const { data, error, status: code } = await client.from('guide_steps').select('lesson').eq('step_id', stepId).abortSignal(controller.signal).single().retry(false);
        if (controller.signal.aborted) return;
        if (code === 401) { await signOut(); return; }
        if (error || !data) throw error;
        setLoaded({ lesson: data.lesson });
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true);
      }
    };
    void load();
    return () => controller.abort();
  }, [stepId, userId, attempt, signOut]);

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    // A step with a check that is back in work has no buttons: its check takes focus.
    (actions.current?.querySelector<HTMLElement>('a, button') ?? document.getElementById('check-title'))?.focus();
  }, [finished]);

  if (!found) return <PageStatus title="Страница не найдена" message={nbsp('Такого шага нет в маршруте. Откройте карту и выберите нужный.')} />;
  if (!step) return <Navigate to={found.path} replace />;

  const { stage } = step;
  const position = stage.steps.findIndex(item => item.id === step.id) + 1;
  const previous = steps[step.order - 1];
  const following = steps[step.order + 1];
  const nextStage = stages[stages.indexOf(stage) + 1];
  const nextStageStart = nextStage && findStep(nextStage.steps[0]?.id);

  async function mark(next: StepStatus) {
    if (!step) return;
    setNote('');
    setFailure('');
    refocus.current = true;
    try {
      await setStatus(step.id, next);
      setNote(notes[next]);
    } catch (cause) {
      // The rollback brings the previous buttons back; focus follows them.
      refocus.current = true;
      setFailure(cause instanceof Error ? cause.message : nbsp('Не удалось сохранить отметку.'));
    }
  }

  return <main id="main" className="account-page container step-page">
    <nav className="step-trail" aria-label="Вы здесь">
      <Link to="/path">Маршрут</Link>
      <span aria-hidden="true">/</span>
      <Link to={`/path#stage-${stage.id}`}>{stage.number === '★' ? stage.title : `Этап ${stage.number} · ${stage.title}`}</Link>
    </nav>
    <div className="step-heading">
      <div className="step-badges">
        <span className="step-code">{step.code}</span>
        {ready && <span className="step-state" data-status={status ?? 'todo'}>{statusLabels[status ?? 'todo']}</span>}
      </div>
      <h1 id="step-title" tabIndex={-1}>{nbsp(step.title)}</h1>
      <p className="step-meta">{nbsp(`Шаг ${position} из ${stage.steps.length} · ${stage.promise}${lesson ? ` · ≈${lesson.minutes} минут` : ''}`)}</p>
      {lesson && <p className="step-outcome"><Rich text={lesson.outcome} /></p>}
      {checked && !finished && <a className="text-link step-skip" href="#check" onClick={event => { event.preventDefault(); toCheck(); }}>
        Уже умею — сразу к проверке <Icon name="arrow" size={15} />
      </a>}
    </div>
    {loaded === null
      ? <div className="step-loading" aria-busy={!loadFailed}>
        {loadFailed
          ? <><p className="form-error" role="alert">{nbsp('Не удалось загрузить текст шага. Проверьте соединение и попробуйте ещё раз.')}</p>
            <button type="button" className="ghost-button" onClick={() => { setLoadFailed(false); setAttempt(attempt + 1); }}>Повторить загрузку <Icon name="refresh" size={16} /></button></>
          : <p className="step-body-pending" role="status">Загружаем шаг…</p>}
      </div>
      : lesson
        ? <LessonBody lesson={lesson} />
        : <div className="step-placeholder">
          <p>{nbsp('Урок этого шага готовится: скоро здесь появятся объяснение, живой пример в терминале, задание для вашего проекта и проверка.')}</p>
          <p>{nbsp('Жёсткого порядка нет. Если тема знакома, отметьте «Уже умею» — шаг засчитается.')}</p>
        </div>}
    {lesson?.check && <Check stepId={step.id} questions={lesson.check.questions} finished={finished} expectFinish={expected => { refocus.current = expected; }} />}
    <div className="step-actions">
      {/* The one main action: finish the step, then move on. A check finishes its step itself. */}
      {stageJustDone && <div className="stage-complete" role="status">
        <span className="stage-complete-code" aria-hidden="true">{stageCode(stage)}</span>
        <div>
          <strong>{stage.number === '★' ? 'Выпускной проект завершён' : `Этап ${stage.number} пройден`}</strong>
          <p>{nbsp(`${stage.steps.length} из ${stage.steps.length} шагов этапа «${stage.title}». ${nextStage ? `Дальше — «${nextStage.title}»: ${nextStage.promise.toLowerCase()}.` : 'Маршрут пройден целиком.'}`)}</p>
        </div>
      </div>}
      <div className="step-buttons" ref={actions}>
        {finished ? <>
          {stageJustDone
            ? <Link className="glow-button" to={nextStageStart?.path ?? '/path'}>{nextStage ? <>Следующий этап: <b className="button-code">{stageCode(nextStage)}</b> {nbsp(nextStage.title)}</> : 'Карта маршрута'} <Icon name="arrow" size={18} /></Link>
            : <Link className="glow-button" to={following?.path ?? '/path'}>{following ? <>Следующий шаг: <b className="button-code">{following.label}</b> {nbsp(following.title)}</> : 'Карта маршрута'} <Icon name="arrow" size={18} /></Link>}
          <button type="button" className="ghost-button" onClick={() => void mark('in_progress')}>Вернуть в работу</button>
        </> : loaded && !checked && <>
          <button type="button" className="glow-button" disabled={!ready} onClick={() => void mark('done')}>Выполнено <Icon name="check" size={18} /></button>
          <button type="button" className="ghost-button" disabled={!ready} onClick={() => void mark('skipped')}>Уже умею</button>
        </>}
      </div>
      <p className="step-note" role="status">{note}</p>
      {failure && <p className="form-error" role="alert">{failure}</p>}
      {progressError && <div className="progress-error">
        <p role="alert">{nbsp(progressError)}</p>
        <button type="button" className="ghost-button" onClick={reload}>Повторить загрузку <Icon name="refresh" size={16} /></button>
      </div>}
    </div>
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
