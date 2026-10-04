import { stepAtPath } from '../guide/catalog';

// Pages a sign-in may return to; old addresses redirect to their new homes. Any step of the route
// counts too, so a guest following a link to a step lands on it after signing in.
const allowedDestinations = ['/', '/path', '/library', '/profile', '/password', '/content', '/settings/profile'];
const storageKey = 'agentica.auth.next';
// A confirmation letter's link usually opens in a new tab, where sessionStorage is empty. Its
// destination waits in localStorage until a member arrives, a sign-out, or the link's lifetime.
const letterKey = 'agentica.auth.letter-next';
const letterLifetime = 24 * 60 * 60 * 1000;

export function safeDestination(value: string | null | undefined) {
  return value && (allowedDestinations.includes(value) || stepAtPath(value)) ? value : '/';
}

export function rememberDestination(destination: string) {
  // Storage is also required by PKCE. Report blocked storage before redirecting.
  sessionStorage.setItem(storageKey, safeDestination(destination));
}

export function rememberLetterDestination(destination: string) {
  rememberDestination(destination);
  localStorage.setItem(letterKey, JSON.stringify({ to: safeDestination(destination), at: Date.now() }));
}

function letterDestination() {
  const letter: unknown = JSON.parse(localStorage.getItem(letterKey) ?? 'null');
  if (!letter || typeof letter !== 'object' || !('to' in letter) || !('at' in letter)) return null;
  const { to, at } = letter;
  return typeof to === 'string' && typeof at === 'number' && Date.now() - at < letterLifetime ? to : null;
}

export function getDestination() {
  try { return safeDestination(sessionStorage.getItem(storageKey) ?? letterDestination()); }
  catch { return '/'; }
}

export function clearDestination() {
  try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be blocked. */ }
}

export function clearLetterDestination() {
  try { localStorage.removeItem(letterKey); } catch { /* Storage may be blocked. */ }
}
