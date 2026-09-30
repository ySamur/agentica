// Where each part of the opening scene sits on its scroll progress: 0 when the film's top meets the
// viewport's, 1 at the scene's end. Shared by the markup, the motion layer and the tests (no DOM here).

export const phases = {
  // The footage plays over the first 80%; its baked grade cools as the agent takes over.
  frames: [0, 0.8],
  handsOut: 0.17,
  linesIn: [0.22, 0.36],
  linesOut: 0.38,
  agentIn: 0.42,
  terminalIn: 0.44,
  typing: [0.5, 0.78],
  agentOut: 0.78,
  heroIn: [0.8, 0.88],
  // The hero's links take pointers from here on.
  heroLive: 0.84,
} as const;

// "Пропустить интро" lands here, with the hero fully in place.
export const heroAt = 0.92;

export const frameCount = 120;
