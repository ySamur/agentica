import { Link, useLocation, type LinkProps } from 'react-router';

// Signing up from a guest page opens the sign-up form and brings new members straight to their route.
const signUpPath = '/login?mode=signup&next=%2Fpath';

// The login page's chunk loads while the pointer or focus is on its way, so it opens at once.
const preloadLogin = () => { void import('../../pages/auth/LoginPage'); };

// Every «Начать бесплатно» link: the header's, the mobile menu's and the landing's pills (SignupLink).
export function JoinLink(props: Omit<LinkProps, 'to' | 'onPointerEnter' | 'onFocus'>) {
  const { pathname, search } = useLocation();
  // From the sign-in form (the header's) the sign-up form keeps the return address it was opened with.
  const next = pathname === '/login' ? new URLSearchParams(search).get('next') : null;
  const to = next ? `/login?mode=signup&next=${encodeURIComponent(next)}` : signUpPath;
  return <Link {...props} to={to} onPointerEnter={preloadLogin} onFocus={preloadLogin} />;
}
