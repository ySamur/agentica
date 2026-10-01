import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../features/auth/AuthProvider';
import { callbackAttempt } from '../../lib/supabase';
import { clearDestination, getDestination } from '../../features/auth/redirect';
import { PageStatus } from '../../components/PageStatus';

export function AuthCallbackPage() {
  const { user, loading, configured, error } = useAuth();
  const navigate = useNavigate();
  const failure = callbackAttempt.errorCode === 'otp_expired'
    ? 'Ссылка из письма устарела или уже использована. Войдите с паролем: мы предложим отправить новое письмо.'
    : callbackAttempt.error === 'access_denied'
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
  // A code without a failure or a session: the SDK had no PKCE verifier for it, so the link was
  // opened in another browser. A letter's link has confirmed the email by then.
  const message = !configured ? 'Вход временно недоступен. Попробуйте позже.' : failure
    || 'Ссылка открыта не в том браузере, где начинали вход. Если вы подтверждали email, он уже подтверждён: войдите здесь с паролем.';
  return <PageStatus title="Вход не завершён" message={message} retry={() => {
    const next = getDestination();
    clearDestination();
    // Reload to start a new SDK instance after a failed initialization.
    window.location.replace(`/login?next=${encodeURIComponent(next)}`);
  }} />;
}
