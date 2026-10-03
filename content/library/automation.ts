import type { LibrarySource } from './types.ts';

// Stage 5 «Автоматизация». Formats match the lessons (hooks, commands-skills, git-flow, agent-ci).
export const materials: LibrarySource[] = [
  {
    id: 'hook-settings',
    stepId: 'hooks',
    kind: 'template',
    title: 'Хук после каждой правки',
    summary: 'Событие `PostToolUse` с фильтром `Edit|Write` запускает проверку после каждой правки файла.',
    file: '.claude/settings.json',
    body: '{\n  "hooks": {\n    "PostToolUse": [\n      {\n        "matcher": "Edit|Write",\n        "hooks": [\n          {\n            "type": "command",\n            "command": "node \\"$CLAUDE_PROJECT_DIR/.claude/hooks/typecheck.mjs\\""\n          }\n        ]\n      }\n    ]\n  }\n}',
  },
  {
    id: 'hook-typecheck',
    stepId: 'hooks',
    kind: 'template',
    title: 'Скрипт хука: проверка типов',
    summary: 'Код выхода 2 возвращает ошибки агенту, и он чинит их сразу, пока помнит правку.',
    file: '.claude/hooks/typecheck.mjs',
    body: "import { spawnSync } from 'node:child_process';\n\nlet input = '';\nfor await (const chunk of process.stdin) input += chunk;\nconst { file_path } = JSON.parse(input).tool_input;\nif (!/\\.tsx?$/.test(file_path)) process.exit(0);\n\nconst { status, stdout } = spawnSync('npx tsc --noEmit', { shell: true, encoding: 'utf8' });\nif (status !== 0) {\n  process.stderr.write(`Ошибки типов после правки ${file_path}:\\n${stdout}`);\n  process.exit(2);\n}",
  },
  {
    id: 'verify-skill',
    stepId: 'commands-skills',
    kind: 'template',
    title: 'Skill «verify»',
    summary: 'Проверки проекта одной командой `/verify`; агент вызывает её и сам — по `description`.',
    file: '.claude/skills/verify/SKILL.md',
    body: '---\nname: verify\ndescription: Проверки проекта перед отчётом о готовности — линтер, сборка, тесты. Используй перед тем, как сказать «готово».\n---\n\nЗапусти по порядку, остановись на первой ошибке и исправь её:\n\n1. `npm run lint` — 0 ошибок.\n2. `npm run build` — вместе с проверкой типов.\n3. `npm test` — только затронутые области.',
  },
  {
    id: 'git-rules',
    stepId: 'git-flow',
    kind: 'template',
    title: 'Правила Git для агента',
    summary: 'Ветки, коммиты и PR по правилам проекта; пуш и слияние остаются за человеком.',
    file: 'CLAUDE.md',
    body: '## Git\n- Ветки: `fix/…`, `feat/…` от `main`\n- Коммиты: `тип: что сделано`, по-английски, в повелительном наклонении\n- PR: проблема, решение, как проверено; скриншоты для изменений UI\n- Не пушить и не сливать — это делает человек',
  },
  {
    id: 'claude-workflow',
    stepId: 'agent-ci',
    kind: 'template',
    title: 'Агент в GitHub Actions',
    summary: 'Отвечает на `@claude` в комментариях. Ключ — только в секретах репозитория.',
    file: '.github/workflows/claude.yml',
    body: "name: Claude Code\non:\n  issue_comment:\n    types: [created]\njobs:\n  claude:\n    if: contains(github.event.comment.body, '@claude')\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n      pull-requests: write\n      issues: write\n      id-token: write\n    steps:\n      - uses: actions/checkout@v6\n      - uses: anthropics/claude-code-action@v1\n        with:\n          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}",
  },
];
