import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { LandingPage } from '../pages/landing/LandingPage';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { RequireAuth } from '../features/auth/RequireAuth';
import { clearDestination } from '../features/auth/redirect';
import { StarterDialog } from '../features/starter/StarterDialog';
import { SiteHeader } from '../components/SiteHeader';
import { PageStatus } from '../components/PageStatus';
import { hasStoredSession } from '../lib/supabase';

export type PageContext = { openStarter: () => void };

// Only the guest landing ships in the main chunk; other pages load on first visit.
const HomePage = lazy(() => import('../pages/home/HomePage').then(module => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const AuthCallbackPage = lazy(() => import('../pages/auth/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage })));
const ProfilePage = lazy(() => import('../pages/settings/ProfilePage').then(module => ({ default: module.ProfilePage })));
const ContentPage = lazy(() => import('../pages/content/ContentPage').then(module => ({ default: module.ContentPage })));

const titles: Record<string, string> = {
  '/': 'Вы создаёте. Агенты ускоряют.',
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
function scrollToAnchor(id: string) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const found = document.getElementById(id);
    if (!found) return;
    stop();
    found.scrollIntoView();
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
  const { error, user } = useAuth();
  const openStarter = () => setStarterOpen(true);

  useEffect(() => {
    document.title = `agentica — ${titles[location.pathname] || 'Страница не найдена'}`;
    if (!['/login', '/auth/callback'].includes(location.pathname)) clearDestination();
    let stopWaiting = () => {};
    const frame = requestAnimationFrame(() => {
      if (location.hash) stopWaiting = scrollToAnchor(location.hash.slice(1));
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => { cancelAnimationFrame(frame); stopWaiting(); };
  }, [location.pathname, location.hash]);

  return <>
    {/* Remounting per route resets the mobile and account menus after any navigation. */}
    <SiteHeader key={location.pathname} onStart={openStarter} />
    {error && !user && location.pathname === '/' && <p className="auth-notice container" role="status">{error}</p>}
    <Suspense fallback={<PageStatus title="Загружаем страницу…" />}>
      <Outlet context={{ openStarter } satisfies PageContext} />
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
