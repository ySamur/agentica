import { ViewTransition, type ReactNode } from 'react';
import { JoinLink } from '../auth/JoinLink';

export type SignupMorph = 'hero' | 'guide' | 'outro';

// Each call to action has its own transition name; the one followed passes it on, and the login
// card takes it, so that pill grows into the card (see LoginPage and `.signup-morph` in styles.css).
export function SignupLink({ morph, children }: { morph: SignupMorph; children: ReactNode }) {
  return <ViewTransition name={`signup-${morph}`} share="signup-morph" enter="none" exit="none" update="none">
    <JoinLink className="glow-button" state={{ morph }}>{children}</JoinLink>
  </ViewTransition>;
}
