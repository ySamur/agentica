import { lazy, Suspense, useEffect, useState, ViewTransition } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router';
import { LandingPage } from '../pages/landing/LandingPage';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { RequireAuth } from '../features/auth/RequireAuth';
import { clearDestination } from '../features/auth/redirect';
import { StarterDialog } from '../features/starter/StarterDialog';
import { SiteHeader } from '../components/SiteHeader';
import { PageStatus } from '../components/PageStatus';
import { scrollToTarget } from '../lib/smoothScroll';
import { hasStoredSession } from '../lib/supabase';

export type PageContext = { openStarter: () => void };

// Only the guest landing ships in the main chunk; other pages load on first visit.
const HomePage = lazy(() => import('../pages/home/HomePage').then(module => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const AuthCallbackPage = lazy(() => import('../pages/auth/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage })));
const ProfilePage = lazy(() => import('../pages/settings/ProfilePage').then(module => ({ default: module.ProfilePage })));
const ContentPage = lazy(() => import('../pages/content/ContentPage').then(module => ({ default: module.ContentPage })));

const titles: Record<string, string> = {
  '/login': 'Вход и регистрация',
  '/auth/callback': 'Завершение входа',
  '/settings/profile': 'Настройки профиля',
  '/content': 'Контент для участников',
};

// `/` is the members' home page or the guest landing. Until the SDK restores the session,
// a stored one predicts it, so members never see the landing flash.
function useMemberHome() {
  const { user, loading } = useAuth();
  return Boolean(user) || (loading && hasStoredSession());
}

// Lazy pages mount after navigation, so wait briefly for the anchor to appear.
function scrollToAnchor(id: string, immediate: boolean) {
  const target = document.getElementById(id);
  if (target) {
    scrollToTarget(target, immediate);
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const found = document.getElementById(id);
    if (!found) return;
    stop();
    scrollToTarget(found, immediate);
  });
  const timer = window.setTimeout(() => stop(), 5000);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timer);
  }
  observer.observe(document.body, { childList: true, subtree: true });
  return stop;
}

function Layout() {
  const [starterOpen, setStarterOpen] = useState(false);
  const location = useLocation();
  const navigationType = useNavigationType();
  const { error, user } = useAuth();
  const memberHome = useMemberHome();
  const openStarter = () => setStarterOpen(true);
  const title = location.pathname === '/'
    ? memberHome ? 'Вы создаёте. Агенты ускоряют.' : 'Код пишет Claude. Решения — ваши.'
    : titles[location.pathname] || 'Страница не найдена';

  useEffect(() => {
    document.title = `agentica — ${title}`;
  }, [title]);

  useEffect(() => {
    if (!['/login', '/auth/callback'].includes(location.pathname)) clearDestination();
    let stopWaiting = () => {};
    // Loading or going back to an anchor jumps straight to it; following a link glides there.
    const immediate = navigationType === 'POP';
    const frame = requestAnimationFrame(() => {
      if (location.hash) stopWaiting = scrollToAnchor(location.hash.slice(1), immediate);
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => { cancelAnimationFrame(frame); stopWaiting(); };
    // Every navigation gets a new key, so following the same anchor link again scrolls again.
  }, [location.pathname, location.hash, location.key, navigationType]);

  return <>
    {/* Remounting per route resets the mobile and account menus after any navigation. */}
    <SiteHeader key={location.pathname} onStart={openStarter} />
    {error && !user && location.pathname === '/' && <p className="auth-notice container" role="status">{error}</p>}
    {/* Router updates run as transitions, so each new page cross-fades in; a hash change on the same
        page is an update and stays still. Suspense sits outside, so a lazy page keeps the old one on
        screen until it is ready instead of flashing the fallback. */}
    <Suspense fallback={<PageStatus title="Загружаем страницу…" />}>
      <ViewTransition key={location.pathname} update="none">
        <Outlet context={{ openStarter } satisfies PageContext} />
      </ViewTransition>
    </Suspense>
    <StarterDialog open={starterOpen} onClose={() => setStarterOpen(false)} />
  </>;
}

function IndexRoute() {
  return useMemberHome() ? <HomePage /> : <LandingPage />;
}

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route element={<Layout />}>
      <Route index element={<IndexRoute />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="settings/profile" element={<ProfilePage />} />
        <Route path="content" element={<ContentPage />} />
      </Route>
      <Route path="*" element={<PageStatus title="Страница не найдена" message="Возможно, адрес изменился. Вернёмся к вашим идеям?" />} />
    </Route>
  </Routes></AuthProvider></BrowserRouter>;
}
