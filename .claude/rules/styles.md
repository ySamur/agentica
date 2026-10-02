---
paths:
  - "src/**/*.css"
---

# Styles

- Cascade layers, declared once at the top of `styles.css`: `reset, base, components, responsive, utilities`. Every rule sits in one of them.
- `styles.css`: the one dark palette on `:root`; header, footer, the starter dialog, view transitions; the shared pieces `.aurora`, `.glow-button`, `.ghost-button`, `.story-eyebrow`, `.accent`, the agent window (`.session-window`, `.step-window`) and spotlight cards (`.skill-card`, `.stage-card`; `spotlight()` sets `--x`/`--y`); `.visually-hidden` in `utilities`.
- `account.css`: account menu, login, work-page glass. `guide.css`: cabinet, route, step. `landing.css`: landing only (film, sections, `data-header` modes).
- Work pages share Layout's still `.aurora-calm`.
- Accent words: `.accent` (Cormorant Italic). Service text (step codes, statuses, counters): mono, `var(--mono)`.
