import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';

const stages = [
  { label: 'Planner', icon: 'layers', description: 'Разбирает задачу', file: 'implementation-plan.md', lines: ['Изучаю структуру проекта…', 'Разбиваю задачу на 3 этапа', 'План готов. Передаю в разработку.'] },
  { label: 'Builder', icon: 'code', description: 'Пишет код', file: 'src/components/ContactForm.tsx', lines: ['Создаю компонент формы', 'Добавляю валидацию полей', 'Обрабатываю состояния отправки'] },
  { label: 'Reviewer', icon: 'shield', description: 'Проверяет результат', file: 'src/components/ContactForm.test.tsx', lines: ['Проверяю крайние случаи', 'Прогоняю проверки формы', 'Изменения готовы к вашему ревью'] },
] as const;

export function WorkflowDemo() {
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (stage < 2) setStage(stage + 1);
      else { setRunning(false); setFinished(true); }
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [stage, running]);

  function toggleDemo() {
    if (finished) { setStage(0); setFinished(false); setRunning(true); }
    else setRunning(!running);
  }

  return <div className="workflow-scene" id="workflow-demo">
    <div className="scene-orbit" /><div className="scene-orbit orbit-two" />
    <div className="scene-caption"><span className="tiny-cross">+</span> ОТ ИДЕИ ДО РЕЗУЛЬТАТА <span className="caption-line" /></div>
    <div className="workspace">
      <div className="workspace-topbar"><div className="window-dots"><i /><i /><i /></div><span><Icon name="branch" size={13} /> your-next-big-idea</span><Icon name="terminal" size={15} /></div>
      <div className="workspace-body">
        <div className="task-heading"><span className="avatar-you">Вы</span><span>Одна задача. Целая команда.</span><span className="task-time">сейчас</span></div>
        <div className="task-bubble">«Добавим на сайт форму обратной связи.<br />С валидацией и тестами.»<span className="task-cursor" /></div>
        <div className="agent-connector"><span /><i /><span /></div>
        <div className="agent-grid" aria-label="Этапы работы агентов">
          {stages.map((agent, index) => <button key={agent.label} type="button" className={`agent-card ${stage === index && !finished ? 'agent-active' : ''} ${index < stage || finished ? 'agent-done' : ''}`} aria-pressed={stage === index} onClick={() => { setStage(index); setRunning(false); setFinished(false); }}>
            <span className={`agent-icon agent-icon-${index}`}><Icon name={agent.icon} size={20} /></span>
            <strong>{agent.label}</strong><span>{agent.description}</span>
            <span className="agent-status">{index < stage || finished ? <><Icon name="check" size={10} /> готово</> : stage === index ? <><i /> {running ? 'в работе' : 'на старте'}</> : 'в очереди'}</span>
          </button>)}
        </div>
        <div className="code-window">
          <div className="code-file"><Icon name="code" size={13} /><span>{finished ? 'review-summary.md' : stages[stage].file}</span><span className="code-lang">{stage === 0 || finished ? 'MD' : 'TSX'}</span></div>
          <div className="code-lines" aria-live="polite">{finished ? <><p><span>01</span><em>✓</em> Форма и валидация готовы</p><p><span>02</span><em>✓</em> Проверки пройдены</p><p><span>03</span><b>→</b> Последнее слово — за вами<span className="terminal-cursor" /></p></> : stages[stage].lines.map((line, index) => <p key={line}><span>0{index + 1}</span><em>{index === 2 ? '→' : '✓'}</em> {line}{index === 2 && <span className="terminal-cursor" />}</p>)}</div>
        </div>
        <div className="workspace-bottom"><span><span className="live-dot" /> {finished ? 'Готово к вашему ревью' : running ? 'Агенты работают вместе' : 'Интерактивная демонстрация'}</span><button type="button" onClick={toggleDemo} aria-label={finished ? 'Повторить демонстрацию' : running ? 'Приостановить демонстрацию' : 'Запустить демонстрацию'}><Icon name={finished ? 'refresh' : running ? 'pause' : 'play'} size={12} />{finished ? 'Ещё раз' : running ? 'Пауза' : 'Запустить'}</button></div>
      </div>
    </div>
    <div className="control-note"><span className="control-note-icon"><Icon name="check" size={16} /></span><div><strong>Вы — за рулём.</strong><span>Агенты берут на себя рутину.</span></div><span className="note-spark">✳</span></div>
    <div className="scene-bottom"><span className="tiny-cross">+</span><span>HUMAN VISION × AGENT EXECUTION</span><span className="tiny-cross">+</span></div>
  </div>;
}
