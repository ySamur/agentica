// The route's map: public, so it ships with the app (bodies are members-only, in `guide_steps`).
// Step ids are the progress keys in `guide_progress`: stable and unique across stages, so steps
// can be reordered or moved to another stage without losing anyone's progress.
// No imports: `tests/security.test.mjs` loads this file in Node to match the seeded ids.

// `minutes`: the lesson's reading time, as in `content/guide/<id>.ts` (a test keeps them equal).
export type GuideStep = { id: string; title: string; minutes: number };
export type GuideStage = { id: string; number: string; title: string; promise: string; steps: readonly GuideStep[] };
export type PlacedStep = GuideStep & { stage: GuideStage; order: number; label: string; code: string; path: string };

// Stages 1–6 keep the landing's six steps (`PathScene`) as their promise.
export const stages: readonly GuideStage[] = [
  { id: 'first-contact', number: '1', title: 'Первый контакт', promise: 'Начните с малого', steps: [
    { id: 'install', title: 'Установка и первый запуск', minutes: 13 },
    { id: 'permissions', title: 'Разрешения и границы доступа', minutes: 17 },
    { id: 'explore-code', title: 'Агент как исследователь кода', minutes: 15 },
    { id: 'first-edit', title: 'Первая правка под контролем', minutes: 17 },
    { id: 'checkpoints', title: 'Чекпоинты и откат', minutes: 13 },
  ] },
  { id: 'context', number: '2', title: 'Контекст', promise: 'Опишите проект', steps: [
    { id: 'project-view', title: 'Как агент видит проект', minutes: 15 },
    { id: 'claude-md', title: 'CLAUDE.md: память проекта', minutes: 17 },
    { id: 'conventions', title: 'Правила, соглашения, команды проверки', minutes: 15 },
    { id: 'clean-context', title: 'Как держать контекст чистым в длинной сессии', minutes: 15 },
  ] },
  { id: 'tasks', number: '3', title: 'Постановка задач', promise: 'Планируйте прежде кода', steps: [
    { id: 'task-anatomy', title: 'Анатомия задачи: цель, границы, критерий готовности', minutes: 15 },
    { id: 'plan-first', title: 'План до кода', minutes: 16 },
    { id: 'decomposition', title: 'Декомпозиция на проверяемые шаги', minutes: 17 },
    { id: 'iterations', title: 'Итерации и корректировка курса', minutes: 15 },
  ] },
  { id: 'review', number: '4', title: 'Ревью', promise: 'Проверяйте как ревьюер', steps: [
    { id: 'read-diff', title: 'Чтение diff, написанного не вами', minutes: 17 },
    { id: 'agent-mistakes', title: 'Типичные ошибки агентов', minutes: 15 },
    { id: 'tests-contract', title: 'Тесты как контракт', minutes: 16 },
    { id: 'security-deps', title: 'Безопасность и зависимости', minutes: 16 },
    { id: 'delegation-limit', title: 'Граница делегирования: когда писать руками', minutes: 14 },
  ] },
  { id: 'automation', number: '5', title: 'Автоматизация', promise: 'Автоматизируйте контроль', steps: [
    { id: 'hooks', title: 'Хуки', minutes: 17 },
    { id: 'commands-skills', title: 'Свои команды и skills', minutes: 16 },
    { id: 'mcp', title: 'MCP: внешние сервисы и инструменты', minutes: 16 },
    { id: 'git-flow', title: 'Git-процесс с агентом', minutes: 15 },
    { id: 'agent-ci', title: 'Агент в CI', minutes: 16 },
  ] },
  { id: 'orchestration', number: '6', title: 'Оркестровка', promise: 'Масштабируйте себя', steps: [
    { id: 'subagents', title: 'Субагенты', minutes: 16 },
    { id: 'worktrees', title: 'Параллельные сессии и worktrees', minutes: 15 },
    { id: 'agent-roles', title: 'Роли агентов: исследователь, исполнитель, ревьюер', minutes: 15 },
    { id: 'agent-sdk', title: 'Агенты внутри ваших сервисов (headless, Agent SDK)', minutes: 17 },
    { id: 'economics', title: 'Экономика: модели, лимиты, стоимость', minutes: 15 },
  ] },
  { id: 'capstone', number: '★', title: 'Выпускной проект', promise: 'Всё вместе, на реальной задаче', steps: [
    { id: 'idea-to-pr', title: 'От идеи до PR силами агентов', minutes: 15 },
    { id: 'before-after', title: 'Ваше личное «Было / Стало»', minutes: 12 },
    { id: 'public-profile', title: 'Ваша система работы с агентами', minutes: 12 },
  ] },
];

// A stage's reading time: its lessons' minutes together.
export const stageMinutes = (stage: GuideStage) => stage.steps.reduce((sum, step) => sum + step.minutes, 0);

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
