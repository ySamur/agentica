import type { LessonSource } from './types.ts';

// 1.2 Разрешения и границы доступа. Facts: code.claude.com/docs/en/permission-modes (auto as the
// starting mode since v2.1.283, falling back to Manual, the UI name of `default`; the Shift+Tab cycle;
// bypassPermissions only in containers or VMs) and /permissions (what asks, prompt answers: "don't
// ask again" lasts per repository for commands and domains, in .claude/settings.local.json, and until
// the session ends for file edits; rule syntax, deny → ask → allow, settings files, /permissions,
// /add-dir).
export const lesson: LessonSource = {
  stepId: 'permissions',
  verified: '2026-10-07',
  claudeCode: '2.1.292',
  minutes: 17,
  outcome: 'Вы знаете, что агент делает сам, а что — с вашего согласия, выбираете режим под задачу и закрепляете границы проекта в настройках.',
  blocks: [
    { type: 'scene', text: 'Агент чинил падающий тест и закончил, как ему казалось, по всем правилам: тесты зелёные, ветка запушена в main. Пушить никто не просил. Но в настройках стояло `Bash(git *)` в `allow`, и спрашивать было не о чем.' },
    { type: 'text', text: 'Агент в вашем терминале может то же, что и вы: удалить файл, запушить ветку, прочитать `.env`. Поэтому Claude Code делит действия на те, что выполняет сам, и те, что — только с вашего согласия. Полагаться на умолчания не стоит: границы проекта лучше задать явно.' },
    { type: 'bridge', text: 'Вы уже раздавали права: доступ к продакшен-базе — только на чтение, деплой — через ревью, ключи — в секретах. Правила `allow` и `deny` — тот же принцип наименьших привилегий, только для агента.' },
    { type: 'why', text: 'Модель ничего не запрещает себе сама: она выбирает следующее действие по контексту, и иногда это `git push`. Правила разрешений проверяет Claude Code до того, как действие выполнится. Поэтому `deny` срабатывает, даже когда агент уверен, что пуш уместен.' },
    { type: 'heading', text: 'Режимы' },
    { type: 'text', text: 'Режим задаёт общий уровень свободы. Свежие версии Claude Code начинают сессию в режиме **auto**: обычную работу агент делает без вопросов, а отдельный классификатор останавливает рискованное. Если auto недоступен — например, его отключила организация, — сессия начинается в ручном режиме: в интерфейсе он называется **Manual**, а в настройках и флаге `--permission-mode` — `default`.' },
    { type: 'diagram', name: 'permission-modes', caption: '**Shift+Tab** переключает режимы по кругу: из auto в Manual (`default`), затем acceptEdits и plan. `bypassPermissions` попадает в этот круг, только если сессию с ним запустили.' },
    { type: 'heading', text: 'О чём спрашивает ручной режим' },
    {
      type: 'list',
      items: [
        '**Без вопросов**: чтение и поиск по проекту, безопасные команды вроде `ls`, `cat`, `grep`, `git status`.',
        '**С вопросом**: правка файлов, остальные команды терминала, запросы в интернет.',
        '**В ответ** можно разрешить один раз, разрешить и больше не спрашивать или отказать и сказать, что сделать иначе. «Больше не спрашивать» для команды терминала или домена действует в этом проекте и в следующих сессиях, а для правок файлов — только до конца сессии.',
      ],
    },
    { type: 'callout', tone: 'trap', title: 'bypassPermissions — только в песочнице', text: 'В этом режиме (`--dangerously-skip-permissions`) агент не спрашивает ничего. Он предназначен только для изолированной среды — контейнера или виртуальной машины. На рабочей машине с доступом к продакшену — никогда.' },
    { type: 'heading', text: 'Правила проекта' },
    { type: 'text', text: 'Режим — грубая настройка. Точная — правила в `.claude/settings.json`: что разрешено всегда, а что запрещено всегда. Файл коммитят, и правила получает вся команда.' },
    {
      type: 'code',
      file: '.claude/settings.json',
      code: '{\n  "permissions": {\n    "allow": [\n      "Bash(npm run test *)",\n      "Bash(npm run lint)",\n      "Bash(git diff *)"\n    ],\n    "deny": [\n      "Bash(git push *)",\n      "Read(./.env)",\n      "Read(./secrets/**)"\n    ]\n  }\n}',
      caption: 'Запрет сильнее разрешения: сначала проверяется `deny`, потом правила с вопросом, потом `allow`. Ваши ответы «больше не спрашивать» сохраняются отдельно, в `.claude/settings.local.json`.',
    },
    { type: 'text', text: 'Посмотреть и поправить действующие правила можно командой `/permissions`. Нужна соседняя папка — добавьте её на время сессии: `/add-dir ../shared`.' },
    {
      type: 'session',
      title: '~/projects/shop',
      summary: 'Симуляция сеанса в ручном режиме: агент чинит падающий тест. Правку файла он согласует с разработчиком, тесты запускает без вопросов по правилу allow, а попытку пуша блокирует правило deny — пуш агент оставляет разработчику.',
      lines: [
        { kind: 'command', text: 'claude --permission-mode default', typed: true },
        { kind: 'prompt', text: 'Почини падающий тест в cart.spec.ts', typed: true },
        { kind: 'info', text: 'Читаю tests/cart.spec.ts и src/cart/total.ts' },
        { kind: 'meta', text: 'Правка src/cart/total.ts — разрешено вами' },
        { kind: 'edit', text: 'src/cart/total.ts', diff: '+3 −1' },
        { kind: 'pass', text: 'npm run test cart — по правилу allow, без вопроса' },
        { kind: 'info', text: 'Следующий шаг: git push origin fix/cart' },
        { kind: 'meta', text: 'Заблокировано правилом deny: Bash(git push *)' },
        { kind: 'done', text: 'Тест проходит. Пуш оставляю вам.' },
      ],
    },
    {
      type: 'spot',
      title: '.claude/settings.json · allow',
      prompt: 'Коллега собрал разрешения для проекта. Какое правило не должно стоять в `allow`?',
      items: [
        { id: 'tests', text: '`Bash(npm run test *)` — запуск тестов.' },
        { id: 'lint', text: '`Bash(npm run lint)` — линтер.' },
        { id: 'push', text: '`Bash(git push *)` — пуш веток.' },
        { id: 'diff', text: '`Bash(git diff *)` — просмотр изменений.' },
      ],
      answer: 'push',
      reveal: 'Пуш публикует изменения за пределы вашей машины, и это решение человека. Правилу место в `deny`: тогда агент оставит пуш вам, даже если очень уверен.',
    },
    {
      type: 'sources',
      links: [
        { title: 'Режимы разрешений и переключение по Shift+Tab', url: 'https://code.claude.com/docs/en/permission-modes' },
        { title: 'Правила allow, ask и deny и файлы настроек', url: 'https://code.claude.com/docs/en/permissions' },
      ],
    },
  ],
  practice: {
    task: 'Вспомните команды, которые вы чаще всего разрешаете агенту, и вынесите их в `.claude/settings.json` проекта. Запретите то, что агент не должен делать никогда: пуш, чтение секретов, удаление миграций.',
    done: [
      'в `.claude/settings.json` есть списки `allow` и `deny`;',
      '`/permissions` показывает ваши правила;',
      'в ручном режиме агент запускает тесты без вопросов, а попытка пуша блокируется.',
    ],
  },
  check: {
    questions: [
      {
        id: 'deny-wins',
        prompt: 'В `allow` есть `Bash(git *)`, в `deny` — `Bash(git push *)`. Агент хочет выполнить `git push`. Что произойдёт?',
        options: [
          { id: 'blocked', text: 'Не выполнится: подходящий `deny` проверяется первым и сильнее `allow`.', correct: true, why: 'Да. Запреты проверяются первыми: подходящее правило `deny` сильнее любого `allow`.' },
          { id: 'allowed', text: 'Выполнится: `allow` на весь git шире и перекрывает частный запрет на пуш.', why: 'Ширина правила не важна: сначала проверяется `deny`, и он срабатывает.' },
          { id: 'asks', text: 'Агент спросит вас: правила противоречат друг другу, решать вам.', why: 'Спрашивают о командах, которые не попали ни под одно правило. Эту останавливает `deny`.' },
        ],
      },
      {
        id: 'auto-start',
        prompt: 'Вы запустили свежий Claude Code без настроек, и агент сразу правит файлы, ни о чём не спрашивая. Почему?',
        options: [
          { id: 'auto', text: 'Свежие версии стартуют в auto: рутина идёт без вопросов, рискованное ловит классификатор.', correct: true, why: 'Да. В свежих версиях auto — стартовый режим. Нужно больше контроля — Shift+Tab переключит на Manual, а постоянные границы задают правила.' },
          { id: 'bypass', text: 'Включился bypassPermissions: без файла настроек Claude Code ничего не ограничивает.', why: 'Этот режим сам не включается: только флагом при запуске или настройкой. И в обычный круг Shift+Tab он не входит.' },
          { id: 'broken', text: 'Сломалась установка: в ручном режиме агент обязан спрашивать о каждой правке.', why: 'Так ведёт себя ручной режим Manual (`default`). Свежие версии стартуют в auto, если он доступен.' },
        ],
      },
      {
        id: 'unknown-service',
        prompt: 'Вы впервые разбираетесь в чужом сервисе и хотите, чтобы агент ничего не менял. Какой режим выбрать?',
        options: [
          { id: 'plan', text: '`plan`', correct: true, why: 'Да. В plan агент читает, ищет и запускает безопасные команды, но не правит исходники.' },
          { id: 'accept-edits', text: '`acceptEdits`', why: 'Наоборот: в нём агент правит файлы без вопросов.' },
          { id: 'bypass', text: '`bypassPermissions`', why: 'Это режим без вопросов вообще — только для изолированной песочницы и уж точно не для знакомства с чужим кодом.' },
        ],
      },
      {
        id: 'deny-list',
        prompt: 'Что стоит записать в `deny` проекта?',
        multiple: true,
        options: [
          { id: 'env', text: '`Read(./.env)` — чтение секретов.', correct: true, why: 'Да. Агенту не нужны боевые ключи, чтобы писать код.' },
          { id: 'push', text: '`Bash(git push *)` — пуш без вашего ведома.', correct: true, why: 'Да. Публиковать изменения — ваше решение.' },
          { id: 'tests', text: '`Bash(npm run test *)` — запуск тестов.', why: 'Тесты — лучший способ для агента проверить себя. Их как раз разрешают в `allow`.' },
          { id: 'sources', text: '`Read(./src/**)` — чтение исходников.', why: 'Без чтения кода агент бесполезен. Чтение проекта безопасно и по умолчанию идёт без вопросов.' },
        ],
      },
    ],
  },
};
