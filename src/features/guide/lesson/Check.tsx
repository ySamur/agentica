import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Icon } from '../../../components/Icon';
import { nbsp } from '../../../lib/typography';
import { useGuideProgress } from '../GuideProgress';
import { Rich } from './Rich';
import type { Answers, CheckResult, Question } from './types';

type CheckProps = {
  stepId: string;
  questions: Question[];
  finished: boolean;
  // On while a pass may finish the step: the step page then moves focus to «Следующий шаг».
  expectFinish: (expected: boolean) => void;
};

// The step's check. The server grades every attempt and, once all answers are right, passes the step.
// A wrong answer explains only the chosen options, so trying again still takes thought.
export function Check({ stepId, questions, finished, expectFinish }: CheckProps) {
  const { ready, submitCheck } = useGuideProgress();
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<CheckResult | null>(null);
  // A question answered differently since the last attempt loses its verdict.
  const [verdicts, setVerdicts] = useState<CheckResult['questions']>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [retaking, setRetaking] = useState(false);
  const [seenFinished, setSeenFinished] = useState(finished);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);
  // What takes focus once rendered: the attempt's summary or a question's first option.
  const pendingFocus = useRef<'summary' | string | null>(null);

  // Returned to work after passing: a fresh attempt.
  if (finished !== seenFinished) {
    setSeenFinished(finished);
    if (!finished) {
      setAnswers({});
      setResult(null);
      setVerdicts({});
      setRetaking(false);
    }
  }

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === 'summary') summary.current?.focus();
    else form.current?.querySelector<HTMLInputElement>(`input[name="${target}"]`)?.focus();
  });

  const passed = result?.passed ?? false;

  function choose(question: Question, option: string, checked: boolean) {
    setAnswers(current => {
      const chosen = current[question.id] ?? [];
      const next = !question.multiple ? [option] : checked ? [...chosen, option] : chosen.filter(id => id !== option);
      return { ...current, [question.id]: next };
    });
    setVerdicts(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== question.id)));
    setError('');
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const missing = questions.find(question => !answers[question.id]?.length);
    if (missing) {
      setError(nbsp(`Ответьте на вопрос ${questions.indexOf(missing) + 1}: шаг засчитывается, когда отвечены все.`));
      pendingFocus.current = missing.id;
      return;
    }
    setError('');
    setSending(true);
    expectFinish(!finished);
    try {
      const attempt = await submitCheck(stepId, answers);
      setResult(attempt);
      setVerdicts(attempt.questions);
      // A first pass finishes the step and the page takes focus on; otherwise the summary does.
      if (!attempt.passed || finished) {
        expectFinish(false);
        pendingFocus.current = 'summary';
      }
    } catch (cause) {
      expectFinish(false);
      setError(cause instanceof Error ? cause.message : nbsp('Не удалось проверить ответы.'));
    } finally {
      setSending(false);
    }
  }

  function retake() {
    setRetaking(true);
    setResult(null);
    setAnswers({});
    setVerdicts({});
    pendingFocus.current = questions[0]?.id ?? null;
  }

  const right = Object.values(result?.questions ?? {}).filter(question => question.correct).length;
  const open = !finished || retaking || passed;

  return <section className="lesson-check" id="check" aria-labelledby="check-title">
    <span className="story-eyebrow"><i /> {nbsp(`${questions.length} вопроса`)}</span>
    <h2 id="check-title" tabIndex={-1}>Проверка</h2>
    {!open ? <div className="check-passed">
      <p>{nbsp('Проверка пройдена, шаг засчитан.')}</p>
      <button type="button" className="ghost-button" onClick={retake}>Пройти ещё раз <Icon name="refresh" size={16} /></button>
    </div> : <form ref={form} className="check-form" onSubmit={submit} noValidate>
      {!passed && <p className="check-lead">{nbsp('Шаг засчитается, когда все ответы верны. Ошибиться не страшно: объяснение подскажет, где подвох.')}</p>}
      {questions.map((question, index) => {
        const verdict = verdicts[question.id];
        return <fieldset className="check-question" key={question.id} data-verdict={verdict ? (verdict.correct ? 'right' : 'wrong') : undefined} disabled={sending || passed}>
          <legend><span className="check-number">{index + 1}/{questions.length}</span><span><Rich text={question.prompt} /></span></legend>
          {question.multiple && <p className="check-hint">{nbsp('Отметьте все верные ответы.')}</p>}
          <div className="check-options">
            {question.options.map(option => {
              const inputId = `check-${question.id}-${option.id}`;
              const why = verdict?.why[option.id];
              const chosen = answers[question.id]?.includes(option.id) ?? false;
              return <div className="check-option" key={option.id} data-chosen={chosen || undefined}>
                <input id={inputId} type={question.multiple ? 'checkbox' : 'radio'} name={question.id} value={option.id} checked={chosen}
                  aria-describedby={why ? `${inputId}-why` : undefined} onChange={event => choose(question, option.id, event.target.checked)} />
                <label htmlFor={inputId}><Rich text={option.text} /></label>
                {why && <p className="check-why" id={`${inputId}-why`}><Rich text={why} /></p>}
              </div>;
            })}
          </div>
          {verdict && <p className="check-verdict"><Icon name={verdict.correct ? 'check' : 'close'} size={15} />{verdict.correct ? 'Верно' : 'Пока неверно'}</p>}
        </fieldset>;
      })}
      {result && <p className="check-summary" ref={summary} tabIndex={-1} data-passed={passed || undefined}>
        {passed ? nbsp('Все ответы верны — шаг засчитан. Объяснения ко всем вариантам — выше.') : nbsp(`Верно ${right} из ${questions.length}. Объяснения под выбранными ответами подскажут, где подвох: поправьте и проверьте ещё раз.`)}
      </p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!passed && <button type="submit" className={finished ? 'ghost-button' : 'glow-button'} disabled={sending || !ready}>
        {sending ? 'Проверяем…' : 'Проверить ответы'} <Icon name="check" size={18} />
      </button>}
    </form>}
  </section>;
}
