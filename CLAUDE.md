@AGENTS.md

## Claude Code notes

- `AGENTS.md` is the shared source of truth for Codex and Claude Code; put project rules there, and only Claude-specific notes here.
- The Bash tool is Git Bash; in PowerShell use `npm.cmd`.
- A PostToolUse hook (`.claude/hooks/typecheck.mjs`) runs `npm run typecheck` after edits to `.ts`/`.tsx` files and reports errors back. Fix them before moving on.
- Before finishing a code change, run `/verify` (or the steps it lists).
- `.env*` files are deny-listed for reading; never ask to read them.
