import { useState } from 'react';
import type { AppUser } from './AuthProvider';

export function UserAvatar({ user, large = false }: { user: AppUser; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className={`user-avatar ${large ? 'user-avatar-large' : ''}`} aria-hidden="true">
    {user.avatarUrl && failedUrl !== user.avatarUrl
      ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(user.avatarUrl)} />
      : user.displayName.slice(0, 1).toLocaleUpperCase('ru')}
  </span>;
}
