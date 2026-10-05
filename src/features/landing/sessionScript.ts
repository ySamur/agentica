export type Line = { kind: 'command' | 'meta' | 'prompt' | 'info' | 'edit' | 'pass' | 'done'; text: string; typed?: boolean; diff?: string };

// A scripted, simulated session: nothing here talks to a real agent.
export const script: Line[] = [
  { kind: 'command', text: 'claude', typed: true },
  { kind: 'meta', text: 'Claude Code · симуляция сеанса' },
  { kind: 'prompt', text: 'Добавь промокоды в корзину: валидация, скидка, тесты. Сначала план.', typed: true },
  { kind: 'info', text: 'Изучаю проект: src/cart, 14 файлов' },
  { kind: 'info', text: 'План: модель промокода → расчёт скидки → тесты' },
  { kind: 'prompt', text: 'Согласен, выполняй.', typed: true },
  { kind: 'edit', text: 'src/cart/promo.ts', diff: '+48' },
  { kind: 'edit', text: 'src/cart/CartService.ts', diff: '+12 −3' },
  { kind: 'edit', text: 'tests/promo.spec.ts', diff: '+61' },
  { kind: 'pass', text: 'npm test — 23 теста пройдено' },
  { kind: 'done', text: 'Готово. Проверьте diff перед коммитом.' },
];

export const marks: Record<Line['kind'], string> = { command: '$', meta: '', prompt: '>', info: '●', edit: '✎', pass: '✓', done: '●' };

// What the agent is doing while line `step` is on screen.
export function statusOf(step: number) {
  if (step < 3) return 'ждёт задачу';
  if (step < 5) return 'изучает проект';
  if (step < 6) return 'ждёт согласования';
  if (step < 9) return 'правит файлы';
  if (step < 10) return 'запускает тесты';
  return 'готово к ревью';
}

// The chips beside the window appear once their line is reached.
export const chipSteps = { plan: 5, diff: 9, tests: 10 } as const;
