import type { LibrarySource } from './types.ts';

// Stage 6 «Оркестровка» and the capstone. Formats match the lessons (subagents, agent-sdk, idea-to-pr,
// before-after).
export const materials: LibrarySource[] = [
  {
    id: 'reviewer-agent',
    stepId: 'subagents',
    kind: 'template',
    title: 'Субагент-ревьюер',
    summary: 'Свежий взгляд на diff в своём окне, только с правом чтения.',
    file: '.claude/agents/reviewer.md',
    body: '---\nname: reviewer\ndescription: Свежим взглядом проверяет diff перед коммитом. Используй после крупных правок.\ntools: Read, Glob, Grep\nmodel: sonnet\n---\n\nТы ревьюер. Прочитай изменения и найди ошибки корректности,\nослабленные тесты и нарушения требований задачи.\nОтмечай только то, что ломает поведение. Стиль не трогай.',
  },
  {
    id: 'headless-script',
    stepId: 'agent-sdk',
    kind: 'template',
    title: 'Скрипт с `claude -p`',
    summary: 'Агент без интерактива, только с чтением; результат и стоимость — из JSON.',
    file: 'scripts/triage.sh',
    body: '#!/usr/bin/env bash\n# Разбор лога агентом: только чтение, результат и стоимость из JSON.\nset -euo pipefail\n\nclaude -p "Разбери этот лог и назови причину ошибки" \\\n  --output-format json \\\n  --allowedTools "Read,Grep,Glob" \\\n  < "${1:-logs/today.log}" \\\n  | jq -r \'.result, "Стоимость: \\(.total_cost_usd) $"\'',
  },
  {
    id: 'capstone-notes',
    stepId: 'idea-to-pr',
    kind: 'template',
    title: 'Заметки выпускной задачи',
    summary: 'Ход работы по всему маршруту и где вы вмешались — материал для «Было / Стало».',
    file: 'docs/capstone.md',
    body: '# Выпускная задача\n\nЗадача:\nКритерий готовности:\n\n## Ход работы\n- [ ] исследование (субагент)\n- [ ] план согласован\n- [ ] шаги с проверками\n- [ ] ревью в чистом контексте\n- [ ] PR и зелёный CI\n\n## Где я вмешался\n- \n\n## Что агент сделал без меня\n- ',
  },
  {
    id: 'before-after-template',
    stepId: 'before-after',
    kind: 'template',
    title: 'Было / Стало',
    summary: 'Сравнение на фактах: время, ручные правки, ошибки до слияния, граница делегирования.',
    file: 'docs/before-after.md',
    body: '# Было / Стало\n\n| | Было | Стало |\n|---|---|---|\n| Задача | | |\n| Время до PR | | |\n| Правок руками | | |\n| Ошибки до слияния | | |\n\n## Что отдаю агенту целиком\n- \n\n## Что оставляю себе и почему\n- ',
  },
];
