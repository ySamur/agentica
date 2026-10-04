import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../features/auth/AuthProvider';
import { findStep, stageCode, stages } from '../../features/guide/catalog';
import { CodeFile } from '../../features/guide/lesson/CodeFile';
import { Rich } from '../../features/guide/lesson/Rich';
import type { LibraryBodyRow, LibraryItemRow, LibraryKind } from '../../features/library/types';
import { spotlight } from '../../lib/spotlight';
import { getSupabase } from '../../lib/supabase';
import { nbsp } from '../../lib/typography';

const kindLabels: Record<LibraryKind, string> = { prompt: 'Запрос', template: 'Шаблон', checklist: 'Чеклист' };

const trackStages = spotlight('.stage-card');

type Shelf = { items: LibraryItemRow[]; bodies: ReadonlyMap<string, LibraryBodyRow> };

// Materials members take with them. Every title is listed; the database returns a body only once
// its step is passed, so a locked material points to the step that opens it.
export function LibraryPage() {
  const { user, signOut } = useAuth();
  const userId = user?.id;
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending || !userId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const client = await pending;
        if (controller.signal.aborted) return;
        const [items, bodies] = await Promise.all([
          client.from('library_items').select('id, step_id, position, kind, title, summary').order('position').abortSignal(controller.signal).retry(false),
          client.from('library_bodies').select('item_id, file, body').abortSignal(controller.signal).retry(false),
        ]);
        if (controller.signal.aborted) return;
        if (items.status === 401 || bodies.status === 401) { await signOut(); return; }
        if (items.error || bodies.error) throw items.error ?? bodies.error;
        setShelf({ items: items.data, bodies: new Map(bodies.data.map(body => [body.item_id, body])) });
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true);
      }
    };
    void load();
    return () => controller.abort();
  }, [userId, attempt, signOut]);

  const opened = shelf?.bodies.size ?? 0;
  const total = shelf?.items.length ?? 0;

  return <main id="main" className="account-page container library-page">
    <div className="page-heading path-heading">
      <span className="story-eyebrow"><i /> Библиотека</span>
      <h1 tabIndex={-1}>Материалы, которые <em className="accent">остаются с{' '}вами.</em></h1>
      <p>{nbsp('Запросы, шаблоны и чеклисты из маршрута — копируйте в свой проект. Материал открывается, когда пройден его шаг.')}</p>
      {shelf && <div className="path-summary">
        <span className="path-total"><span>{nbsp(`${opened} из ${total} материалов открыто`)}</span><i style={{ '--fill': total ? opened / total : 0 } as CSSProperties} /></span>
      </div>}
    </div>
    {shelf === null
      ? <div className="step-loading" aria-busy={!loadFailed}>
        {loadFailed
          ? <><p className="form-error" role="alert">{nbsp('Не удалось загрузить библиотеку. Проверьте соединение и попробуйте ещё раз.')}</p>
            <button type="button" className="ghost-button" onClick={() => { setLoadFailed(false); setAttempt(attempt + 1); }}>Повторить загрузку <Icon name="refresh" size={16} /></button></>
          : <p className="step-body-pending" role="status">Загружаем библиотеку…</p>}
      </div>
      : <ol className="stage-list" onPointerMove={trackStages}>
        {stages.map(stage => {
          const items = shelf.items.filter(item => findStep(item.step_id)?.stage === stage);
          if (!items.length) return null;
          const open = items.filter(item => shelf.bodies.has(item.id)).length;
          return <li className="stage-card library-stage" key={stage.id} data-complete={open === items.length || undefined}>
            <div className="stage-card-side">
              <span className="stage-card-code" aria-hidden="true">{stageCode(stage)}</span>
              <h2><span className="visually-hidden">{stage.number === '★' ? '' : `Этап ${stage.number}. `}</span>{stage.title}</h2>
              <span className="stage-card-tally"><i style={{ '--fill': open / items.length } as CSSProperties} /><span>{open} / {items.length}<span className="visually-hidden"> открыто</span></span></span>
            </div>
            <ul className="library-list">
              {items.map(item => <Material key={item.id} item={item} body={shelf.bodies.get(item.id)} />)}
            </ul>
          </li>;
        })}
      </ol>}
  </main>;
}

function Material({ item, body }: { item: LibraryItemRow; body: LibraryBodyRow | undefined }) {
  const step = findStep(item.step_id);
  const head = <>
    <span className="library-kind">{body ? kindLabels[item.kind] : <><Icon name="lock" size={12} /> {kindLabels[item.kind]}</>}</span>
    <span className="library-title"><Rich text={item.title} /></span>
    <span className="library-summary"><Rich text={item.summary} /></span>
  </>;
  if (!body) return <li className="library-item" data-locked="">
    <div className="library-head">{head}</div>
    {step && <Link className="text-link library-step" to={step.path}>{nbsp(`Откроется после шага ${step.label} «${step.title}»`)} <Icon name="arrow" size={15} /></Link>}
  </li>;
  return <li className="library-item">
    <details>
      <summary className="library-head">{head}<span className="library-from">{step && nbsp(`Из шага ${step.label}`)}<Icon name="chevron" size={15} /></span></summary>
      <CodeFile file={body.file ?? 'Запрос для сессии'} code={body.body} />
    </details>
  </li>;
}
