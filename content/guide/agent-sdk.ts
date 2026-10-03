import type { LessonSource } from './types.ts';

// 6.4 Агенты внутри ваших сервисов. Facts: code.claude.com/docs/en/headless (claude -p, --output-format
// json|stream-json with result, session_id, total_cost_usd; --allowedTools; --permission-mode;
// --continue / --resume) and /agent-sdk/overview, /agent-sdk/quickstart (@anthropic-ai/claude-agent-sdk,
// claude-agent-sdk for Python; query() with prompt and options; the same tools, hooks, subagents, MCP;
// you host it; an API key).
export const lesson: LessonSource = {
  stepId: 'agent-sdk',
  verified: '2026-10-03',
  minutes: 14,
  outcome: 'Вы встраиваете агента в свои скрипты и сервисы — через `claude -p` или Agent SDK — с ограниченными правами и разбором результата.',
  blocks: [
    { type: 'text', text: 'Всё, что Claude Code делает в терминале, можно вызвать из кода: разбор входящих ошибок, черновик ответа на тикет, ночной поиск устаревших зависимостей. Есть два пути: командная строка для скриптов и SDK для сервисов.' },
    { type: 'heading', text: 'Из скрипта: claude -p' },
    { type: 'command', code: 'claude -p "Разбери этот лог и назови причину" --output-format json --allowedTools "Read,Grep" < error.log', caption: 'Запрос без интерактива. JSON содержит `result`, `session_id` и `total_cost_usd` — удобно разбирать и считать расходы.' },
    {
      type: 'list',
      items: [
        '`--allowedTools` — какие инструменты разрешены без вопросов. В скрипте отвечать на вопросы некому.',
        '`--permission-mode` — общий режим, например `plan`, если агент должен только читать.',
        '`--output-format stream-json` — события по мере работы, для длинных задач.',
        '`--continue` или `--resume <id>` — продолжить прошлый разговор следующим вызовом.',
      ],
    },
    { type: 'heading', text: 'Из сервиса: Agent SDK' },
    { type: 'text', text: 'Agent SDK — библиотека с тем же движком, что у Claude Code: инструменты, хуки, субагенты, MCP. Пакеты: `@anthropic-ai/claude-agent-sdk` для TypeScript и `claude-agent-sdk` для Python. SDK работает на вашей инфраструктуре и с ключом API.' },
    {
      type: 'code',
      file: 'triage.ts',
      code: "import { query } from '@anthropic-ai/claude-agent-sdk';\n\nfor await (const message of query({\n  prompt: 'Найди причину падения в logs/today.log и предложи исправление',\n  options: {\n    allowedTools: ['Read', 'Grep', 'Glob'],\n    permissionMode: 'plan',\n  },\n})) {\n  if (message.type === 'result') console.log(message);\n}",
      caption: '`query()` возвращает поток сообщений: рассуждения, вызовы инструментов, итог. Здесь агент только читает — права заданы явно.',
    },
    {
      type: 'session',
      title: 'triage-service',
      summary: 'Симуляция работы сервиса: на новую ошибку из мониторинга сервис вызывает агента через SDK с правами только на чтение. Агент находит причину в коде и возвращает предложение исправления, которое сервис публикует в тикет.',
      lines: [
        { kind: 'meta', text: 'Мониторинг: новая ошибка TypeError в checkout' },
        { kind: 'command', text: 'query({ prompt: "Причина TypeError в checkout", permissionMode: "plan" })', typed: true },
        { kind: 'info', text: 'Читаю src/checkout/address.ts и последние коммиты' },
        { kind: 'info', text: 'Причина: address.zip может быть null после миграции' },
        { kind: 'done', text: 'Предложение исправления опубликовано в тикет SHOP-311.' },
      ],
    },
    { type: 'callout', tone: 'trap', title: 'В сервисе агент работает без человека', text: 'Здесь никто не откажет правке и не нажмёт Esc. Начинайте с режима только для чтения и явного списка инструментов, а правки пусть проходят через PR и ревью (шаг 5.4).' },
    { type: 'callout', tone: 'tip', title: 'Считайте деньги с первого дня', text: 'В ответе есть `total_cost_usd`. Записывайте его для каждого вызова — так вы сразу увидите, какие сценарии окупаются (шаг 6.5).' },
  ],
  practice: {
    task: 'Напишите небольшой скрипт с `claude -p`, который делает полезную рутину вашего проекта: разбирает лог, ищет TODO без задачи, проверяет устаревшие зависимости. Ограничьте инструменты чтением, получите результат в JSON и выведите стоимость.',
    done: [
      'скрипт работает без интерактива;',
      'агенту разрешено только чтение;',
      'скрипт выводит результат и `total_cost_usd`.',
    ],
  },
  check: {
    questions: [
      {
        id: 'script-or-sdk',
        prompt: 'Нужно встроить разбор ошибок в долгоживущий сервис с собственной логикой и обработкой событий. Что выбрать?',
        options: [
          { id: 'sdk', text: 'Agent SDK: `query()` прямо в коде сервиса.', correct: true, why: 'Да. SDK даёт поток сообщений и полный контроль из кода.' },
          { id: 'cli', text: 'Вызывать интерактивный `claude` через терминал.', why: 'Интерактивная сессия ждёт человека — сервису она не подходит.' },
          { id: 'manual', text: 'Копировать ошибки в чат вручную.', why: 'Так не масштабируется — для этого и нужна интеграция.' },
        ],
      },
      {
        id: 'unattended',
        prompt: 'Агент в сервисе должен только находить причины ошибок. Как это обеспечить?',
        multiple: true,
        options: [
          { id: 'tools', text: 'Разрешить только `Read`, `Grep`, `Glob`.', correct: true, why: 'Да. Явный список инструментов — главная граница.' },
          { id: 'plan-mode', text: 'Режим `plan`.', correct: true, why: 'Да. В нём агент читает и рассуждает, но не правит.' },
          { id: 'trust', text: 'Написать в запросе «ничего не меняй».', why: 'Это совет, а не граница. Права задаются в настройках вызова.' },
          { id: 'bypass', text: '`bypassPermissions`, чтобы не застрял на вопросах.', why: 'Это снимает все ограничения — ровно наоборот.' },
        ],
      },
      {
        id: 'json-output',
        prompt: 'Зачем в скрипте `--output-format json`?',
        options: [
          { id: 'parse', text: 'Чтобы разобрать результат кодом и получить `session_id` и стоимость.', correct: true, why: 'Да. Текст удобен человеку, а JSON — программе.' },
          { id: 'faster', text: 'Так агент работает быстрее.', why: 'Формат вывода не меняет скорость работы.' },
          { id: 'safer', text: 'Так безопаснее.', why: 'Безопасность задают права и инструменты, а не формат.' },
        ],
      },
    ],
  },
};
