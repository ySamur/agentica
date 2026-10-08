import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { nbsp } from '../../../lib/typography';
import { Rich } from './Rich';
import type { SpotBlock } from './types';

// A trainer inside the lesson: the member reads the agent's plan and picks the item they would not approve. The answer
// opens right here, in the browser; nothing is sent or recorded, so it never counts toward the step.
export function SpotTrainer({ block }: { block: SpotBlock }) {
  const id = useId();
  const [chosen, setChosen] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const result = useRef<HTMLParagraphElement>(null);
  // What takes focus once rendered: the answer after a try, the first item after starting over.
  const pendingFocus = useRef<'result' | 'first' | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'result') result.current?.focus();
    if (target === 'first') form.current?.querySelector<HTMLInputElement>('input')?.focus();
  });

  function check(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen) {
      setHint(nbsp('Выберите пункт, который вы бы не одобрили.'));
      pendingFocus.current = 'first';
      return;
    }
    setRevealed(true);
    pendingFocus.current = 'result';
  }

  function retry() {
    setChosen('');
    setRevealed(false);
    pendingFocus.current = 'first';
  }

  const right = chosen === block.answer;
  return <figure className="lesson-spot">
    <form ref={form} onSubmit={check} noValidate>
      <fieldset className="spot-plan" disabled={revealed}>
        <legend><span className="story-eyebrow"><i /> Тренажёр</span><span className="spot-prompt"><Rich text={block.prompt} /></span></legend>
        <div className="code-bar"><span className="code-file"><Icon name="terminal" size={13} /> {nbsp(block.title)}</span></div>
        <ol className="spot-items">
          {block.items.map((item, index) => {
            const inputId = `${id}-${item.id}`;
            const verdict = !revealed ? undefined : item.id === block.answer ? 'right' : item.id === chosen ? 'wrong' : undefined;
            return <li className="check-option spot-item" key={item.id} data-verdict={verdict}>
              <input id={inputId} type="radio" name={id} value={item.id} checked={chosen === item.id}
                onChange={() => { setChosen(item.id); setHint(''); }} />
              <label htmlFor={inputId}><span className="spot-number" aria-hidden="true">{index + 1}</span><span><Rich text={item.text} /></span></label>
            </li>;
          })}
        </ol>
      </fieldset>
      {revealed
        ? <div className="spot-result">
          <p className="spot-answer" ref={result} tabIndex={-1} data-right={right || undefined}>
            <strong>{right ? 'Верно.' : 'Не этот пункт.'}</strong> <Rich text={block.reveal} />
          </p>
          <button type="button" className="ghost-button" onClick={retry}>Попробовать ещё раз <Icon name="refresh" size={16} /></button>
        </div>
        : <div className="spot-result">
          {hint && <p className="form-error" role="alert">{hint}</p>}
          <button type="submit" className="ghost-button">Показать ответ <Icon name="check" size={16} /></button>
        </div>}
    </form>
  </figure>;
}
