import { test, expect } from '@playwright/test';
import { materials, mockAuth } from './helpers/auth';
import { expectNoOverflow, screenshot } from './helpers/page';

const material = (id: string) => materials.find(({ item }) => item.id === id)!;

test('the library lists every material and opens only those of passed steps', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const auth = await mockAuth(context, { signedIn: true });
  auth.seed('claude-md', 'done');
  // «Уже умею» counts as passed too.
  auth.seed('before-after', 'skipped');
  await page.goto('/library');
  await expect(page).toHaveTitle('agentica — Библиотека');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Материалы, которые остаются с вами.');
  await expect(page.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link', { name: 'Библиотека' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.library-item')).toHaveCount(materials.length);
  await expect(page.locator('.library-item[data-locked]')).toHaveCount(materials.length - 2);
  await expect(page.locator('.path-total')).toHaveText(`2 из ${materials.length} материалов открыто`);
  // A locked material leads to the step that opens it; its body never reaches the page.
  await expect(page.getByRole('link', { name: 'Откроется после шага 1.2 «Разрешения и границы доступа»' })).toHaveAttribute('href', '/path/first-contact/permissions');
  await expect(page.locator('main')).not.toContainText('Read(./secrets/**)');
  await expectNoOverflow(page);
  await screenshot(page, `.local/screenshots/library-${testInfo.project.name}.png`);

  const template = material('claude-md-template');
  const summary = page.locator('summary', { hasText: template.item.title });
  await summary.focus();
  await page.keyboard.press('Enter');
  const file = page.locator('.library-item details[open] .lesson-code');
  await expect(file.locator('.code-file')).toHaveText('CLAUDE.md');
  await file.getByRole('button', { name: 'Скопировать CLAUDE.md' }).click();
  await expect(file.getByRole('button', { name: 'Скопировать CLAUDE.md' })).toHaveText('Скопировано');
  // The Windows clipboard hands multi-line text back with CRLF.
  expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(template.body.body);
  await screenshot(page, `.local/screenshots/library-open-${testInfo.project.name}.png`);
});

test('the header leads to the library and focus lands on its heading', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link', { name: 'Библиотека' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // Nothing is passed yet: every material waits for its step.
  await expect(page.locator('.library-item[data-locked]')).toHaveCount(materials.length);
});

test('a library that fails to load can be retried', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  auth.libraryFails = true;
  await page.goto('/library');
  await expect(page.getByRole('alert')).toHaveText('Не удалось загрузить библиотеку. Проверьте соединение и попробуйте ещё раз.');
  auth.libraryFails = false;
  await page.getByRole('button', { name: 'Повторить загрузку' }).click();
  await expect(page.locator('.library-item')).toHaveCount(materials.length);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('an expired session on the library signs out and hides it', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  auth.dataExpired = true;
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login\?next=%2Flibrary$/);
  await expect(page.locator('.library-item')).toHaveCount(0);
});

test('a guest never reaches the library, then signs in and lands on it', async ({ page, context }) => {
  const auth = await mockAuth(context);
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login\?next=%2Flibrary$/);
  expect(auth.dataRequests).toBe(0);
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/library');
  await expect(page.locator('.library-item')).toHaveCount(materials.length);
});
