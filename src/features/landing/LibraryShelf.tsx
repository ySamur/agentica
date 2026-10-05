import type { CSSProperties } from 'react';
import { Icon } from '../../components/Icon';
import { findStep } from '../guide/catalog';
import type { LibraryKind } from '../library/types';
import { starterPrompts } from '../starter/prompts';
import { nbsp } from '../../lib/typography';

// What the members' library holds, by kind (content/library/; tests/landing.spec.ts keeps them in step).
export const libraryCounts: Record<LibraryKind, number> = { prompt: 5, template: 14, checklist: 4 };
export const libraryTotal = Object.values(libraryCounts).reduce((sum, count) => sum + count, 0);

const kindLabels: Record<LibraryKind, string> = { prompt: 'Запрос', template: 'Шаблон', checklist: 'Чеклист' };

// Real materials from across the route, in its order; only titles, as members see them before a step is passed.
// The first one's body is public anyway: it is a starter prompt of the landing's own dialog.
const shelf: { id: string; step: string; kind: LibraryKind; title: string }[] = [
  { id: 'prompt-review', step: 'install', kind: 'prompt', title: 'Запрос: ревью кода' },
  { id: 'claude-md-template', step: 'claude-md', kind: 'template', title: 'Шаблон CLAUDE.md' },
  { id: 'plan-prompt', step: 'plan-first', kind: 'prompt', title: 'Сначала план' },
  { id: 'diff-checklist', step: 'read-diff', kind: 'checklist', title: 'Ревью diff агента' },
  { id: 'hook-settings', step: 'hooks', kind: 'template', title: 'Хук после каждой правки' },
  { id: 'reviewer-agent', step: 'subagents', kind: 'template', title: 'Субагент-ревьюер' },
];

// Without motion the shelf rests part-way: a couple of materials taken, the rest waiting.
export const shelfOpened = 2;
const preview = starterPrompts.review.text.split('\n').filter(Boolean).slice(0, 3);

// The members' library in miniature. With motion its materials unlock one by one as the section
// scrolls and the counter runs to the whole library (motion/shelf.ts).
export function LibraryShelf() {
  return <div className="vault-shelf" style={{ '--fill': shelfOpened / libraryTotal } as CSSProperties}>
    <div className="vault-bar">
      <span><Icon name="layers" size={15} /> Библиотека</span>
      <span className="vault-count"><b>{shelfOpened}</b> из {libraryTotal} открыто</span>
    </div>
    <i className="vault-meter" />
    <ul className="vault-list">
      {shelf.map((item, index) => <li className="vault-item" data-open={index < shelfOpened || undefined} key={item.id}>
        <span className="vault-lock"><Icon name="lock" size={15} /><Icon name="check" size={15} /></span>
        <span className="vault-kind">{kindLabels[item.kind]}</span>
        <strong>{nbsp(item.title)}</strong>
        <span className="vault-step">{`шаг ${findStep(item.step)?.label ?? ''}`}</span>
        {index === 0 && <code className="vault-preview">{preview.map(line => <span key={line}>{nbsp(line)}</span>)}</code>}
      </li>)}
    </ul>
    <p className="vault-done"><Icon name="spark" size={15} /> {nbsp('Вся библиотека — ваша')}</p>
  </div>;
}
