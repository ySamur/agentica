import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';

test.beforeEach(async ({ context }) => {
  await mockAuth(context, { signedIn: true });
});

test('home page loads without runtime errors or horizontal overflow and keeps its own title', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Вы создаёте.');
  await expect(page).toHaveTitle('agentica — Вы создаёте. Агенты ускоряют.');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('section links reach their anchor even before the home page chunk is loaded', async ({ page }, testInfo) => {
  await page.goto('/settings/profile');
  await expect(page.getByRole('textbox', { name: 'Имя на сайте' })).toBeVisible();
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Вопросы' }).click();
  await expect(page).toHaveURL(/\/#questions$/);
  await expect(page.locator('#questions')).toBeInViewport();
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
