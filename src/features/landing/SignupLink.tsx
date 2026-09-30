import { ViewTransition, type ReactNode } from 'react';
import { Link } from 'react-router';
import { preloadLogin, signUpPath } from '../auth/signup';

export type SignupMorph = 'hero' | 'guide' | 'outro';

// Each call to action has its own transition name; the one followed passes it on, and the login
// card takes it, so that pill grows into the card (see LoginPage and `.signup-morph` in styles.css).
export function SignupLink({ morph, children }: { morph: SignupMorph; children: ReactNode }) {
  return <ViewTransition name={`signup-${morph}`} share="signup-morph" enter="none" exit="none" update="none">
    <Link className="glow-button" to={signUpPath} state={{ morph }} onPointerEnter={preloadLogin} onFocus={preloadLogin}>{children}</Link>
  </ViewTransition>;
}
