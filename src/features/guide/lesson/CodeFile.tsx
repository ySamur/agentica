import { useRef } from 'react';
import { Icon } from '../../../components/Icon';
import { useCopy } from '../../../lib/useCopy';
import { selectContents } from './CopyCommand';
import { Rich } from './Rich';
import type { Inline } from './types';

// A file or snippet the member can copy as is: a settings file, CLAUDE.md, a hook.
export function CodeFile({ file, code, caption }: { file: string; code: string; caption?: Inline }) {
  const { status, copy } = useCopy();
  const text = useRef<HTMLElement>(null);
  return <figure className="lesson-code">
    <div className="code-bar">
      <span className="code-file"><Icon name="code" size={13} /> {file}</span>
      <button type="button" className="command-copy" onClick={() => void copy(code, () => selectContents(text.current))} aria-label={`Скопировать ${file}`}>
        <Icon name={status === 'copied' ? 'check' : 'copy'} size={15} />{status === 'copied' ? 'Скопировано' : 'Скопировать'}
      </button>
    </div>
    <pre><code ref={text}>{code}</code></pre>
    {caption && <figcaption className="command-caption"><Rich text={caption} /></figcaption>}
    <span className="visually-hidden" role="status">{status === 'copied' ? `${file} скопирован.` : status === 'error' ? 'Текст выделен: нажмите Ctrl+C, чтобы скопировать.' : ''}</span>
  </figure>;
}
