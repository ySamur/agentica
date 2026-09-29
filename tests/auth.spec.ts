import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { settle } from './helpers/page';

test('guest cannot see protected pages and return destinations are allowlisted', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/path');
  await expect(page).toHaveURL(/\/login\?next=%2Fpath$/);
  // Old addresses redirect first, then ask for sign-in.
  await page.goto('/content');
  await expect(page).toHaveURL(/\/login\?next=%2Fpath$/);
  await page.goto('/settings/profile');
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await page.goto('/login?next=https://malicious.example');
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
});

test('guests get the landing and members get the cabinet', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/');
  await expect(page.locator('main.landing-page')).toBeVisible();
  await page.getByRole('link', { name: 'Войти', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Добро пожаловать');
  await expect(page.locator('main.landing-page')).toHaveCount(0);
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page.locator('main.landing-page')).toBeVisible();
});

test('a stored session shows the cabinet, not the landing, while the auth SDK loads', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  await context.route(/@supabase[_/]supabase-js/, async route => { await released; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByText('Загрузка…')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Добро пожаловать');
  await expect(page.locator('main.landing-page')).toHaveCount(0);
  release();
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Тестовый.');
  await expect(page.locator('main.landing-page')).toHaveCount(0);
});

test('Google PKCE login returns to the route and exchanges the code once', async ({ page, context }) => {
  const auth = await mockAuth(context);
  await page.goto('/path');
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/path');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('От клавиатуры');
  expect(auth.exchangeCount).toBe(1);
  const authorizeUrl = new URL(auth.authorizeUrl);
  expect(authorizeUrl.searchParams.get('provider')).toBe('google');
  expect(authorizeUrl.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256');
  expect(new URL(authorizeUrl.searchParams.get('redirect_to')!).origin).toBe('http://localhost:4317');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('От клавиатуры');
  expect(auth.exchangeCount).toBe(1);
});

test('profile saves name, survives reload and keeps Google email read-only', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/profile');
  await expect(page).toHaveTitle('agentica — Профиль');
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
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/profile-${testInfo.project.name}.png`, fullPage: true });
});

test('profile rejects blank names and supports retry after a save failure', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/profile');
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
  await expect(page.getByRole('menuitem', { name: 'Выйти' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('menu')).not.toBeVisible();
  await trigger.click();
  await page.locator('.cabinet-lead').click();
  await expect(page.getByRole('menu')).not.toBeVisible();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Профиль' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('menu')).not.toBeVisible();
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link', { name: 'Маршрут' }).click();
  await expect(page).toHaveURL(/\/path$/);
});

test('logout removes protected pages in all tabs and stays signed out after reload', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/path');
  const other = await context.newPage();
  await other.goto('http://localhost:4317/path/tasks/plan-first');
  await expect(other.getByRole('heading', { level: 1 })).toHaveText('План до кода');
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(other).toHaveURL(/\/login\?next=%2Fpath%2Ftasks%2Fplan-first$/);
  await expect(other.getByRole('heading', { name: 'План до кода' })).toHaveCount(0);
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
  await page.goto('/path');
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page.getByRole('status')).toContainText('Вы вышли на этом устройстве');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
  await page.goto('/path');
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeVisible();
});

test('expired access token refreshes without exposing the login screen', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true, expired: true });
  await page.goto('/path');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('От клавиатуры');
  expect(auth.refreshCount).toBeGreaterThan(0);
});

test('invalid refresh token sends the user to login', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true, expired: true });
  auth.refreshFails = true;
  await page.goto('/path');
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeVisible();
  await expect(page).toHaveURL(/\/login\?next=%2Fpath$/);
});

test('unknown and invalid callback URLs have useful recovery links', async ({ page, context }, testInfo) => {
  await mockAuth(context);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/not-found-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'На главную', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Код пишет Claude.');
  await page.goto('/auth/callback');
  await expect(page.getByRole('heading', { name: 'Вход не завершён' })).toBeVisible();
});

test('missing configuration keeps the landing and login usable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4318/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Код пишет Claude.');
  await page.getByRole('link', { name: 'Войти', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page.getByRole('alert')).toContainText('Вход временно недоступен');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/login-${testInfo.project.name}.png`, fullPage: true });
});

test('landing stays usable when the lazily loaded auth SDK fails to download', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Matches the SDK module in both pre-bundled (@supabase_supabase-js) and raw (@supabase/supabase-js) form.
  await context.route(/@supabase[_/]supabase-js/, route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Код пишет Claude.');
  await expect(page.getByText('Не удалось восстановить сессию')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
