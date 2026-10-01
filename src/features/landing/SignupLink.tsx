import { ViewTransition, type ReactNode } from 'react';
import { Link } from 'react-router';

export type SignupMorph = 'hero' | 'guide' | 'outro';

// Signing up from the landing brings new members straight to their route.
const signUp = '/login?next=%2Fpath';

// The login page's chunk loads while the pointer or focus is on its way, so the transition starts at once.
const preloadLogin = () => { void import('../../pages/auth/LoginPage'); };

// Each call to action has its own transition name; the one followed passes it on, and the login
// card takes it, so that pill grows into the card (see LoginPage and `.signup-morph` in styles.css).
export function SignupLink({ morph, children }: { morph: SignupMorph; children: ReactNode }) {
  return <ViewTransition name={`signup-${morph}`} share="signup-morph" enter="none" exit="none" update="none">
    <Link className="glow-button" to={signUp} state={{ morph }} onPointerEnter={preloadLogin} onFocus={preloadLogin}>{children}</Link>
  </ViewTransition>;
}
