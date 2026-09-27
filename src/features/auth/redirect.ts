const allowedDestinations = ['/', '/settings/profile', '/content'];
const storageKey = 'agentica.auth.next';

export function safeDestination(value: string | null | undefined) {
  return value && allowedDestinations.includes(value) ? value : '/';
}

export function rememberDestination(destination: string) {
  // Storage is also required by PKCE. Report blocked storage before redirecting.
  sessionStorage.setItem(storageKey, safeDestination(destination));
}

export function getDestination() {
  try { return safeDestination(sessionStorage.getItem(storageKey)); }
  catch { return '/'; }
}

export function clearDestination() {
  try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be blocked. */ }
}
