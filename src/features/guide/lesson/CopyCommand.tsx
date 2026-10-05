import { useRef } from 'react';
import { Icon } from '../../../components/Icon';
import { useCopy } from '../../../lib/useCopy';
import { Rich } from './Rich';
import type { Inline } from './types';

// Where the clipboard is refused, the text is selected for Ctrl+C.
export function selectContents(node: HTMLElement | null) {
  const selection = window.getSelection();
  if (!node || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function CopyCommand({ code, caption }: { code: string; caption?: Inline }) {
  const { status, copy } = useCopy();
  const text = useRef<HTMLElement>(null);
  return <div className="lesson-command">
    <div className="command-line">
      <span className="command-prompt" aria-hidden="true">$</span>
      <code ref={text}>{code}</code>
      <button type="button" className="command-copy" onClick={() => void copy(code, () => selectContents(text.current))}>
        <Icon name={status === 'copied' ? 'check' : 'copy'} size={15} />{status === 'copied' ? 'Скопировано' : 'Скопировать'}
      </button>
    </div>
    {caption && <p className="command-caption"><Rich text={caption} /></p>}
    <span className="visually-hidden" role="status">{status === 'copied' ? 'Команда скопирована.' : status === 'error' ? 'Команда выделена: нажмите Ctrl+C, чтобы скопировать.' : ''}</span>
  </div>;
}
