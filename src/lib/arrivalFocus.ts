import { useEffect, useRef } from 'react';
import { useNavigationType } from 'react-router';

// After following a link, focus moves to the new page's heading (`tabIndex={-1}`): screen readers
// announce it and the next Tab continues from there. Loads and back/forward keep the browser's own.
// Every address mounts its page afresh (Layout keys the page by path), so this runs once per page.
export function useArrivalFocus<T extends HTMLElement>() {
  const heading = useRef<T>(null);
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType === 'PUSH') heading.current?.focus({ preventScroll: true });
  }, [navigationType]);
  return heading;
}
