import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router';
import { callbackAttempt, getSupabase, hasStoredSession, supabaseConfigured } from '../../lib/supabase';
import { clearDestination, clearLetterDestination, rememberDestination, rememberLetterDestination } from './redirect';

// `pendingEmail`: a requested new address that waits for its confirmation links.
export type AppUser = { id: string; email: string; pendingEmail: string | null; displayName: string; avatarUrl: string | null; viaGoogle: boolean };
// `confirm`: the email is not confirmed yet, so the session starts from the letter's link.
export type PasswordResult = 'signed-in' | 'confirm';
type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signingOut: boolean;
  configured: boolean;
  error: string | null;
  signIn: (destination: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<PasswordResult>;
  signUp: (email: string, password: string, name: string, destination: string) => Promise<PasswordResult>;
  resendConfirmation: (email: string, destination: string) => Promise<void>;
  requestPasswordReset: (email: string, destination: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  changeEmail: (email: string) => Promise<void>;
  resendEmailChange: (email: string) => Promise<void>;
  // The session came from a password reset letter's link (PASSWORD_RECOVERY).
  recovering: boolean;
  signOut: (returnHome?: boolean) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

export const minPasswordLength = 8;
// A light check before Supabase's own: something@domain.tld.
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const unavailable = 'Вход временно недоступен. Попробуйте позже.';
const offline = 'Не удалось войти. Проверьте соединение и попробуйте ещё раз.';
const sessionEnded = 'Сессия завершена. Войдите снова.';
// Every letter's link (confirmation, password reset) returns through the one allowed callback URL.
const letterRedirect = () => `${window.location.origin}/auth/callback`;
// GoTrue answers 500 `unexpected_failure` when a letter cannot be sent (SMTP).
const letterFailed = (error: AuthError, letter: string) => error.status === 500
  ? `Не удалось отправить ${letter}. Попробуйте позже.`
  : passwordError(error);

// Supabase Auth error codes → what the person can do about them.
function passwordError(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials': return 'Неверный email или пароль.';
    case 'user_already_exists':
    case 'email_exists': return 'Этот email уже зарегистрирован. Войдите паролем или через Google.';
    case 'weak_password': return `Пароль слишком простой: минимум ${minPasswordLength} символов, лучше с буквами и цифрами.`;
    case 'same_password': return 'Новый пароль совпадает с текущим. Придумайте другой.';
    case 'reauthentication_needed':
    case 'reauthentication_not_valid': return 'Для смены пароля войдите заново и повторите.';
    case 'email_address_invalid':
    case 'validation_failed': return 'Проверьте email: похоже, в адресе опечатка.';
    case 'email_not_confirmed': return 'Подтвердите email по ссылке из письма, затем войдите.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
    case 'email_provider_disabled':
    case 'signup_disabled': return 'Вход по email сейчас выключен. Войдите через Google.';
    // The SDK turns 5xx answers into retryable errors without a code; status 0 is no connection.
    default: return (error.status ?? 0) >= 500 ? 'Сервис входа сейчас не отвечает. Попробуйте позже.' : offline;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

function nonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mapUser(user: User): AppUser {
  const metadata = user.user_metadata;
  const avatar = nonEmpty(metadata.avatar_url) || nonEmpty(metadata.picture);
  return {
    id: user.id,
    email: user.email || '',
    pendingEmail: nonEmpty(user.new_email),
    displayName: nonEmpty(metadata.display_name) || nonEmpty(metadata.full_name) || nonEmpty(metadata.name) || 'Пользователь',
    avatarUrl: avatar?.startsWith('https://') ? avatar : null,
    viaGoogle: Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers.includes('google') : user.app_metadata.provider === 'google',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Router navigation is a transition. Keep the route guard paused until the
    // landing has actually committed, rather than racing it with /login.
    if (location.pathname === '/' && !session && signingOut) setSigningOut(false);
  }, [location.pathname, session, signingOut]);

  useEffect(() => {
    const pending = getSupabase();
    if (!pending) return;
    let active = true;
    let revision = 0;
    let unsubscribe = () => {};

    const restore = async () => {
      try {
        const client = await pending;
        if (!active) return;
        const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
          if (!active) return;
          revision += 1;
          setSession(nextSession);
          if (event === 'PASSWORD_RECOVERY') setRecovering(true);
          if (event === 'SIGNED_OUT') { clearDestination(); clearLetterDestination(); setRecovering(false); }
        });
        unsubscribe = () => subscription.unsubscribe();
        const initialized = await client.auth.initialize();
        if (initialized.error) throw initialized.error;
        const currentRevision = revision;
        const result = await client.auth.getSession();
        if (result.error) throw result.error;
        if (active && currentRevision === revision) setSession(result.data.session);
      } catch {
        if (active) setError('Не удалось восстановить сессию. Попробуйте войти снова.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.expires_at) return;
    // Hide protected UI if refresh is impossible (for example, while offline).
    const remaining = session.expires_at * 1000 - Date.now();
    const timer = window.setTimeout(() => setSession(null), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [session]);

  const signIn = useCallback(async (destination: string) => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    setError(null);
    try {
      rememberDestination(destination);
      const client = await pending;
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile',
          queryParams: { prompt: 'select_account' },
        },
      });
      if (signInError) throw signInError;
    } catch {
      throw new Error('Не удалось начать вход. Проверьте соединение и разрешите хранение данных сайта.');
    }
  }, []);

  // The new session arrives through onAuthStateChange; the login page then leaves for its destination.
  const signInWithPassword = useCallback(async (email: string, password: string): Promise<PasswordResult> => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    setError(null);
    let failure: AuthError | null;
    try {
      const client = await pending;
      ({ error: failure } = await client.auth.signInWithPassword({ email: email.trim(), password }));
    } catch {
      throw new Error(offline);
    }
    if (failure?.code === 'email_not_confirmed') return 'confirm';
    if (failure) throw new Error(passwordError(failure));
    return 'signed-in';
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, destination: string): Promise<PasswordResult> => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    setError(null);
    let result;
    try {
      // With email confirmation on, the letter's link returns through /auth/callback to this destination.
      rememberLetterDestination(destination);
      const client = await pending;
      result = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() }, emailRedirectTo: letterRedirect() },
      });
    } catch {
      throw new Error('Не удалось создать аккаунт. Проверьте соединение и разрешите хранение данных сайта.');
    }
    if (result.error) throw new Error(letterFailed(result.error, 'письмо с подтверждением'));
    return result.data.session ? 'signed-in' : 'confirm';
  }, []);

  const resendConfirmation = useCallback(async (email: string, destination: string) => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    let failure: AuthError | null;
    try {
      rememberLetterDestination(destination);
      const client = await pending;
      ({ error: failure } = await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: letterRedirect() } }));
    } catch {
      throw new Error('Не удалось отправить письмо. Проверьте соединение и попробуйте ещё раз.');
    }
    if (failure) throw new Error(letterFailed(failure, 'письмо с подтверждением'));
  }, []);

  // Supabase answers the same whether the address has an account or not. The letter's link signs in
  // with PASSWORD_RECOVERY, and the callback page then opens the new password form.
  const requestPasswordReset = useCallback(async (email: string, destination: string) => {
    const pending = getSupabase();
    if (!pending) throw new Error(unavailable);
    let failure: AuthError | null;
    try {
      rememberLetterDestination(destination);
      const client = await pending;
      ({ error: failure } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: letterRedirect() }));
    } catch {
      throw new Error('Не удалось отправить письмо. Проверьте соединение и попробуйте ещё раз.');
    }
    if (failure) throw new Error(letterFailed(failure, 'письмо со ссылкой'));
  }, []);

  const signOut = useCallback(async (returnHome = false) => {
    const pending = getSupabase();
    if (!pending) return;
    setSigningOut(true);
    try {
      const client = await pending;
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      setSession(null);
      clearDestination();
      setError(signOutError ? 'Вы вышли на этом устройстве. Сервер недоступен: завершение удалённой сессии не подтверждено.' : null);
      if (returnHome) navigate('/', { replace: true });
    } catch (cause) {
      setSigningOut(false);
      throw cause;
    } finally {
      if (!returnHome) setSigningOut(false);
    }
  }, [navigate]);

  const hasSession = Boolean(session);
  const updateName = useCallback(async (value: string) => {
    const pending = getSupabase();
    if (!pending || !hasSession) throw new Error(sessionEnded);
    const name = value.trim();
    if (!name) throw new Error('Введите имя.');
    const client = await pending;
    const { error: updateError } = await client.auth.updateUser({ data: { display_name: name } });
    if (updateError) {
      if (updateError.status === 401 || updateError.status === 403) await signOut();
      throw new Error('Не удалось сохранить имя. Проверьте соединение и попробуйте ещё раз.');
    }
    // USER_UPDATED updates the session through the subscription, including other tabs.
  }, [hasSession, signOut]);

  // A new password ends the account's sessions on other devices: after a reset, someone else may hold one.
  const updatePassword = useCallback(async (password: string) => {
    const pending = getSupabase();
    if (!pending || !hasSession) throw new Error(sessionEnded);
    const client = await pending;
    let failure: AuthError | null;
    try {
      ({ error: failure } = await client.auth.updateUser({ password }));
    } catch {
      throw new Error('Не удалось сохранить пароль. Проверьте соединение и попробуйте ещё раз.');
    }
    if (failure?.status === 401 || (failure?.status === 403 && !failure.code?.startsWith('reauthentication'))) {
      await signOut();
      throw new Error(sessionEnded);
    }
    if (failure) throw new Error(passwordError(failure));
    // Best effort: the password is saved either way.
    await client.auth.signOut({ scope: 'others' }).catch(() => undefined);
  }, [hasSession, signOut]);

  // Supabase keeps the address until its links are followed: the new one's, and with Secure email
  // change (on by default) the current one's too. The last link returns to the profile.
  const changeEmail = useCallback(async (email: string) => {
    const pending = getSupabase();
    if (!pending || !hasSession) throw new Error(sessionEnded);
    let failure: AuthError | null;
    try {
      rememberLetterDestination('/profile');
      const client = await pending;
      ({ error: failure } = await client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: letterRedirect() }));
    } catch {
      throw new Error('Не удалось отправить письмо. Проверьте соединение и попробуйте ещё раз.');
    }
    if (failure?.status === 401 || failure?.status === 403) {
      await signOut();
      throw new Error(sessionEnded);
    }
    if (failure && ['email_exists', 'user_already_exists', 'conflict'].includes(failure.code ?? '')) throw new Error('Этот адрес уже занят другим аккаунтом.');
    if (failure) throw new Error(letterFailed(failure, 'письмо для смены адреса'));
  }, [hasSession, signOut]);

  const resendEmailChange = useCallback(async (email: string) => {
    const pending = getSupabase();
    if (!pending || !hasSession) throw new Error(sessionEnded);
    let failure: AuthError | null;
    try {
      rememberLetterDestination('/profile');
      const client = await pending;
      ({ error: failure } = await client.auth.resend({ type: 'email_change', email, options: { emailRedirectTo: letterRedirect() } }));
    } catch {
      throw new Error('Не удалось отправить письмо. Проверьте соединение и попробуйте ещё раз.');
    }
    if (failure) throw new Error(letterFailed(failure, 'письмо для смены адреса'));
  }, [hasSession]);

  // Stable identities keep consumers and their effects from re-running on unrelated renders.
  const sessionUser = session?.user;
  const user = useMemo(() => sessionUser ? mapUser(sessionUser) : null, [sessionUser]);
  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signingOut, configured: supabaseConfigured, error, signIn, signInWithPassword, signUp, resendConfirmation, requestPasswordReset, updatePassword, changeEmail, resendEmailChange, recovering, signOut, updateName }),
    [user, loading, signingOut, error, signIn, signInWithPassword, signUp, resendConfirmation, requestPasswordReset, updatePassword, changeEmail, resendEmailChange, recovering, signOut, updateName],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

// A session on its way while the SDK loads: one stored by an earlier visit, or a sign-in being
// completed with an OAuth code. The header, the pages and the account menu all treat it as a member.
export function useSessionPending() {
  return useAuth().loading && (hasStoredSession() || callbackAttempt.hasCode);
}
