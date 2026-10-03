import type { LessonSource } from './types.ts';
import { lesson as checkpoints } from './checkpoints.ts';
import { lesson as claudeMd } from './claude-md.ts';
import { lesson as cleanContext } from './clean-context.ts';
import { lesson as conventions } from './conventions.ts';
import { lesson as decomposition } from './decomposition.ts';
import { lesson as exploreCode } from './explore-code.ts';
import { lesson as firstEdit } from './first-edit.ts';
import { lesson as install } from './install.ts';
import { lesson as iterations } from './iterations.ts';
import { lesson as permissions } from './permissions.ts';
import { lesson as planFirst } from './plan-first.ts';
import { lesson as projectView } from './project-view.ts';
import { lesson as taskAnatomy } from './task-anatomy.ts';

// Every written lesson, in route order. `npm run guide:content` publishes them; the tests serve and grade them.
export const lessons: LessonSource[] = [
  install, permissions, exploreCode, firstEdit, checkpoints,
  projectView, claudeMd, conventions, cleanContext,
  taskAnatomy, planFirst, decomposition, iterations,
];
