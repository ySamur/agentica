import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../features/auth/AuthProvider';
import { callbackAttempt } from '../../lib/supabase';
import { clearDestination, getDestination } from '../../features/auth/redirect';
import { PageStatus } from '../../components/PageStatus';

export function AuthCallbackPage() {
  const { user, loading, configured, error } = useAuth();
  const navigate = useNavigate();
  const failure = callbackAttempt.error === 'access_denied'
    ? 'Вход отменён. Вы можете попробовать снова.'
    : callbackAttempt.error || error || !callbackAttempt.hasCode
      ? 'Не удалось завершить вход. Ссылка могла устареть — попробуйте войти снова.'
      : null;

  useEffect(() => {
    if (loading) return;
    if (user && !failure) {
      const destination = getDestination();
      // Keep the same destination across StrictMode's second effect setup.
      navigate(destination, { replace: true });
    }
  }, [user, loading, failure, navigate]);

  if (loading) return <PageStatus title="Завершаем вход…" message="Возвращаем вас в agentica." />;
  if (user && !failure) return <PageStatus title="Всё готово…" />;
  const message = !configured ? 'Вход временно недоступен. Попробуйте позже.' : failure || 'Не удалось получить сессию. Попробуйте войти снова.';
  return <PageStatus title="Вход не завершён" message={message} retry={() => {
    const next = getDestination();
    clearDestination();
    // Reload to start a new SDK instance after a failed initialization.
    window.location.replace(`/login?next=${encodeURIComponent(next)}`);
  }} />;
}
