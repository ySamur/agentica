import type { LessonSource } from './types.ts';
import { lesson as checkpoints } from './checkpoints.ts';
import { lesson as exploreCode } from './explore-code.ts';
import { lesson as firstEdit } from './first-edit.ts';
import { lesson as install } from './install.ts';
import { lesson as permissions } from './permissions.ts';
import { lesson as planFirst } from './plan-first.ts';

// Every written lesson. `npm run guide:content` publishes them; the tests serve and grade them.
export const lessons: LessonSource[] = [install, permissions, exploreCode, firstEdit, checkpoints, planFirst];
