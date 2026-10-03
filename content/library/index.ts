import type { LibrarySource } from './types.ts';
import { materials as automation } from './automation.ts';
import { materials as context } from './context.ts';
import { materials as firstContact } from './first-contact.ts';
import { materials as orchestration } from './orchestration.ts';
import { materials as review } from './review.ts';
import { materials as tasks } from './tasks.ts';

// Every library material, in route order. `npm run library:content` publishes them all; the tests serve them.
export const library: LibrarySource[] = [...firstContact, ...context, ...tasks, ...review, ...automation, ...orchestration];
