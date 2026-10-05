import { useEffect, useRef, useState, ViewTransition, type ReactNode, type SubmitEvent } from 'react';
import { Link, Navigate, useLocation, useNavigationType, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { emailPattern, minPasswordLength, useAuth } from '../../features/auth/AuthProvider';
import { safeDestination } from '../../features/auth/redirect';
import { PageStatus } from '../../components/PageStatus';
import { nbsp } from '../../lib/typography';

const morphs = ['hero', 'guide', 'library', 'outro'];
type Field = 'name' | 'email' | 'password';
// Sign in, create an account, or ask for a password reset letter.
type Mode = 'signin' | 'signup' | 'reset';

// The landing's call to action that led here (see SignupLink), when it was a fresh step forward.
function morphFrom(state: unknown) {
  const morph = state && typeof state === 'object' && 'morph' in state ? state.morph : null;
  return typeof morph === 'string' && morphs.includes(morph) ? morph : null;
}

export function LoginPage() {
  const { user, loading, configured, error: sessionError, signIn, signInWithPassword, signUp, resendConfirmation, requestPasswordReset } = useAuth();
  const location = useLocation();
  const navigationType = useNavigationType();
  // Read once: the card takes the pill's transition name only on the way in, never on back or reload.
  const [morph] = useState(() => navigationType === 'PUSH' ? morphFrom(location.state) : null);
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Email and password: sign in to an existing account, create one, or reset a forgotten password.
  // The address names the first two (`?mode=signup` for every «Начать бесплатно», see JoinLink), so
  // a reload and the tab title keep the form; the reset form opens from sign-in and stays on its address.
  const requested = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [resetting, setResetting] = useState(false);
  const mode: Mode = resetting ? 'reset' : requested;
  const creating = mode === 'signup';
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<{ field: Field | null; message: string } | null>(null);
  // A letter on its way: a confirmation after sign-up or a sign-in before confirming, or a reset link.
  const [letter, setLetter] = useState<{ email: string; reason: 'signup' | 'unconfirmed' | 'reset' } | null>(null);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle');
  // A new form from the address (a switch below, or the header's «Войти» over the sign-up form) starts clean.
  const [shown, setShown] = useState(requested);
  if (shown !== requested) {
    setShown(requested);
    setResetting(false);
    setFormError(null);
    setLetter(null);
  }
  useEffect(() => {
    if (resend !== 'sent') return;
    // Supabase sends one letter per address a minute.
    const timer = window.setTimeout(() => setResend('idle'), 60_000);
    return () => window.clearTimeout(timer);
  }, [resend]);
  const nameField = useRef<HTMLInputElement>(null);
  const emailField = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  // The field to focus once it is rendered and enabled again (after sending or a mode switch).
  const pendingFocus = useRef<Field | null>(null);
  // A form opened by a link (the header's «Начать бесплатно» goes away with it) starts at its first field too.
  const focusedForm = useRef(requested);
  useEffect(() => {
    if (focusedForm.current === requested) return;
    focusedForm.current = requested;
    pendingFocus.current ??= requested === 'signup' ? 'name' : 'email';
  });
  useEffect(() => {
    if (sending || !pendingFocus.current) return;
    // A form switched through the address renders its fields a moment later.
    const field = ({ name: nameField, email: emailField, password: passwordField })[pendingFocus.current].current;
    if (!field) return;
    field.focus();
    pendingFocus.current = null;
  });
  const next = safeDestination(params.get('next'));
  if (loading) return <PageStatus title="Проверяем сессию…" />;
  if (user) return <Navigate to={next} replace />;

  async function login() {
    setBusy(true);
    setError('');
    try { await signIn(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось войти. Попробуйте ещё раз.'); setBusy(false); }
  }

  // A server's answer (`field` null) is usually about the password.
  function reject(field: Field | null, message: string) {
    setFormError({ field, message });
    pendingFocus.current = field ?? 'password';
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: Field) => String(form.get(key) ?? '');
    const email = value('email').trim();
    const password = value('password');
    setFormError(null);
    setLetter(null);
    if (creating && !value('name').trim()) return reject('name', 'Введите имя.');
    if (!email) return reject('email', 'Введите email.');
    if (!emailPattern.test(email)) return reject('email', 'Проверьте email: похоже, в адресе опечатка.');
    if (resetting) return sendReset(email);
    if (!password) return reject('password', 'Введите пароль.');
    if (creating && password.length < minPasswordLength) return reject('password', 'Пароль слишком короткий.');
    setSending(true);
    try {
      const result = creating ? await signUp(email, password, value('name'), next) : await signInWithPassword(email, password);
      if (result === 'confirm') {
        setLetter({ email, reason: creating ? 'signup' : 'unconfirmed' });
        // Sign-up has just sent a letter, and Supabase allows the next one a minute later.
        setResend(creating ? 'sent' : 'idle');
      }
    } catch (cause) {
      reject(null, cause instanceof Error ? cause.message : 'Не удалось войти. Попробуйте ещё раз.');
    } finally {
      // On success the page leaves for `next` as soon as the session arrives.
      setSending(false);
    }
  }

  async function sendReset(email: string) {
    setSending(true);
    try {
      await requestPasswordReset(email, next);
      setLetter({ email, reason: 'reset' });
      // The letter has just gone out; Supabase allows the next one a minute later.
      setResend('sent');
    } catch (cause) {
      reject('email', cause instanceof Error ? cause.message : 'Не удалось отправить письмо.');
    } finally {
      setSending(false);
    }
  }

  function switchMode(to: Mode) {
    setResetting(to === 'reset');
    if (to !== 'reset' && to !== requested) setParams(current => {
      const updated = new URLSearchParams(current);
      if (to === 'signup') updated.set('mode', 'signup');
      else updated.delete('mode');
      return updated;
    }, { replace: true });
    setFormError(null);
    setLetter(null);
    // The first field of the new form, so keyboard users continue where the form changed.
    pendingFocus.current = to === 'signup' ? 'name' : 'email';
  }

  // aria-disabled rather than disabled: the button keeps focus while it waits.
  async function sendAgain() {
    if (!letter || resend !== 'idle') return;
    setResend('sending');
    setFormError(null);
    try {
      await (letter.reason === 'reset' ? requestPasswordReset : resendConfirmation)(letter.email, next);
      setResend('sent');
    } catch (cause) {
      setFormError({ field: null, message: cause instanceof Error ? cause.message : 'Не удалось отправить письмо.' });
      setResend('idle');
    }
  }

  const letterNote = letter && {
    signup: `Отправили письмо со ссылкой на ${letter.email}. Откройте его в этом браузере — вход завершится сам.`,
    unconfirmed: `Email ещё не подтверждён. Откройте письмо со ссылкой, отправленное на ${letter.email}.`,
    reset: `Если аккаунт с адресом ${letter.email} есть, отправили на него ссылку для нового пароля. Откройте её в этом браузере.`,
  }[letter.reason];

  const invalid = (field: Field) => formError?.field === field;
  const described = (field: Field, help?: string) => [help, invalid(field) ? 'login-form-feedback' : null].filter(Boolean).join(' ') || undefined;

  const morphing = (card: ReactNode) => morph ? <ViewTransition name={`signup-${morph}`} share="signup-morph">{card}</ViewTransition> : card;

  return <main id="main" className="account-page container login-page">
    {morphing(<section className="account-card login-card">
      <span className="account-emblem"><Icon name="spark" size={31} /></span>
      <span className="story-eyebrow"><i /> {nbsp(creating ? 'Регистрация в agentica' : 'Вход в agentica')}</span>
      <h1 tabIndex={-1}>Маршрут начинается <em className="accent glow-text">здесь.</em></h1>
      <p className="login-lead">{nbsp(creating
        ? 'Создайте аккаунт через Google или по email, прогресс сохранится на любом устройстве.'
        : 'Войдите через Google или по email, прогресс сохранится на любом устройстве.')}</p>
      <button className="google-button" onClick={login} disabled={busy}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.9h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.5a12.3 12.3 0 0 1 0-7V15H5.8a20 20 0 0 0 0 18l6.8-5.5Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3l5.8-5.8A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15l6.8 5.5c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>
        {busy ? nbsp('Переходим в Google…') : nbsp('Продолжить с Google')}
      </button>
      <p className="login-caption">{nbsp('Первый вход через Google создаст аккаунт.')}</p>
      {(!configured || error || sessionError) && <p className="form-error" role="alert">{error || (!configured ? 'Вход временно недоступен. Попробуйте позже.' : sessionError)}</p>}
      <p className="login-divider" aria-hidden="true">или</p>
      <form className="login-form" onSubmit={submit} noValidate aria-label={{ signin: 'Вход по email', signup: 'Регистрация по email', reset: 'Восстановление пароля' }[mode]}>
        {creating && <>
          <label htmlFor="login-name">{nbsp('Имя на сайте')}</label>
          <input ref={nameField} id="login-name" name="name" autoComplete="name" disabled={sending} aria-invalid={invalid('name')} aria-describedby={described('name')} />
        </>}
        <label htmlFor="login-email">Email</label>
        <input ref={emailField} id="login-email" name="email" type="email" autoComplete="email" spellCheck={false} disabled={sending} aria-invalid={invalid('email')} aria-describedby={described('email', resetting ? 'login-reset-help' : undefined)} />
        {resetting
          ? <p className="field-help" id="login-reset-help">{nbsp('Пришлём ссылку, по которой можно задать новый пароль.')}</p>
          : <>
            <label htmlFor="login-password">Пароль</label>
            <input ref={passwordField} id="login-password" name="password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} disabled={sending} aria-invalid={invalid('password')} aria-describedby={described('password', creating ? 'login-password-help' : undefined)} />
          </>}
        {creating && <p className="field-help" id="login-password-help">{nbsp(`Минимум ${minPasswordLength} символов.`)}</p>}
        {mode === 'signin' && <button type="button" className="login-forgot" onClick={() => switchMode('reset')} disabled={sending}>{nbsp('Забыли пароль?')}</button>}
        <p id="login-form-feedback" className={`login-feedback ${formError ? 'form-error' : 'form-success'}`} role={formError ? 'alert' : 'status'}>
          {formError?.message || (letterNote ? nbsp(letterNote) : '')}
        </p>
        {letter && <div className="login-letter">
          <button type="button" onClick={sendAgain} aria-disabled={resend !== 'idle'}>
            {resend === 'sending' ? 'Отправляем…' : resend === 'sent' ? 'Письмо отправлено, повторно — через минуту' : 'Отправить письмо ещё раз'}
          </button>
          <p>{nbsp(letter.reason === 'reset'
            ? 'Нет письма? Проверьте спам и адрес. Аккаунт, созданный через Google, получит пароль так же.'
            : 'Нет письма? Проверьте спам. Если адрес уже зарегистрирован, войдите паролем или через Google.')}</p>
        </div>}
        <button className="ghost-button" type="submit" disabled={sending}>
          {sending
            ? { signin: 'Входим…', signup: 'Создаём аккаунт…', reset: 'Отправляем…' }[mode]
            : { signin: 'Войти', signup: 'Создать аккаунт', reset: 'Отправить ссылку' }[mode]}
        </button>
      </form>
      <p className="login-switch">
        {nbsp({ signin: 'Нет аккаунта?', signup: 'Уже есть аккаунт?', reset: 'Вспомнили пароль?' }[mode])}{' '}
        <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} disabled={sending}>{mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}</button>
      </p>
      <Link className="text-link" to="/">Вернуться на главную <Icon name="arrow" size={15} /></Link>
    </section>)}
    <span className="account-page-note"><Icon name="shield" size={15} /> {nbsp('Только имя и email')}</span>
  </main>;
}
