import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../features/auth/AuthProvider';
import { safeDestination } from '../../features/auth/redirect';
import { PageStatus } from '../../components/PageStatus';

export function LoginPage() {
  const { user, loading, configured, error: sessionError, signIn } = useAuth();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = safeDestination(params.get('next'));
  if (loading) return <PageStatus title="Проверяем сессию…" />;
  if (user) return <Navigate to={next} replace />;

  async function login() {
    setBusy(true);
    setError('');
    try { await signIn(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось войти. Попробуйте ещё раз.'); setBusy(false); }
  }

  return <main id="main" className="account-page container login-page">
    <section className="account-card login-card">
      <span className="account-emblem"><Icon name="spark" size={31} /></span>
      <span className="section-eyebrow">ВАШЕ ПРОСТРАНСТВО В AGENTICA</span>
      <h1>Большие идеи.<br /><span className="muted-heading">Начнём с вас.</span></h1>
      <p>Войдите, чтобы открыть свой профиль<br />и материалы для участников.</p>
      <button className="google-button" onClick={login} disabled={busy}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.9h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.5a12.3 12.3 0 0 1 0-7V15H5.8a20 20 0 0 0 0 18l6.8-5.5Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3l5.8-5.8A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15l6.8 5.5c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>
        {busy ? 'Переходим в Google…' : 'Продолжить с Google'}
      </button>
      <p className="login-caption">Первый вход автоматически создаст аккаунт.<br />Отдельный пароль не нужен.</p>
      {(!configured || error || sessionError) && <p className="form-error" role="alert">{error || (!configured ? 'Вход временно недоступен. Попробуйте позже.' : sessionError)}</p>}
      <Link className="text-link" to="/">Вернуться на главную <Icon name="arrow" size={15} /></Link>
    </section>
    <span className="account-page-note"><Icon name="shield" size={14} /> Только профиль и email. Без доступа к письмам.</span>
  </main>;
}
