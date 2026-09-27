import { test, expect } from '@playwright/test';

test('page loads without runtime errors or horizontal overflow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/agentica/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Вы создаёте.');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `.local/screenshots/${testInfo.project.name}.png`, fullPage: true });
  await page.screenshot({ path: `.local/screenshots/${testInfo.project.name}-viewport.png` });
});

test('starter dialog supports keyboard tabs, copying and Escape', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permission is Chromium-specific.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('.hero-actions').getByRole('button', { name: 'Начать с агентами' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('tab', { name: 'Новая функция' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Поиск ошибки' })).toBeFocused();
  await expect(dialog.getByRole('textbox')).toHaveValue(/Помоги найти и исправить ошибку/);
  await dialog.getByRole('button', { name: 'Скопировать запрос' }).click();
  await expect(dialog.getByRole('button', { name: 'Запрос скопирован' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Помоги найти и исправить ошибку');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.hero-actions').getByRole('button', { name: 'Начать с агентами' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('comparison and questions reveal their corresponding content', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Самостоятельно', exact: true }).click();
  await expect(page.locator('.comparison-result')).toContainText('На каждом этапе');
  await expect(page.locator('.timeline-who').filter({ hasText: 'АГЕНТ' })).toHaveCount(0);
  await page.getByRole('button', { name: 'С ИИ-агентами', exact: true }).click();
  await expect(page.locator('.timeline-who').filter({ hasText: 'АГЕНТ' })).toHaveCount(2);
  const question = page.getByRole('button', { name: 'А если агент ошибётся?' });
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#answer-2')).toBeVisible();
  await expect(page.locator('#answer-0')).not.toBeVisible();
  await question.click();
  await expect(page.locator('#answer-2')).not.toBeVisible();
});

test('workflow can run to review and restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Запустить демонстрацию' }).click();
  await expect(page.getByRole('button', { name: 'Повторить демонстрацию' })).toBeVisible({ timeout: 12000 });
  await expect(page.locator('.code-lines')).toContainText('Последнее слово — за вами');
  await page.getByRole('button', { name: 'Повторить демонстрацию' }).click();
  await expect(page.getByRole('button', { name: 'Приостановить демонстрацию' })).toBeVisible();
  await page.getByRole('button', { name: 'Приостановить демонстрацию' }).click();
  await expect(page.getByRole('button', { name: 'Запустить демонстрацию' })).toBeVisible();
});

test('navigation reaches its destination and mobile menu closes', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Почему агенты' }).click();
  await expect(page).toHaveURL(/#why$/);
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('navigation')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute('aria-expanded', 'false');
  }
});
