import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAuth, type AppUser } from '../../features/auth/AuthProvider';
import { avatarImage, avatarTypes, maxAvatarFile } from '../../features/auth/avatarImage';
import { nbsp } from '../../lib/typography';

// The profile photo: upload one (cropped and re-encoded in the browser) or remove it, falling back to
// Google's photo or the name's first letter.
export function AvatarPicker({ user }: { user: AppUser }) {
  const { updateAvatar } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  // «Убрать фото» disappears once the photo is gone; focus moves to the upload button then.
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current || busy) return;
    upload.current?.focus();
    refocus.current = false;
  });

  async function run(kind: 'upload' | 'remove', task: () => Promise<void>, doneText: string) {
    setBusy(kind);
    setError('');
    setDone('');
    try {
      await task();
      setDone(doneText);
      if (kind === 'remove') refocus.current = true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить фото.');
    } finally {
      setBusy(null);
    }
  }

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // The same file can be picked again after a failure.
    event.target.value = '';
    if (!file) return;
    setDone('');
    if (!avatarTypes.includes(file.type)) { setError(nbsp('Подойдёт фото в JPG, PNG или WebP.')); return; }
    if (file.size > maxAvatarFile) { setError(nbsp('Файл больше 10 МБ. Выберите фото поменьше.')); return; }
    await run('upload', async () => {
      let image: Blob;
      try { image = await avatarImage(file); }
      catch { throw new Error(nbsp('Не получилось прочитать картинку. Попробуйте другой файл.')); }
      await updateAvatar(image);
    }, 'Фото обновлено');
  }

  // aria-disabled rather than disabled: the buttons keep focus while the photo saves.
  return <div className="avatar-picker">
    <input ref={input} type="file" accept={avatarTypes.join(',')} hidden onChange={pick} />
    <div className="avatar-picker-actions">
      <button ref={upload} type="button" className="ghost-button" aria-disabled={busy !== null} onClick={() => { if (!busy) input.current?.click(); }}>
        {busy === 'upload' ? 'Загружаем…' : user.ownAvatar ? 'Заменить фото' : 'Загрузить фото'}
      </button>
      {user.ownAvatar && <button type="button" className="text-button" aria-disabled={busy !== null} onClick={() => { if (!busy) void run('remove', () => updateAvatar(null), 'Фото убрано'); }}>
        {busy === 'remove' ? 'Убираем…' : 'Убрать фото'}
      </button>}
    </div>
    <p className="avatar-picker-help">{nbsp(`JPG, PNG или WebP до 10 МБ, обрежем до квадрата.${user.viaGoogle && user.avatarUrl && !user.ownAvatar ? ' Сейчас стоит фото из Google.' : ''}`)}</p>
    <span className="form-error" role="alert">{error}</span>
    <output className="form-success">{done}</output>
  </div>;
}
