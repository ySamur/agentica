import type { LessonSource } from './types.ts';

// 5.1 Хуки. Facts: code.claude.com/docs/en/hooks-guide (events; settings shape: event → matcher →
// hooks of type "command"; JSON on stdin with tool_name and tool_input; exit 2 blocks and sends stderr
// to Claude; /hooks; user, project and local settings; hooks run with your permissions). The shape
// and script match this project's own working PostToolUse hook (.claude/settings.json).
export const lesson: LessonSource = {
  stepId: 'hooks',
  verified: '2026-10-07',
  claudeCode: '2.1.292',
  minutes: 17,
  outcome: 'Вы превращаете правила, которые агент обязан соблюдать, в хуки — команды, которые Claude Code сам запускает в нужный момент.',
  blocks: [
    { type: 'scene', text: 'В CLAUDE.md написано: «после правки запускай `npm run typecheck`». Первые полчаса агент так и делает. На третьем часу, в разгар рефакторинга, проверка выпадает из его ходов — и в PR уезжают четыре ошибки типов. Правило он не нарушал нарочно: в длинной сессии оно просто потерялось.' },
    { type: 'text', text: 'CLAUDE.md — совет, и агент может от него отступить (шаг 2.3). Хук — команда, которую Claude Code запускает сам на определённом событии: перед действием агента, после него, в конце хода. Хук выполнится всегда, что бы агент ни решил.' },
    { type: 'bridge', text: 'Вы ставили pre-commit хук или обязательную проверку в CI: правило, которое не зависит от памяти и настроения разработчика. Хук Claude Code — то же самое, только срабатывает на действиях агента.' },
    { type: 'why', text: 'CLAUDE.md попадает в окно как текст, и агент взвешивает его вместе со всем остальным. Хук работает вне модели: его запускает сам Claude Code на событии, а результат приходит агенту как факт — «правка заблокирована» или «вот ошибки типов». Поэтому хук нельзя забыть или «перевесить».' },
    { type: 'diagram', name: 'hook-events', caption: 'Хуки срабатывают на событиях сессии. Самые полезные — до и после каждого инструмента и в конце хода.' },
    { type: 'heading', text: 'Хук в настройках' },
    {
      type: 'code',
      file: '.claude/settings.json',
      code: '{\n  "hooks": {\n    "PostToolUse": [\n      {\n        "matcher": "Edit|Write",\n        "hooks": [\n          {\n            "type": "command",\n            "command": "node \\"$CLAUDE_PROJECT_DIR/.claude/hooks/typecheck.mjs\\""\n          }\n        ]\n      }\n    ]\n  }\n}',
      caption: 'После каждой правки файла Claude Code запустит проверку типов. `matcher` выбирает инструменты, на которые реагирует хук.',
    },
    { type: 'heading', text: 'Как хук говорит «нет»' },
    {
      type: 'list',
      items: [
        'Хук получает на вход JSON с описанием события: какой инструмент и с какими параметрами.',
        '**Код выхода 0** — всё в порядке, работа идёт дальше.',
        '**Код выхода 2** — действие блокируется, а текст из stderr уходит агенту: он видит причину и исправляется сам.',
      ],
    },
    {
      type: 'code',
      file: '.claude/hooks/typecheck.mjs',
      code: "import { spawnSync } from 'node:child_process';\n\nlet input = '';\nfor await (const chunk of process.stdin) input += chunk;\nconst { file_path } = JSON.parse(input).tool_input;\nif (!/\\.tsx?$/.test(file_path)) process.exit(0);\n\nconst { status, stdout } = spawnSync('npx tsc --noEmit', { shell: true, encoding: 'utf8' });\nif (status !== 0) {\n  process.stderr.write(`Ошибки типов после правки ${file_path}:\\n${stdout}`);\n  process.exit(2);\n}",
      caption: 'Почти такой же хук работает в проекте, где пишется этот курс: агент не может оставить правку с ошибками типов.',
    },
    {
      type: 'session',
      title: '~/projects/shop',
      summary: 'Симуляция сеанса: агент добавляет поле в тип заказа. Хук после правки запускает проверку типов и возвращает агенту две ошибки в другом файле. Агент сам исправляет использования, и следующая проверка проходит.',
      lines: [
        { kind: 'prompt', text: 'Добавь поле discount в тип Order.', typed: true },
        { kind: 'edit', text: 'src/types/order.ts', diff: '+1' },
        { kind: 'meta', text: 'PostToolUse → typecheck: 2 ошибки в cart.ts' },
        { kind: 'info', text: 'Хук вернул ошибки: поле нужно и в createOrder()' },
        { kind: 'edit', text: 'src/cart/cart.ts', diff: '+2' },
        { kind: 'meta', text: 'PostToolUse → typecheck: ошибок нет' },
        { kind: 'done', text: 'Готово: тип и все его использования согласованы.' },
      ],
    },
    { type: 'heading', text: 'Что поручить хукам' },
    {
      type: 'list',
      items: [
        '**PostToolUse**: форматтер, линтер или проверка типов после правки.',
        '**PreToolUse**: запрет правки миграций, сгенерированных файлов, продакшен-конфигов.',
        '**Stop**: не дать агенту закончить ход, пока не прошли тесты.',
        '**SessionStart**: подгрузить в контекст свежие сведения, например задачи из трекера.',
      ],
    },
    { type: 'text', text: 'Посмотреть настроенные хуки можно командой `/hooks`. Хуки живут в тех же файлах настроек, что и правила доступа: личных, проектных и локальных.' },
    {
      type: 'spot',
      title: 'Хуки от коллеги · .claude/settings.json',
      prompt: 'Коллега прислал набор хуков для проекта. Какой вы не добавите, не разобравшись?',
      items: [
        { id: 'format', text: '`PostToolUse` на `Edit|Write`: запустить форматтер для изменённого файла.' },
        { id: 'migrations', text: '`PreToolUse` на `Edit`: запретить правку файлов в `db/migrations/`.' },
        { id: 'stats', text: '`UserPromptSubmit`: отправлять каждый ваш запрос на сервер статистики `stats.example.dev`.' },
        { id: 'tests', text: '`Stop`: прогнать `npm run test:unit` и вернуть агента к работе, если тесты упали.' },
      ],
      answer: 'stats',
      reveal: 'Хук выполняется с вашими правами, а этот отправляет каждый ваш запрос — с фрагментами кода и всем, что вы туда вставили, — на чужой сервер. Остальные три работают на вашей машине и делают понятную работу: форматируют, запрещают, проверяют.',
    },
    { type: 'callout', tone: 'trap', title: 'Хук — это код с вашими правами', text: 'Хук выполняет любую команду от вашего имени. Не копируйте чужие хуки не читая и проверяйте изменения в `.claude/settings.json` на ревью так же внимательно, как код.' },
    { type: 'callout', tone: 'tip', title: 'Совет и закон вместе', text: 'Правило в CLAUDE.md объясняет, почему. Хук гарантирует, что. Лучше всего вместе: агент понимает смысл, а хук страхует, когда он забудет.' },
    {
      type: 'sources',
      links: [
        { title: 'Хуки: пошаговое руководство', url: 'https://code.claude.com/docs/en/hooks-guide' },
        { title: 'Хуки: события, входные данные и коды выхода', url: 'https://code.claude.com/docs/en/hooks' },
      ],
    },
  ],
  practice: {
    task: 'Выберите правило, которое агент у вас нарушал: форматирование, запрет правки какого-то файла, обязательные тесты. Сделайте из него хук в `.claude/settings.json` проекта и проверьте, что он срабатывает.',
    done: [
      'хук описан в `.claude/settings.json` и закоммичен;',
      'вы видели, как хук остановил агента или вернул ему ошибку;',
      'агент исправился сам, по тексту из хука.',
    ],
  },
  check: {
    questions: [
      {
        id: 'always-format',
        prompt: 'Агент иногда забывает запустить форматтер после правки. Как сделать, чтобы это происходило всегда?',
        options: [
          { id: 'post-hook', text: 'Хук `PostToolUse` на `Edit|Write`, который запускает форматтер.', correct: true, why: 'Да. Хук выполняется после каждой правки, что бы агент ни решил.' },
          { id: 'claude-md', text: 'Строка в CLAUDE.md: «всегда запускай форматтер».', why: 'Это совет: агент может забыть, особенно в длинной сессии.' },
          { id: 'remind', text: 'Напоминать в каждом запросе запускать форматтер после правки.', why: 'Утомительно и ненадёжно. Хук делает это сам.' },
        ],
      },
      {
        id: 'exit-code',
        prompt: 'Ваш хук `PreToolUse` нашёл запрещённую правку. Как остановить агента и объяснить ему причину?',
        options: [
          { id: 'exit-2', text: 'Выйти с кодом 2 и написать причину в stderr.', correct: true, why: 'Да. Действие блокируется, а текст причины получает агент.' },
          { id: 'exit-0', text: 'Выйти с кодом 0 и написать причину в stdout.', why: 'Код 0 значит «всё в порядке»: действие выполнится.' },
          { id: 'exit-1', text: 'Завершиться с кодом 1 без сообщения: агент сам поймёт.', why: 'Код 1 не блокирует действие: правка выполнится, а агент не узнает причину.' },
        ],
      },
      {
        id: 'which-event',
        prompt: 'Нужно, чтобы агент не мог закончить ход, пока не пройдут тесты. На какое событие повесить хук?',
        options: [
          { id: 'stop', text: '`Stop`', correct: true, why: 'Да. Хук на `Stop` срабатывает, когда агент хочет закончить, и может вернуть его к работе.' },
          { id: 'session-start', text: '`SessionStart`', why: 'Это начало сессии — проверять там ещё нечего.' },
          { id: 'prompt-submit', text: '`UserPromptSubmit`', why: 'Это момент, когда вы отправляете запрос, а не когда агент заканчивает.' },
        ],
      },
    ],
  },
};
