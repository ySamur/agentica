// A step's lesson as a member's browser receives it (`guide_steps.lesson`). Lessons are written in
// `content/guide/` together with their answer keys and compiled by `scripts/guideContent.ts`;
// the keys stay on the server (`private.guide_checks`).

// Text with two marks only, `code` and **strong**. Never HTML.
export type Inline = string;

// One line of a simulated Claude Code session; the kinds match the landing's session.
export type SessionLine = { kind: 'command' | 'meta' | 'prompt' | 'info' | 'edit' | 'pass' | 'done'; text: string; typed?: boolean; diff?: string };

// Diagrams are components (`lesson/diagrams/`), picked by name.
export type DiagramName = 'plan-loop' | 'checkpoints' | 'permission-modes' | 'context-window' | 'memory-layers';

// `file`: the text is file content, not a prompt (no `>`).
export type CompareSide = { label: string; text: string; note: Inline; file?: boolean };

export type Block =
  | { type: 'text'; text: Inline }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: Inline[]; ordered?: boolean }
  | { type: 'callout'; tone: 'tip' | 'trap'; title: string; text: Inline }
  | { type: 'command'; code: string; caption?: Inline }
  // A whole file or snippet, under its file name.
  | { type: 'code'; file: string; code: string; caption?: Inline }
  // `summary` is what screen readers get instead of the animation.
  | { type: 'session'; title: string; summary: string; lines: SessionLine[] }
  | { type: 'compare'; before: CompareSide; after: CompareSide }
  | { type: 'diagram'; name: DiagramName; caption: Inline };

export type Question = { id: string; prompt: Inline; multiple?: boolean; options: { id: string; text: Inline }[] };

export type Lesson = {
  minutes: number;
  // What the member can do after the step.
  outcome: Inline;
  blocks: Block[];
  practice: { task: Inline; done: Inline[] };
  check?: { questions: Question[] };
};

// Option ids chosen per question.
export type Answers = Record<string, string[]>;

// The server's verdict on one attempt (`submit_guide_check`): explanations for the chosen options,
// for every option once all answers are right, and then the step's progress row.
export type CheckResult = {
  passed: boolean;
  questions: Record<string, { correct: boolean; why: Record<string, Inline> }>;
  progress?: { status: 'done'; updated_at: string };
};
