// The route's map: public, so it ships with the app (bodies are members-only, in `guide_steps`).
// Step ids are the progress keys in `guide_progress`: stable and unique across stages, so steps
// can be reordered or moved to another stage without losing anyone's progress.
// No imports: `tests/security.test.mjs` loads this file in Node to match the seeded ids.

export type GuideStep = { id: string; title: string };
export type GuideStage = { id: string; number: string; title: string; promise: string; steps: readonly GuideStep[] };
export type PlacedStep = GuideStep & { stage: GuideStage; order: number; label: string; code: string; path: string };

// Stages 1–6 keep the landing's six steps (`PathScene`) as their promise.
export const stages: readonly GuideStage[] = [
  { id: 'first-contact', number: '1', title: 'Первый контакт', promise: 'Начните с малого', steps: [
    { id: 'install', title: 'Установка и первый запуск' },
    { id: 'permissions', title: 'Разрешения и границы доступа' },
    { id: 'explore-code', title: 'Агент как исследователь кода' },
    { id: 'first-edit', title: 'Первая правка под контролем' },
    { id: 'checkpoints', title: 'Чекпоинты и откат' },
  ] },
  { id: 'context', number: '2', title: 'Контекст', promise: 'Опишите проект', steps: [
    { id: 'project-view', title: 'Как агент видит проект' },
    { id: 'claude-md', title: 'CLAUDE.md: память проекта' },
    { id: 'conventions', title: 'Правила, соглашения, команды проверки' },
    { id: 'clean-context', title: 'Как держать контекст чистым в длинной сессии' },
  ] },
  { id: 'tasks', number: '3', title: 'Постановка задач', promise: 'Планируйте прежде кода', steps: [
    { id: 'task-anatomy', title: 'Анатомия задачи: цель, границы, критерий готовности' },
    { id: 'plan-first', title: 'План до кода' },
    { id: 'decomposition', title: 'Декомпозиция на проверяемые шаги' },
    { id: 'iterations', title: 'Итерации и корректировка курса' },
  ] },
  { id: 'review', number: '4', title: 'Ревью', promise: 'Проверяйте как ревьюер', steps: [
    { id: 'read-diff', title: 'Чтение diff, написанного не вами' },
    { id: 'agent-mistakes', title: 'Типичные ошибки агентов' },
    { id: 'tests-contract', title: 'Тесты как контракт' },
    { id: 'security-deps', title: 'Безопасность и зависимости' },
    { id: 'delegation-limit', title: 'Граница делегирования: когда писать руками' },
  ] },
  { id: 'automation', number: '5', title: 'Автоматизация', promise: 'Автоматизируйте контроль', steps: [
    { id: 'hooks', title: 'Хуки' },
    { id: 'commands-skills', title: 'Свои команды и skills' },
    { id: 'mcp', title: 'MCP: внешние сервисы и инструменты' },
    { id: 'git-flow', title: 'Git-процесс с агентом' },
    { id: 'agent-ci', title: 'Агент в CI' },
  ] },
  { id: 'orchestration', number: '6', title: 'Оркестровка', promise: 'Масштабируйте себя', steps: [
    { id: 'subagents', title: 'Субагенты' },
    { id: 'worktrees', title: 'Параллельные сессии и worktrees' },
    { id: 'agent-roles', title: 'Роли агентов: исследователь, исполнитель, ревьюер' },
    { id: 'agent-sdk', title: 'Агенты внутри ваших сервисов (headless, Agent SDK)' },
    { id: 'economics', title: 'Экономика: модели, лимиты, стоимость' },
  ] },
  { id: 'capstone', number: '★', title: 'Выпускной проект', promise: 'Всё вместе, на реальной задаче', steps: [
    { id: 'idea-to-pr', title: 'От идеи до PR силами агентов' },
    { id: 'before-after', title: 'Ваше личное «Было / Стало»' },
    { id: 'public-profile', title: 'Ваша система работы с агентами' },
  ] },
];

// `03` for display in mono; the capstone keeps its star.
export const stageCode = (stage: GuideStage) => /^\d+$/.test(stage.number) ? stage.number.padStart(2, '0') : stage.number;

// Every step in the recommended order, with its label (`3.2`), mono code (`03.2`) and address.
export const steps: readonly PlacedStep[] = stages.flatMap(stage => stage.steps.map((step, index) => ({
  ...step,
  stage,
  order: 0,
  label: `${stage.number}.${index + 1}`,
  code: `${stageCode(stage)}.${index + 1}`,
  path: `/path/${stage.id}/${step.id}`,
}))).map((step, order) => ({ ...step, order }));

const byId = new Map(steps.map(step => [step.id, step]));

export function findStep(id: string | undefined) {
  return id ? byId.get(id) : undefined;
}

// The step a `/path/<stage>/<step>` address names, even if the step has since moved to another stage.
export function stepAtPath(pathname: string) {
  const match = /^\/path\/[a-z0-9-]+\/([a-z0-9-]+)$/.exec(pathname);
  return match ? findStep(match[1]) : undefined;
}
