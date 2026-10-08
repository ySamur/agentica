import type { LessonSource } from './types.ts';

// 5.5 Агент в CI. Facts: code.claude.com/docs/en/github-actions (/install-github-app needs the gh CLI
// and works only with github.com repositories; workflow with anthropics/claude-code-action@v1 and the
// ANTHROPIC_API_KEY secret; @claude mentions without `prompt`, automation with `prompt`; the
// mention example's permissions, actions: read for CI results), /headless (claude -p, --output-format json, --allowedTools, --max-turns; --bare is
// recommended for CI and scripts, skips auto-discovery of hooks, skills, plugins, MCP servers, auto
// memory and CLAUDE.md, never reads OAuth, takes ANTHROPIC_API_KEY, and will become the default for
// -p) and /gitlab-ci-cd (a GitLab example exists).
export const lesson: LessonSource = {
  stepId: 'agent-ci',
  verified: '2026-10-07',
  claudeCode: '2.1.292',
  minutes: 16,
  outcome: 'Вы запускаете агента в CI — ответы на `@claude`, автоматическое ревью, безголовые прогоны `claude -p` — с секретами и правами под контролем.',
  blocks: [
    { type: 'scene', text: 'Кто-то написал в PR: «@claude поправь опечатку в README». Агент в CI поправил опечатку — и заодно обновил версию Node в конфиге деплоя: workflow давал ему все инструменты и запись в репозиторий. Esc никто не нажал — в CI рядом никого нет.' },
    { type: 'text', text: 'Агент не обязан жить только в вашем терминале. В CI он отвечает на упоминания в задачах и PR, ревьюит каждый PR и выполняет рутину по расписанию — тот же Claude Code, только без интерактива.' },
    { type: 'bridge', text: 'Вы заводили для CI сервисный аккаунт: отдельный токен, минимальные права, секреты в хранилище, а не в коде. Агент в CI — такой же сервисный аккаунт, только умеет больше и поэтому нуждается в более узких рамках.' },
    { type: 'why', text: 'В терминале вы видите каждый шаг и можете остановить агента. В CI он работает без наблюдателя: всё, что разрешено, он может сделать, и узнаете вы об этом из итогового PR или лога. Поэтому рамки в CI задают заранее: какие инструменты, сколько ходов, какие права у workflow.' },
    { type: 'heading', text: 'GitHub Actions за одну команду' },
    { type: 'command', code: '/install-github-app', caption: 'Запустите в Claude Code: команда установит приложение GitHub, добавит секрет и подготовит файл workflow. Нужен GitHub CLI `gh`, и работает она только с репозиториями на github.com.' },
    {
      type: 'code',
      file: '.github/workflows/claude.yml',
      code: "name: Claude Code\non:\n  issue_comment:\n    types: [created]\njobs:\n  claude:\n    if: contains(github.event.comment.body, '@claude')\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n      pull-requests: write\n      issues: write\n      id-token: write\n      actions: read\n    steps:\n      - uses: actions/checkout@v6\n      - uses: anthropics/claude-code-action@v1\n        with:\n          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}",
      caption: 'Теперь комментарий «@claude поправь опечатку в README» в задаче или PR запустит агента. Ключ хранится в секретах репозитория, а не в файле.',
    },
    { type: 'heading', text: 'Два режима' },
    {
      type: 'list',
      items: [
        '**По упоминанию**: агент отвечает на `@claude` в комментариях — так работает workflow без входа `prompt`.',
        '**Автоматический**: с входом `prompt` агент выполняет заданную работу на событие или по расписанию — например, ревью каждого PR.',
      ],
    },
    { type: 'heading', text: 'Безголовый запуск' },
    { type: 'text', text: 'В любом CI, не только в GitHub, работает `claude -p`: запрос без интерактива, результат — в stdout. Для CI и скриптов добавляйте `--bare`: со временем он станет для `-p` умолчанием. Для GitLab CI/CD есть отдельная инструкция.' },
    { type: 'command', code: 'claude -p "Найди в изменениях ветки места без тестов" --bare --output-format json --allowedTools "Read,Grep,Glob" --max-turns 10', caption: '`--bare` не подгружает хуки, навыки, плагины, MCP-серверы, CLAUDE.md и авто-память, а ключ берёт из `ANTHROPIC_API_KEY`. `--allowedTools` разрешает только чтение, `--max-turns` ограничивает число ходов, а JSON удобно разбирать скриптом.' },
    {
      type: 'session',
      title: 'ci · feature/promo',
      summary: 'Симуляция прогона в CI: claude -p читает изменения ветки, находит место без тестов и возвращает результат в JSON для следующего шага пайплайна.',
      lines: [
        { kind: 'command', text: 'claude -p "Найди места без тестов" --bare --output-format json', typed: true },
        { kind: 'info', text: 'Читаю изменения ветки feature/promo: 6 файлов' },
        { kind: 'info', text: 'Без тестов: src/cart/promo.ts — ветка с просроченным кодом' },
        { kind: 'done', text: '{"result": "Без тестов: 1 место", "session_id": "…"}' },
      ],
    },
    {
      type: 'spot',
      title: 'Workflow ревью · что ему выдать',
      prompt: 'Workflow только ревьюит PR и оставляет замечания. Что из этого ему лишнее?',
      items: [
        { id: 'read', text: '`contents: read` — читать код репозитория.' },
        { id: 'comments', text: '`pull-requests: write` — оставлять замечания в PR.' },
        { id: 'push', text: '`contents: write` — пушить коммиты в ветки.' },
        { id: 'key', text: '`ANTHROPIC_API_KEY` из секретов репозитория.' },
      ],
      answer: 'push',
      reveal: 'Ревью читает код и пишет комментарии — пушить ему незачем. Лишнее право в CI опасно вдвойне: рядом нет никого, кто остановит агента. Чтение кода, комментарии в PR и ключ из секретов — ровно то, что нужно.',
    },
    { type: 'callout', tone: 'trap', title: 'В CI агент работает без вас', text: 'Никто не нажмёт Esc и не отклонит правку. Давайте минимальные права: инструменты — через `--allowedTools`, права workflow — только нужные, ключи — только в секретах. Изменения агента из CI всё равно проходят ревью перед слиянием.' },
    { type: 'callout', tone: 'tip', title: 'Начните с чтения', text: 'Первый сценарий в CI — ревью и поиск проблем, где агент только читает и комментирует. Задачи с правками добавляйте, когда увидите, как он себя ведёт.' },
    {
      type: 'sources',
      links: [
        { title: 'GitHub Actions: /install-github-app и claude-code-action', url: 'https://code.claude.com/docs/en/github-actions' },
        { title: 'Безголовый режим: claude -p, --bare и флаги', url: 'https://code.claude.com/docs/en/headless' },
        { title: 'GitLab CI/CD', url: 'https://code.claude.com/docs/en/gitlab-ci-cd' },
      ],
    },
  ],
  practice: {
    task: 'Подключите агента к репозиторию через `/install-github-app` или вручную. В комментарии к тестовой задаче попросите `@claude` сделать мелкую правку и откройте PR, который он создаст. Проверьте, что ключ лежит в секретах, а права workflow минимальны.',
    done: [
      'агент ответил на `@claude` и сделал PR;',
      'ключ API хранится в секретах репозитория;',
      'права workflow ограничены нужным.',
    ],
  },
  check: {
    questions: [
      {
        id: 'api-key',
        prompt: 'Коллега предлагает для скорости вписать ключ API прямо в workflow: «репозиторий приватный». Что ответите?',
        options: [
          { id: 'secrets', text: 'Ключ — в секреты репозитория, а в workflow — `${{ secrets.ANTHROPIC_API_KEY }}`.', correct: true, why: 'Да. Ключ не попадает ни в код, ни в историю git.' },
          { id: 'yaml', text: 'Можно: репозиторий приватный, и файл workflow посторонние всё равно не увидят.', why: 'Ключ останется в истории git навсегда, и его увидит каждый, у кого есть доступ к репозиторию.' },
          { id: 'env-file', text: 'Лучше вынести ключ в закоммиченный `.env` рядом с workflow.', why: 'Тот же результат: секрет в репозитории.' },
        ],
      },
      {
        id: 'review-every-pr',
        prompt: 'Нужно, чтобы агент ревьюил каждый новый PR без упоминаний. Что для этого нужно?',
        options: [
          { id: 'prompt-input', text: 'Автоматический режим: workflow на событие PR с входом `prompt`.', correct: true, why: 'Да. С `prompt` агент выполняет заданную работу сам, без `@claude`.' },
          { id: 'mention', text: 'Попросить команду упоминать `@claude` в каждом новом PR.', why: 'Это ручной режим — легко забыть.' },
          { id: 'local', text: 'Запускать `/code-review` локально перед каждым пушем.', why: 'Полезно, но это не CI: проверка зависит от того, не забудет ли человек.' },
        ],
      },
      {
        id: 'headless-limits',
        prompt: 'Вы запускаете `claude -p` в CI, чтобы искать проблемы в коде. Что стоит ограничить?',
        multiple: true,
        options: [
          { id: 'tools', text: 'Инструменты: `--allowedTools` только на чтение.', correct: true, why: 'Да. Для поиска проблем агенту не нужно ничего менять.' },
          { id: 'turns', text: 'Число ходов: `--max-turns`.', correct: true, why: 'Да. Это страхует от бесконечной работы и лишних затрат.' },
          { id: 'output', text: 'Формат вывода: только текст, без JSON.', why: 'Формат не про безопасность; JSON даже удобнее разбирать скриптом.' },
          { id: 'nothing', text: 'Ничего: в CI нет ничего ценного, ограничения только мешают.', why: 'В CI есть секреты и доступ к репозиторию — права стоит сужать.' },
        ],
      },
    ],
  },
};
