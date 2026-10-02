---
paths:
  - "src/features/landing/**"
  - "src/pages/landing/**"
  - "src/landing.css"
  - "src/lib/{motion,smoothScroll}.ts"
  - "public/frames/**"
  - "tests/landing.spec.ts"
---

# Landing

The guest page at `/`. Don't factor landing code into members' pages unless asked; reusing its shared CSS pieces is fine.

## Opening scene
- One sticky scene, `TypingFilm`: scroll-scrubbed WebP frames, then the agent's terminal (`ClaudeSession`) typing by scroll, then the hero with the CTAs.
- The Claude Code session is simulated: a script in `sessionScript.ts`; nothing talks to an agent.
- Scene progress points live in `introPhases.ts` (no DOM; shared by the markup, the motion layer and the tests).
- Frames: `public/frames/typing/{desktop,desktop-hd,mobile}/f_NNN.webp`, 120 per set (`frameCount`), cut from Pexels clip 7534237 by Mikhail Nilov (free license) with the brand grade baked in. `index.html` preloads the first frame for guests.
- Reduced motion and data saver get one still instead of the frames.

## Motion layer
- The lazy chunk `src/features/landing/motion/` (entry `LandingMotion.tsx`): GSAP with ScrollTrigger, SplitText, ScrambleText and DrawSVG (Standard no-charge license); Lenis smooth scrolling for fine pointers only.
- Import `gsap`, `@gsap/react` and `lenis` only inside `motion/`, or they land in the main chunk; `import type` elsewhere is fine. A new GSAP plugin also goes into `optimizeDeps.include` in `vite.config.ts`.
- Components render static, finished markup; the layer animates it. `main[data-motion]` starts `pending` and becomes `on` or `off`. `off`: reduced motion, data saver, a viewport under 560px tall (`motionAllowed()`), or the chunk not arriving within 4 s.
- `main[data-header]` is `clear` over the film, then `glass` or `hidden` (`motion/chrome.ts`); without motion the header stays solid.
- Scrubbed staggers need explicit start states (`gsap.set`). A callback that renders from a tween also runs on `onRefresh`.

## Calls to action
- `SignupLink` leads to `/login?next=%2Fpath`; its pill morphs into the login card through a shared `<ViewTransition>` (`.signup-morph` in `styles.css`).
