import { nbsp } from '../../lib/typography';

type PaneLine = { kind: 'command' | 'prompt' | 'info' | 'del' | 'add' | 'pass'; text: string };

// Each step comes with what it looks like in the terminal.
const steps: { title: string; text: string; pane: PaneLine[] }[] = [
  {
    title: nbsp('Начните с малого'), text: nbsp('Дайте Claude Code изолированную задачу: тест, объяснение модуля, воспроизводимую ошибку.'),
    pane: [{ kind: 'command', text: 'claude' }, { kind: 'prompt', text: 'Объясни, как устроен src/cart' }, { kind: 'info', text: 'CartService, promo.ts и 3 теста' }],
  },
  {
    title: 'Опишите проект', text: nbsp('Соберите в CLAUDE.md архитектуру, правила и команды проверки — это память агента о вашем коде.'),
    pane: [{ kind: 'info', text: '# CLAUDE.md' }, { kind: 'command', text: '## Архитектура: src/cart — корзина' }, { kind: 'command', text: '## Проверки: npm run lint · npm test' }],
  },
  {
    title: 'Планируйте прежде кода', text: nbsp('Просите план, обсуждайте варианты и только потом разрешайте правки.'),
    pane: [{ kind: 'prompt', text: 'Сначала план, без правок' }, { kind: 'info', text: '1. модель  2. расчёт  3. тесты' }, { kind: 'prompt', text: 'Согласен, выполняй' }],
  },
  {
    title: nbsp('Проверяйте как ревьюер'), text: nbsp('Читайте diff, запускайте тесты, возвращайте с замечаниями. Код ваш — ответственность тоже.'),
    pane: [{ kind: 'del', text: '− const total = price * qty;' }, { kind: 'add', text: '+ const total = applyPromo(…);' }, { kind: 'prompt', text: 'Добавь случай с просроченным кодом' }],
  },
  {
    title: 'Автоматизируйте контроль', text: nbsp('Хуки и CI проверяют каждую правку агента без вашего участия.'),
    pane: [{ kind: 'info', text: 'PostToolUse → npm run lint' }, { kind: 'pass', text: '✓ lint   ✓ build   ✓ test' }],
  },
  {
    title: 'Масштабируйте себя', text: nbsp('Параллельные сессии и субагенты: вы ведёте несколько потоков работы одновременно.'),
    pane: [{ kind: 'info', text: 'feature/promo — пишет тесты' }, { kind: 'info', text: 'fix/checkout — правит баг' }, { kind: 'pass', text: 'test/cart — готово к ревью' }],
  },
];

const marks: Record<PaneLine['kind'], string> = { command: '$', prompt: '>', info: '●', del: '', add: '', pass: '' };
const number = (index: number) => String(index + 1).padStart(2, '0');

// Six habits. Wide screens with motion pin them into one scene (motion/path.ts): a counter, the
// current step and its terminal, with a rail to jump between steps. Otherwise: a vertical path.
export function PathScene() {
  return <div className="path-scene" data-step="0">
    <div className="path-sticky">
      <div className="path-counter" aria-hidden="true"><span className="path-digits">{steps.map((_, index) => <b key={index}>{number(index)}</b>)}</span><small>/ {number(steps.length - 1)}</small></div>
      <ol className="path-list">
        {steps.map((step, index) => <li className={`path-step reveal ${index === 0 ? 'is-active' : ''}`} key={step.title}>
          <span className="path-number">{number(index)}</span>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </li>)}
      </ol>
      <div className="path-panel" aria-hidden="true">
        <div className="path-panel-bar"><i /><i /><i /><span>~/projects/shop</span></div>
        {steps.map((step, index) => <ul className={`path-pane ${index === 0 ? 'is-active' : ''}`} key={step.title}>
          {step.pane.map(line => <li className={`pane-${line.kind}`} key={line.text}><span>{marks[line.kind]}</span>{line.text}</li>)}
        </ul>)}
      </div>
      <div className="path-rail">
        {steps.map((step, index) => <button type="button" key={step.title} aria-current={index === 0 ? 'step' : undefined}><span>{number(index)}</span><span className="visually-hidden">: {step.title}</span></button>)}
      </div>
    </div>
  </div>;
}
