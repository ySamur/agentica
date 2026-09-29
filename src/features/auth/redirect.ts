import { stepAtPath } from '../guide/catalog';

// Pages a sign-in may return to; old addresses redirect to their new homes. Any step of the route
// counts too, so a guest following a link to a step lands on it after signing in.
const allowedDestinations = ['/', '/path', '/profile', '/content', '/settings/profile'];
const storageKey = 'agentica.auth.next';

export function safeDestination(value: string | null | undefined) {
  return value && (allowedDestinations.includes(value) || stepAtPath(value)) ? value : '/';
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
