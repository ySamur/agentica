@AGENTS.md

- Project rules belong in `AGENTS.md` (shared with Codex); only Claude-specific notes go here.
- A PostToolUse hook type-checks after `.ts`/`.tsx` edits; fix reported errors before moving on.
- Run `/verify` before reporting a code change as done.
- `.env*` files are deny-listed; never ask for their contents.
