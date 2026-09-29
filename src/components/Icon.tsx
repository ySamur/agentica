import type { ReactNode } from 'react';
import { Link } from 'react-router';

export type IconName = 'arrow' | 'arrowUp' | 'chevron' | 'play' | 'pause' | 'check' | 'code' | 'layers' | 'shield' | 'spark' | 'terminal' | 'branch' | 'close' | 'menu' | 'copy' | 'plus' | 'refresh' | 'command' | 'target' | 'lock';

const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  arrowUp: <path d="M6 18 18 6M6 6h12v12" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  play: <path d="m9 5 11 7-11 7Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  check: <path d="m5 12 4 4L19 6" />,
  code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-13-2 16" />,
  layers: <path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5" />,
  shield: <><path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z" /><path d="m8 11 3 3 5-5" /></>,
  spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z" />,
  terminal: <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m6 9 3 3-3 3m7 0h5" /></>,
  branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10m0-4h5a7 7 0 0 0 7-5" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v13h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: <path d="M20 11a8 8 0 1 0-2 7M20 4v7h-7" />,
  command: <path d="M9 9V5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v14a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V9Z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Brand() {
  return <Link className="brand" to="/#home" aria-label="agentica — на главную"><span className="brand-symbol" aria-hidden="true"><span /><span /><span /><span /></span>agentica<span className="brand-dot">.</span></Link>;
}
