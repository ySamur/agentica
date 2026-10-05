import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../features/auth/AuthProvider';
import { stageCode, stages, steps } from '../../features/guide/catalog';
import { useGuideProgress } from '../../features/guide/GuideProgress';
import { completedCount, isComplete, stageTally } from '../../features/guide/progress';
import { getSupabase } from '../../lib/supabase';
import { nbsp } from '../../lib/typography';

// The member's way along the route, for the profile: passed steps per stage and the library
// materials they opened. Materials are counted from their steps, so the count follows the progress.
export function RouteProgress() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const { progress, ready, error, reload } = useGuideProgress();
  // Step ids of the library's materials; null until loaded (or if loading failed).
  const [materials, setMaterials] = useState<string[] | null>(null);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending || !userId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const client = await pending;
        if (controller.signal.aborted) return;
        const { data, error: failure, status } = await client.from('library_items').select('step_id').abortSignal(controller.signal).retry(false);
        if (controller.signal.aborted) return;
        if (status === 401) { await signOut(); return; }
        if (!failure && data) setMaterials(data.map(item => item.step_id));
      } catch {
        // The count is secondary: without it the card still links to the library.
      }
    };
    void load();
    return () => controller.abort();
  }, [userId, signOut]);

  const done = completedCount(progress);
  const opened = materials?.filter(stepId => isComplete(progress.get(stepId)?.status)).length ?? 0;

  return <section className="account-card profile-card route-progress" aria-labelledby="route-progress-title">
    <div className="route-progress-head">
      <h2 id="route-progress-title">{nbsp('Путь по маршруту')}</h2>
      {ready && <span className="mono-count">{nbsp(`${done} из ${steps.length} шагов`)}</span>}
    </div>
    {error
      ? <div className="progress-error">
        <p role="alert">{nbsp(error)}</p>
        <button type="button" className="ghost-button" onClick={reload}>Повторить загрузку <Icon name="refresh" size={16} /></button>
      </div>
      : <ol className="route-progress-stages" aria-busy={!ready}>
        {stages.map(stage => {
          const tally = stageTally(stage, progress);
          return <li key={stage.id} data-complete={ready && tally.done === tally.total || undefined}>
            <Link to={`/path#stage-${stage.id}`}>
              <span className="route-progress-code" aria-hidden="true">{stageCode(stage)}</span>
              <span className="route-progress-title">{stage.title}</span>
              <span className="stage-card-tally"><i style={{ '--fill': tally.done / tally.total } as CSSProperties} /><span>{tally.done} / {tally.total}<span className="visually-hidden"> шагов пройдено</span></span></span>
            </Link>
          </li>;
        })}
      </ol>}
    <div className="route-progress-links">
      <Link className="ghost-button" to="/path">Весь маршрут <Icon name="arrow" size={16} /></Link>
      <Link className="ghost-button" to="/library">{materials && ready ? nbsp(`Библиотека: открыто ${opened} из ${materials.length}`) : 'Библиотека'} <Icon name="arrow" size={16} /></Link>
    </div>
  </section>;
}
