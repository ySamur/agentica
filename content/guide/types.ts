import type { Inline, Lesson } from '../../src/features/guide/lesson/types.ts';

// A lesson as written: the public lesson plus the answer key (`correct`, `why`), which
// `scripts/guideContent.ts` splits off for the server.
export type OptionSource = { id: string; text: Inline; correct?: true; why: Inline };
export type QuestionSource = { id: string; prompt: Inline; multiple?: boolean; options: OptionSource[] };

export type LessonSource = Omit<Lesson, 'check' | 'verified'> & {
  stepId: string;
  // When the facts were last checked against the Claude Code docs (YYYY-MM-DD).
  verified: string;
  // The Claude Code release those docs described (`2.1.289`); members see it with the date.
  claudeCode: string;
  check?: { questions: QuestionSource[] };
};
