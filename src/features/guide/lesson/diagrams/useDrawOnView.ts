import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../../../lib/motion';

// A diagram draws itself in order (CSS `--i`) the first time it is mostly on screen.
// `data-play`: `pending` until then, `on` after; absent under reduced motion, so it rests drawn.
export function useDrawOnView() {
  const figure = useRef<SVGSVGElement>(null);
  const [play, setPlay] = useState<'pending' | 'on' | undefined>(() => prefersReducedMotion() ? undefined : 'pending');

  useEffect(() => {
    const element = figure.current;
    if (play !== 'pending' || !element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      setPlay('on');
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [play]);

  return { figure, play };
}
