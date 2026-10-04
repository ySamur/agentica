import { Icon } from '../../../components/Icon';
import { nbsp } from '../../../lib/typography';
import { Rich } from './Rich';
import type { DiffLine, Inline } from './types';

const signs: Record<DiffLine['kind'], string> = { add: '+', del: '−', ctx: ' ', hunk: '' };
const spoken: Record<DiffLine['kind'], string> = { add: 'добавлено', del: 'удалено', ctx: 'без изменений', hunk: 'фрагмент' };

// A diff as a reviewer reads it: removed and added lines, with marks where the review finds a problem.
export function DiffView({ file, lines, caption }: { file: string; lines: DiffLine[]; caption?: Inline }) {
  return <figure className="lesson-diff">
    <div className="code-bar">
      <span className="code-file"><Icon name="branch" size={13} /> {file}</span>
    </div>
    <ol className="diff-lines">
      {/* Lines repeat (blank context, braces), and the list never reorders: its place is its key. */}
      {lines.map((line, index) => <li key={index} className={`diff-line is-${line.kind}`} data-marked={line.mark ? '' : undefined}>
        <span className="diff-sign" aria-hidden="true">{signs[line.kind]}</span>
        <span className="visually-hidden">{spoken[line.kind]}: </span>
        <code>{line.text || ' '}</code>
        {line.mark && <span className="diff-mark">{nbsp(line.mark)}</span>}
      </li>)}
    </ol>
    {caption && <figcaption className="command-caption"><Rich text={caption} /></figcaption>}
  </figure>;
}
