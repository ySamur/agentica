import { useEffect, useState } from 'react';
import { getSupabase, type MemberContent } from '../../lib/supabase';
import { useAuth } from '../../features/auth/AuthProvider';
import { Icon } from '../../components/Icon';

export function ContentPage() {
  const { user, signOut } = useAuth();
  const [content, setContent] = useState<MemberContent | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending || !user) return;
    const controller = new AbortController();
    setLoading(true);
    setContent(null);
    setError('');
    async function load() {
      try {
        const client = await pending!;
        if (controller.signal.aborted) return;
        const { data, error: requestError, status } = await client.from('member_content').select('slug, body').eq('slug', 'test').abortSignal(controller.signal).single().retry(false);
        if (controller.signal.aborted) return;
        if (status === 401) { await signOut(); return; }
        if (requestError || !data) throw requestError;
        setContent(data);
      } catch {
        if (!controller.signal.aborted) setError('Не удалось загрузить контент. Проверьте соединение и попробуйте ещё раз.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [user?.id, attempt, signOut]);

  return <main id="main" className="account-page container content-page">
    <div className="page-heading"><span className="section-eyebrow"><span className="small-square" /> ДЛЯ УЧАСТНИКОВ</span><h1>Ваше пространство<span className="muted-heading">.</span></h1><p>Материалы, доступные после входа.</p></div>
    <section className="account-card content-card" aria-live="polite">
      <div className="content-card-top"><span className="account-emblem"><Icon name="layers" size={26} /></span><span className="connected-label"><Icon name="shield" size={13} /> Только для участников</span></div>
      {loading ? <p role="status">Загружаем контент…</p> : error ? <><p className="form-error" role="alert">{error}</p><button className="button button-dark" onClick={() => setAttempt(attempt + 1)}>Повторить загрузку <Icon name="refresh" size={16} /></button></> : <p className="member-content">{content?.body}</p>}
    </section>
  </main>;
}
