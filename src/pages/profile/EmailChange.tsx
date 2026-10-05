import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { emailPattern, useAuth, type AppUser } from '../../features/auth/AuthProvider';
import { nbsp } from '../../lib/typography';

// An email account's new address: a form behind «Изменить email», then the pending address and its
// letters until the links are followed. Google accounts take their address from Google.
export function EmailChange({ user }: { user: AppUser }) {
  const { changeEmail, resendEmailChange } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle');
  useEffect(() => {
    if (resend !== 'sent') return;
    // Supabase sends one letter per address a minute.
    const timer = window.setTimeout(() => setResend('idle'), 60_000);
    return () => window.clearTimeout(timer);
  }, [resend]);
  const field = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // Focus waits until the field is enabled again, or the form has given way to its button.
  const pendingFocus = useRef<'field' | 'toggle' | null>(null);
  useEffect(() => {
    if (busy || !pendingFocus.current) return;
    (pendingFocus.current === 'field' ? field : toggle).current?.focus();
    pendingFocus.current = null;
  });

  function reject(message: string) {
    setError(message);
    pendingFocus.current = 'field';
  }

  function show(next: boolean) {
    setOpen(next);
    setError('');
    pendingFocus.current = next ? 'field' : 'toggle';
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setError('');
    if (!email) return reject('Введите новый email.');
    if (!emailPattern.test(email)) return reject('Проверьте email: похоже, в адресе опечатка.');
    if (email.toLowerCase() === user.email.toLowerCase()) return reject('Это ваш текущий адрес.');
    setBusy(true);
    try {
      await changeEmail(email);
      setOpen(false);
      // The letters have just gone out: the next ones a minute later.
      setResend('sent');
      pendingFocus.current = 'toggle';
    } catch (cause) {
      reject(cause instanceof Error ? cause.message : 'Не удалось отправить письмо.');
    } finally {
      setBusy(false);
    }
  }

  // aria-disabled rather than disabled: the button keeps focus while it waits.
  async function sendAgain() {
    if (!user.pendingEmail || resend !== 'idle') return;
    setResend('sending');
    setError('');
    try {
      await resendEmailChange(user.pendingEmail);
      setResend('sent');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось отправить письмо.');
      setResend('idle');
    }
  }

  function closeOnEscape(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && !busy) show(false);
  }

  return <div className="email-change">
    {/* Always rendered, so a pending address appearing after a request is announced. */}
    <output className="email-pending">
      {user.pendingEmail && nbsp(`Новый адрес ${user.pendingEmail} ждёт подтверждения. Откройте ссылку из письма на него, а если письмо пришло и на текущий адрес — и там. До этого вход по ${user.email}.`)}
    </output>
    {user.pendingEmail && !open && <button type="button" className="text-button" onClick={sendAgain} aria-disabled={resend !== 'idle'}>
      {resend === 'sending' ? 'Отправляем…' : resend === 'sent' ? 'Письма отправлены, повторно — через минуту' : 'Отправить письма ещё раз'}
    </button>}
    {open
      ? <form className="email-change-form" onSubmit={submit} noValidate>
        <label htmlFor="profile-new-email">Новый email</label>
        <input ref={field} id="profile-new-email" name="email" type="email" autoComplete="email" spellCheck={false} disabled={busy} aria-invalid={Boolean(error)} aria-describedby="new-email-help new-email-feedback" onKeyDown={closeOnEscape} />
        <p className="field-help" id="new-email-help">{nbsp('Пришлём письмо со ссылкой на новый адрес. Email сменится, когда вы её откроете.')}</p>
        <div className="profile-form-footer">
          <button className="ghost-button" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Сменить email'}</button>
          <button type="button" className="text-button" onClick={() => show(false)} disabled={busy}>Отмена</button>
          <span id="new-email-feedback" className="form-error" role="alert">{error}</span>
        </div>
      </form>
      : <>
        <button ref={toggle} type="button" className="ghost-button" onClick={() => show(true)}>{nbsp(user.pendingEmail ? 'Указать другой адрес' : 'Изменить email')}</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </>}
  </div>;
}
