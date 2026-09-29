import { createContext, useContext } from 'react';
import type { Progress } from './progress';

type GuideProgressValue = { progress: Progress; ready: boolean };

// Nothing is stored yet: every step starts as not started.
const GuideProgressContext = createContext<GuideProgressValue>({ progress: new Map(), ready: true });

export function useGuideProgress() {
  return useContext(GuideProgressContext);
}
