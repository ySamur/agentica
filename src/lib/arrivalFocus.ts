import { useEffect, useRef } from 'react';
import { useNavigationType } from 'react-router';

// After following a link, focus moves to the new page's heading (`tabIndex={-1}`): screen readers
// announce it and the next Tab continues from there. Loads and back/forward keep the browser's own.
// `key` re-runs it when one page shows another item, as the step page does between steps.
export function useArrivalFocus<T extends HTMLElement>(key?: string) {
  const heading = useRef<T>(null);
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType === 'PUSH') heading.current?.focus({ preventScroll: true });
  }, [navigationType, key]);
  return heading;
}
