import type { LessonSource } from './types.ts';

// 5.5 Агент в CI. Facts: code.claude.com/docs/en/github-actions (/install-github-app; workflow with
// anthropics/claude-code-action@v1 and the ANTHROPIC_API_KEY secret; @claude mentions without `prompt`,
// automation with `prompt`; minimal permissions), /headless (claude -p, --output-format json,
// --allowedTools, --max-turns) and /gitlab-ci-cd (a GitLab example exists).
export const lesson: LessonSource = {
  stepId: 'agent-ci',
  verified: '2026-10-03',
  minutes: 13,
  outcome: 'Вы запускаете агента в CI — ответы на `@claude`, автоматическое ревью, безголовые прогоны `claude -p` — с секретами и правами под контролем.',
  blocks: [
    { type: 'text', text: 'Агент не обязан жить только в вашем терминале. В CI он отвечает на упоминания в задачах и PR, ревьюит каждый PR и выполняет рутину по расписанию — тот же Claude Code, только без интерактива.' },
    { type: 'heading', text: 'GitHub Actions за одну команду' },
    { type: 'command', code: '/install-github-app', caption: 'Запустите в Claude Code: команда установит приложение GitHub, добавит секрет и подготовит файл workflow.' },
    {
      type: 'code',
      file: '.github/workflows/claude.yml',
      code: "name: Claude Code\non:\n  issue_comment:\n    types: [created]\njobs:\n  claude:\n    if: contains(github.event.comment.body, '@claude')\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n      pull-requests: write\n      issues: write\n      id-token: write\n    steps:\n      - uses: actions/checkout@v6\n      - uses: anthropics/claude-code-action@v1\n        with:\n          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}",
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
    { type: 'text', text: 'В любом CI, не только в GitHub, работает `claude -p`: запрос без интерактива, результат — в stdout. Для GitLab в документации есть готовый пример.' },
    { type: 'command', code: 'claude -p "Найди в изменениях ветки места без тестов" --output-format json --allowedTools "Read,Grep,Glob" --max-turns 10', caption: '`--allowedTools` разрешает только чтение, `--max-turns` ограничивает число ходов, а JSON удобно разбирать скриптом.' },
    {
      type: 'session',
      title: 'ci · feature/promo',
      summary: 'Симуляция прогона в CI: claude -p читает изменения ветки, находит место без тестов и возвращает результат в JSON для следующего шага пайплайна.',
      lines: [
        { kind: 'command', text: 'claude -p "Найди места без тестов" --output-format json', typed: true },
        { kind: 'info', text: 'Читаю изменения ветки feature/promo: 6 файлов' },
        { kind: 'info', text: 'Без тестов: src/cart/promo.ts — ветка с просроченным кодом' },
        { kind: 'done', text: '{"result": "Без тестов: 1 место", "session_id": "…"}' },
      ],
    },
    { type: 'callout', tone: 'trap', title: 'В CI агент работает без вас', text: 'Никто не нажмёт Esc и не отклонит правку. Давайте минимальные права: инструменты — через `--allowedTools`, права workflow — только нужные, ключи — только в секретах. Изменения агента из CI всё равно проходят ревью перед слиянием.' },
    { type: 'callout', tone: 'tip', title: 'Начните с чтения', text: 'Первый сценарий в CI — ревью и поиск проблем, где агент только читает и комментирует. Задачи с правками добавляйте, когда увидите, как он себя ведёт.' },
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
        prompt: 'Где хранить ключ API для workflow с агентом?',
        options: [
          { id: 'secrets', text: 'В секретах репозитория: `${{ secrets.ANTHROPIC_API_KEY }}`.', correct: true, why: 'Да. Ключ не попадает ни в код, ни в историю git.' },
          { id: 'yaml', text: 'Прямо в файле workflow.', why: 'Ключ окажется в репозитории и в истории git.' },
          { id: 'env-file', text: 'В закоммиченном рядом `.env`.', why: 'Тот же результат: секрет в репозитории.' },
        ],
      },
      {
        id: 'review-every-pr',
        prompt: 'Нужно, чтобы агент ревьюил каждый новый PR без упоминаний. Что для этого нужно?',
        options: [
          { id: 'prompt-input', text: 'Автоматический режим: workflow на событие PR с входом `prompt`.', correct: true, why: 'Да. С `prompt` агент выполняет заданную работу сам, без `@claude`.' },
          { id: 'mention', text: 'Каждый раз писать `@claude` в PR.', why: 'Это ручной режим — легко забыть.' },
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
          { id: 'output', text: 'Формат вывода: только текст.', why: 'Формат не про безопасность; JSON даже удобнее разбирать скриптом.' },
          { id: 'nothing', text: 'Ничего: в CI нет ничего ценного.', why: 'В CI есть секреты и доступ к репозиторию — права стоит сужать.' },
        ],
      },
    ],
  },
};
