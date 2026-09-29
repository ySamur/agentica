import { expect, type Page } from '@playwright/test';

// Waits for fonts and for every finite animation, the route change's cross-fade included, to end,
// so a screenshot shows the page as it rests. Endless ones (the landing's aurora) are left running.
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.getAnimations().every(animation =>
    animation.playState !== 'running' || animation.effect?.getComputedTiming().endTime === Infinity));
}

export async function expectNoOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
