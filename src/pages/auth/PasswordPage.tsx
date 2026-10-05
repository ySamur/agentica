import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../../components/Icon';
import { minPasswordLength, useAuth } from '../../features/auth/AuthProvider';
import { safeDestination } from '../../features/auth/redirect';
import { nbsp } from '../../lib/typography';

type Field = 'password' | 'repeat';

// Where the form came from: a reset letter's link (carrying the page asked for before it) or the profile.
function arrival(state: unknown) {
  const from = state && typeof state === 'object' ? state as { next?: unknown; recovery?: unknown } : {};
  return { next: safeDestination(typeof from.next === 'string' ? from.next : null), recovery: from.recovery === true };
}

export function PasswordPage() {
  const { user, updatePassword } = useAuth();
  const location = useLocation();
  const [{ next, recovery }] = useState(() => arrival(location.state));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: Field | null; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const passwordField = useRef<HTMLInputElement>(null);
  const repeatField = useRef<HTMLInputElement>(null);
  const onward = useRef<HTMLAnchorElement>(null);
  // Focus waits until the fields are enabled again, or the saved state has rendered its link.
  const pendingFocus = useRef<Field | 'onward' | null>(null);
  useEffect(() => {
    if (busy || !pendingFocus.current) return;
    ({ password: passwordField, repeat: repeatField, onward })[pendingFocus.current].current?.focus();
    pendingFocus.current = null;
  });
  if (!user) return null;

  function reject(field: Field | null, message: string) {
    setError({ field, message });
    pendingFocus.current = field ?? 'password';
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const repeat = String(form.get('repeat') ?? '');
    setError(null);
    if (!password) return reject('password', 'Введите новый пароль.');
    if (password.length < minPasswordLength) return reject('password', 'Пароль слишком короткий.');
    if (repeat !== password) return reject('repeat', 'Пароли не совпадают.');
    setBusy(true);
    try {
      await updatePassword(password);
      setSaved(true);
      pendingFocus.current = 'onward';
    } catch (cause) {
      reject(null, cause instanceof Error ? cause.message : 'Не удалось сохранить пароль.');
    } finally {
      setBusy(false);
    }
  }

  const invalid = (field: Field) => error?.field === field || (error !== null && error.field === null && field === 'password');
  const onwardLabel = next === '/profile' ? 'Вернуться в профиль' : 'Продолжить';

  return <main id="main" className="account-page container">
    <div className="page-heading">
      <span className="story-eyebrow"><i /> {nbsp(recovery ? 'Восстановление доступа' : 'Ваш аккаунт')}</span>
      <h1 tabIndex={-1}>Новый пароль.</h1>
      <p>{nbsp(recovery
        ? 'Вы вошли по ссылке из письма. Задайте новый пароль: старый перестанет работать.'
        : 'Задайте новый пароль: старый перестанет работать.')}</p>
    </div>
    <div className="profile-layout">
      <section className="account-card profile-card" aria-labelledby="password-title">
        <h2 id="password-title">{nbsp(`Пароль для ${user.email}`)}</h2>
        {saved
          ? <div className="password-saved">
            <output className="form-success">{nbsp('Пароль сохранён. На других устройствах войдите заново с новым паролем.')}</output>
            <Link ref={onward} className="glow-button" to={next}>{onwardLabel} <Icon name="arrow" size={17} /></Link>
          </div>
          : <form className="password-form" onSubmit={save} noValidate>
            {/* Password managers pair the new password with this account's address. */}
            <input name="username" type="email" autoComplete="username" value={user.email} readOnly hidden />
            <label htmlFor="password-new">Новый пароль</label>
            <input ref={passwordField} id="password-new" name="password" type="password" autoComplete="new-password" disabled={busy} aria-invalid={invalid('password')} aria-describedby="password-help password-feedback" />
            <p className="field-help" id="password-help">{nbsp(`Минимум ${minPasswordLength} символов.`)}</p>
            <label htmlFor="password-repeat">Повторите пароль</label>
            <input ref={repeatField} id="password-repeat" name="repeat" type="password" autoComplete="new-password" disabled={busy} aria-invalid={invalid('repeat')} aria-describedby="password-feedback" />
            <div className="profile-form-footer">
              <button className="glow-button" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить пароль'}<Icon name="check" size={17} /></button>
              <span id="password-feedback" className="form-error" role="alert">{error ? nbsp(error.message) : ''}</span>
            </div>
            <Link className="text-link" to={next}>{nbsp(recovery ? 'Не менять пароль сейчас' : 'Отмена')} <Icon name="arrow" size={15} /></Link>
          </form>}
      </section>
    </div>
  </main>;
}
