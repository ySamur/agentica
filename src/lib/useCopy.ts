import { useEffect, useState } from 'react';

export type CopyStatus = 'idle' | 'copied' | 'error';

// Copies text to the clipboard. Where the browser refuses, `fallback` selects the text so it can be
// copied by hand. The status, for a `role="status"` line, returns to idle after a few seconds.
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy(text: string, fallback: () => void) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      fallback();
      setStatus('error');
    }
  }

  return { status, copy, reset: () => setStatus('idle') };
}
