import { Link, type LinkProps } from 'react-router';

// Signing up from a guest page brings new members straight to their route.
const signUpPath = '/login?next=%2Fpath';

// The login page's chunk loads while the pointer or focus is on its way, so it opens at once.
const preloadLogin = () => { void import('../../pages/auth/LoginPage'); };

// Every «Начать бесплатно» link: the header's, the mobile menu's and the landing's pills (SignupLink).
export function JoinLink(props: Omit<LinkProps, 'to' | 'onPointerEnter' | 'onFocus'>) {
  return <Link {...props} to={signUpPath} onPointerEnter={preloadLogin} onFocus={preloadLogin} />;
}
