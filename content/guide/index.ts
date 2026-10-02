import type { LessonSource } from './types.ts';
import { lesson as planFirst } from './plan-first.ts';

// Every written lesson. `npm run guide:content` publishes them; the tests serve and grade them.
export const lessons: LessonSource[] = [planFirst];
