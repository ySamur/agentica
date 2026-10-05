import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../features/auth/AuthProvider';
import { callbackAttempt } from '../../lib/supabase';
import { clearDestination, getDestination } from '../../features/auth/redirect';
import { PageStatus } from '../../components/PageStatus';

export function AuthCallbackPage() {
  const { user, loading, configured, error, recovering } = useAuth();
  const navigate = useNavigate();
  const failure = callbackAttempt.errorCode === 'otp_expired'
    ? 'Ссылка из письма устарела или уже использована. Запросите новое письмо на странице входа.'
    : callbackAttempt.error === 'access_denied'
    ? 'Вход отменён. Вы можете попробовать снова.'
    : callbackAttempt.error || error || !callbackAttempt.hasCode
      ? 'Не удалось завершить вход. Ссылка могла устареть — попробуйте войти снова.'
      : null;

  // The first of an email change's two links: the address changes after the other one.
  const halfway = callbackAttempt.hasMessage && !callbackAttempt.hasCode && !callbackAttempt.error;

  useEffect(() => {
    if (loading || !user || failure || halfway) return;
    // The SDK announces a reset link's session (PASSWORD_RECOVERY) from a timer it sets while
    // restoring the session; this later timer runs after it, so a reset always reaches the new
    // password form. Reading the destination here keeps it across StrictMode's second setup.
    const timer = window.setTimeout(() => {
      const destination = getDestination();
      if (recovering) navigate('/password', { replace: true, state: { next: destination, recovery: true } });
      else navigate(destination, { replace: true });
    });
    return () => window.clearTimeout(timer);
  }, [user, loading, failure, halfway, recovering, navigate]);

  if (halfway) return <PageStatus title="Первая ссылка подтверждена" message="Теперь откройте ссылку из второго письма — оно пришло на другой адрес. После неё email сменится." />;
  if (loading) return <PageStatus title="Завершаем вход…" message="Возвращаем вас в agentica." />;
  if (user && !failure) return <PageStatus title="Всё готово…" />;
  // A code without a failure or a session: the SDK had no PKCE verifier for it, so the link was
  // opened in another browser. A confirmation link has confirmed the email by then.
  const message = !configured ? 'Вход временно недоступен. Попробуйте позже.' : failure
    || 'Ссылка открыта не в том браузере, где её запрашивали. Подтверждение или смена email при этом уже сработали: войдите здесь. Ссылку для нового пароля запросите заново в том браузере, где будете её открывать.';
  return <PageStatus title="Вход не завершён" message={message} retry={() => {
    const next = getDestination();
    clearDestination();
    // Reload to start a new SDK instance after a failed initialization.
    window.location.replace(`/login?next=${encodeURIComponent(next)}`);
  }} />;
}
