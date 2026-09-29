import { steps, type GuideStage } from './catalog';

export type StepStatus = 'in_progress' | 'done' | 'skipped';
export type StepProgress = { status: StepStatus; updatedAt: string };
// Keyed by step id; a missing step has not been started.
export type Progress = ReadonlyMap<string, StepProgress>;

export const statusLabels: Record<StepStatus | 'todo', string> = {
  todo: 'Не начат',
  in_progress: 'В процессе',
  done: 'Выполнен',
  skipped: 'Уже умею',
};

// «Уже умею» counts as passed.
export function isComplete(status: StepStatus | undefined) {
  return status === 'done' || status === 'skipped';
}

export function stageTally(stage: GuideStage, progress: Progress) {
  const done = stage.steps.filter(step => isComplete(progress.get(step.id)?.status)).length;
  return { done, total: stage.steps.length };
}

export function completedCount(progress: Progress) {
  return steps.filter(step => isComplete(progress.get(step.id)?.status)).length;
}

export function hasStarted(progress: Progress) {
  return steps.some(step => progress.has(step.id));
}

// Where «Продолжить» leads: the step opened last and not yet finished; otherwise the first unfinished
// one in the recommended order; once everything is passed, the graduation project.
export function resumeStep(progress: Progress) {
  let latest: { step: (typeof steps)[number]; at: number } | null = null;
  for (const step of steps) {
    const entry = progress.get(step.id);
    const at = entry ? Date.parse(entry.updatedAt) : 0;
    if (entry?.status === 'in_progress' && (!latest || at > latest.at)) latest = { step, at };
  }
  if (latest) return latest.step;
  return steps.find(step => !isComplete(progress.get(step.id)?.status)) ?? steps.find(step => step.stage.id === 'capstone')!;
}
