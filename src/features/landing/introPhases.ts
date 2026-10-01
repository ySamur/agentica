// Where each part of the opening scene sits on its scroll progress: 0 when the film's top meets the
// viewport's, 1 at the scene's end. Shared by the markup, the motion layer and the tests (no DOM here).
// Tuned to the scene's height in landing.css (430svh): the scene lets go right after the hero
// settles, so scrolling on never meets a stage that stands still.

export const phases = {
  // The footage plays over the first 87%; its baked grade cools as the agent takes over.
  frames: [0, 0.87],
  handsOut: 0.18,
  linesIn: [0.24, 0.39],
  linesOut: 0.41,
  agentIn: 0.45,
  terminalIn: 0.47,
  typing: [0.54, 0.85],
  agentOut: 0.85,
  heroIn: [0.87, 0.95],
  // The rest of the hero follows the title from here and has settled by about 0.98.
  heroRest: 0.89,
  // The hero's links take pointers from here on.
  heroLive: 0.91,
} as const;

// "Пропустить интро" lands here, with the hero fully in place.
export const heroAt = 0.98;

// Every frame of the clip's 0.2–9.5 s at its own 25 per second.
export const frameCount = 233;
