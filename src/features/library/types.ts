import type { Inline } from '../guide/lesson/types';

// The library's rows (supabase/migrations/*_library.sql). Titles are open to every member;
// a body arrives only once its step is passed.
export type LibraryKind = 'prompt' | 'template' | 'checklist';
export type LibraryItemRow = { id: string; step_id: string; position: number; kind: LibraryKind; title: string; summary: Inline };
// `file`: the path the material is saved under; null for a prompt to paste into a session.
export type LibraryBodyRow = { item_id: string; file: string | null; body: string };
