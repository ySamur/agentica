import { starterPrompts } from '../../src/features/starter/prompts.ts';
import type { LibrarySource } from './types.ts';

// Stage 1 «Первый контакт». The starter prompts are the landing's own (one source).
export const materials: LibrarySource[] = [
  {
    id: 'prompt-feature',
    stepId: 'install',
    kind: 'prompt',
    title: 'Запрос: новая функция',
    summary: 'Агент изучает проект, задаёт вопросы, согласует план и только потом пишет код с проверками.',
    body: starterPrompts.feature.text,
  },
  {
    id: 'prompt-bug',
    stepId: 'install',
    kind: 'prompt',
    title: 'Запрос: поиск ошибки',
    summary: 'Воспроизвести, найти первопричину, исправить минимально и закрепить тестом.',
    body: starterPrompts.bug.text,
  },
  {
    id: 'prompt-review',
    stepId: 'install',
    kind: 'prompt',
    title: 'Запрос: ревью кода',
    summary: 'Ревью без правок: конкретные сценарии сбоя вместо выдуманных замечаний.',
    body: starterPrompts.review.text,
  },
  {
    id: 'settings-permissions',
    stepId: 'permissions',
    kind: 'template',
    title: 'Правила разрешений проекта',
    summary: 'Проверки без вопросов, а пуш и чтение секретов — под запретом. Запрет всегда сильнее разрешения.',
    file: '.claude/settings.json',
    body: '{\n  "permissions": {\n    "allow": [\n      "Bash(npm run test *)",\n      "Bash(npm run lint)",\n      "Bash(git diff *)"\n    ],\n    "deny": [\n      "Bash(git push *)",\n      "Read(./.env)",\n      "Read(./secrets/**)"\n    ]\n  }\n}',
  },
];
