import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';

test('guest cannot see protected pages and return destinations are allowlisted', async ({ page, context }) => {
  const auth = await mockAuth(context);
  await page.goto('/content');
  await expect(page).toHaveURL(/\/login\?next=%2Fcontent$/);
  await expect(page.getByText('тест контент', { exact: true })).not.toBeVisible();
  expect(auth.contentRequests).toBe(0);
  await page.goto('/settings/profile');
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fprofile$/);
  await page.goto('/login?next=https://malicious.example');
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
});

test('Google PKCE login returns to content and exchanges the code once', async ({ page, context }) => {
  const auth = await mockAuth(context);
  await page.goto('/content');
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/content');
  await expect(page.getByText('тест контент', { exact: true })).toBeVisible();
  expect(auth.exchangeCount).toBe(1);
  const authorizeUrl = new URL(auth.authorizeUrl);
  expect(authorizeUrl.searchParams.get('provider')).toBe('google');
  expect(authorizeUrl.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256');
  expect(new URL(authorizeUrl.searchParams.get('redirect_to')!).origin).toBe('http://localhost:4317');
  await page.reload();
  await expect(page.getByText('тест контент', { exact: true })).toBeVisible();
  expect(auth.exchangeCount).toBe(1);
});

test('profile saves name, survives reload and keeps Google email read-only', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/settings/profile');
  const input = page.getByRole('textbox', { name: 'Имя на сайте' });
  await expect(input).toHaveValue('Тестовый Разработчик');
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveAttribute('readonly', '');
  await input.fill('  Новое Имя  ');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Имя сохранено');
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await expect(page.locator('.account-summary strong')).toHaveText('Новое Имя');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(input).toHaveValue('Новое Имя');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.local/screenshots/profile-${testInfo.project.name}.png`, fullPage: true });
});

test('profile rejects blank names and supports retry after a save failure', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/settings/profile');
  const input = page.getByRole('textbox', { name: 'Имя на сайте' });
  await input.fill('   ');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Введите имя.');
  auth.updateFails = true;
  await input.fill('Повторное Имя');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Не удалось сохранить имя');
  await expect(input).toHaveValue('Повторное Имя');
  auth.updateFails = false;
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Имя сохранено');
});

test('account menu supports keyboard, outside dismissal and navigation', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Меню аккаунта' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Профиль' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Контент' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('menu')).not.toBeVisible();
  await trigger.click();
  await page.locator('.hero-footnote').click();
  await expect(page.getByRole('menu')).not.toBeVisible();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Профиль' }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(page.getByRole('menu')).not.toBeVisible();
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('link', { name: 'Почему агенты' }).click();
  await expect(page).toHaveURL(/\/#why$/);
});

test('logout removes protected content in all tabs and stays signed out after reload', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/content');
  const other = await context.newPage();
  await other.goto('http://localhost:4317/content');
  await expect(other.getByText('тест контент', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(other).toHaveURL(/\/login\?next=%2Fcontent$/);
  await expect(other.getByText('тест контент', { exact: true })).not.toBeVisible();
  await other.reload();
  await expect(other.getByRole('button', { name: 'Продолжить с Google' })).toBeVisible();
  await other.close();
});

test('cancelled OAuth and rejected code can be retried', async ({ page, context }) => {
  const auth = await mockAuth(context);
  auth.denied = true;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page.getByText('Вход отменён. Вы можете попробовать снова.')).toBeVisible();
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  auth.denied = false;
  auth.badCode = true;
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page.getByRole('heading', { name: 'Вход не завершён' })).toBeVisible();
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  auth.badCode = false;
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
});

test('logout clears the local session even when the auth server is unavailable', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  auth.logoutFails = true;
  await page.goto('/content');
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page.getByRole('status')).toContainText('Вы вышли на этом устройстве');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
  await page.goto('/content');
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeVisible();
});

test('content failures can be retried and an expired session hides data', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  auth.contentFails = true;
  await page.goto('/content');
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить контент');
  auth.contentFails = false;
  await page.getByRole('button', { name: 'Повторить загрузку' }).click();
  await expect(page.getByText('тест контент', { exact: true })).toBeVisible();
  auth.expired = true;
  await page.reload();
  await expect(page).toHaveURL(/\/login\?next=%2Fcontent$/);
  await expect(page.getByText('тест контент', { exact: true })).not.toBeVisible();
});

test('expired access token refreshes without exposing the login screen', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true, expired: true });
  await page.goto('/content');
  await expect(page.getByText('тест контент', { exact: true })).toBeVisible();
  expect(auth.refreshCount).toBeGreaterThan(0);
});

test('invalid refresh token sends the user to login', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true, expired: true });
  auth.refreshFails = true;
  await page.goto('/content');
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeVisible();
  expect(auth.contentRequests).toBe(0);
});

test('unknown and invalid callback URLs have useful recovery links', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  await page.getByRole('link', { name: 'На главную', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Вы создаёте.');
  await page.goto('/auth/callback');
  await expect(page.getByRole('heading', { name: 'Вход не завершён' })).toBeVisible();
});

test('missing configuration keeps the landing and login usable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4318/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Вы создаёте.');
  await page.getByRole('link', { name: 'Войти', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page.getByRole('alert')).toContainText('Вход временно недоступен');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.local/screenshots/login-${testInfo.project.name}.png`, fullPage: true });
});
