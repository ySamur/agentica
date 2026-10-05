import type { Inline } from '../../src/features/guide/lesson/types.ts';
import type { LibraryKind } from '../../src/features/library/types.ts';

// A library material as written: it opens to a member once `stepId` is passed. Build materials on
// facts the step's lesson already checked against the docs; never introduce new ones here.
export type LibrarySource = {
  id: string;
  stepId: string;
  kind: LibraryKind;
  title: string;
  summary: Inline;
  // The path to save it under; omit for a prompt pasted into a session.
  file?: string;
  body: string;
};
