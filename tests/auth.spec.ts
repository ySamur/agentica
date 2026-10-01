import { test, expect } from '@playwright/test';
import { mockAuth } from './helpers/auth';
import { expectNoOverflow, settle } from './helpers/page';

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

test('members following old addresses land on the route', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/content');
  await expect(page).toHaveURL(/\/path$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('От клавиатуры к оркестровке.');
  // Old sign-up links carried this return address.
  await page.goto('/login?next=%2Fcontent');
  await expect(page).toHaveURL(/\/path$/);
  await page.goto('/settings/profile');
  await expect(page).toHaveURL(/\/profile$/);
});

test('following a link focuses the new page heading, the sign-in and not-found pages included', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/');
  await page.getByRole('link', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Маршрут начинается здесь.');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page.getByRole('button', { name: 'Меню аккаунта' })).toBeVisible();
  await page.goto('/no-such-page');
  await page.getByRole('link', { name: 'На главную', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Добро пожаловать');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // The header is rebuilt on every page, so its link's focus would otherwise be lost.
  await page.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link', { name: 'Маршрут' }).press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('От клавиатуры к оркестровке.');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // Loading a page keeps the browser's own focus.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).not.toBeFocused();
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
  await expect(page.getByRole('heading', { level: 1 })).toContainText('С возвращением');
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

test('email sign-up checks the form, then creates the account and returns to the route', async ({ page, context }, testInfo) => {
  await mockAuth(context);
  await page.goto('/path');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  const name = page.getByRole('textbox', { name: 'Имя на сайте' });
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  const password = page.getByLabel('Пароль', { exact: true });
  await expect(name).toBeFocused();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('alert')).toHaveText('Введите имя.');
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await name.fill('Новый Участник');
  await email.fill('new-at-example.com');
  await email.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Проверьте email');
  await expect(email).toBeFocused();
  await email.fill('new@example.com');
  await password.fill('short');
  await password.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Пароль слишком короткий.');
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute('autocomplete', 'new-password');
  await expectNoOverflow(page);
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/login-signup-${testInfo.project.name}.png`, fullPage: true });
  await password.fill('long-enough-9');
  await password.press('Enter');
  await expect(page).toHaveURL('http://localhost:4317/path');
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await expect(page.locator('.account-summary strong')).toHaveText('Новый Участник');
  await page.keyboard.press('Escape');
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Email и пароль' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Аккаунт Google' })).toHaveCount(0);
});

test('email sign-in rejects a wrong password; sign-up reports a taken address', async ({ page, context }) => {
  const auth = await mockAuth(context);
  auth.accounts.set('member@example.com', { password: 'right-password-1', name: 'Участник По Почте', confirmed: true });
  await page.goto('/login');
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  const password = page.getByLabel('Пароль', { exact: true });
  await email.fill('member@example.com');
  await password.fill('wrong-password');
  await password.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Неверный email или пароль.');
  await expect(password).toBeFocused();
  await expect(email).toHaveValue('member@example.com');
  await password.fill('right-password-1');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await page.getByRole('button', { name: 'Меню аккаунта' }).click();
  await expect(page.locator('.account-summary strong')).toHaveText('Участник По Почте');
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page.locator('main.landing-page')).toBeVisible();

  await page.goto('/login');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await page.getByRole('textbox', { name: 'Имя на сайте' }).fill('Двойник');
  await email.fill('member@example.com');
  await password.fill('long-enough-9');
  await password.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Этот email уже зарегистрирован');
  // Back to signing in: the email field takes focus.
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(email).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Имя на сайте' })).toHaveCount(0);
});

test('email confirmation: resend, sign-in before the link, the link in another browser and in a new tab here', async ({ page, context, browser }, testInfo) => {
  const auth = await mockAuth(context);
  auth.confirmEmail = true;
  await page.goto('/path');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await page.getByRole('textbox', { name: 'Имя на сайте' }).fill('Подтверждающий');
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  const password = page.getByLabel('Пароль', { exact: true });
  await email.fill('confirm@example.com');
  await password.fill('long-enough-9');
  await password.press('Enter');
  const note = page.getByRole('status').filter({ hasText: 'confirm@example.com' });
  await expect(note).toContainText('Отправили письмо со ссылкой');
  await expect(page).toHaveURL(/\/login\?next=%2Fpath$/);
  // The letter has just gone out: resending waits out Supabase's minute.
  const sent = page.getByRole('button', { name: 'Письмо отправлено, повторно — через минуту' });
  await expect(sent).toHaveAttribute('aria-disabled', 'true');
  await sent.dispatchEvent('click');
  expect(auth.resendCount).toBe(0);
  await expectNoOverflow(page);
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/login-letter-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await password.fill('long-enough-9');
  await password.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'confirm@example.com' })).toContainText('Email ещё не подтверждён');
  const again = page.getByRole('button', { name: 'Отправить письмо ещё раз' });
  auth.resendLimited = true;
  await again.click();
  await expect(page.getByRole('alert')).toContainText('Слишком много попыток');
  auth.resendLimited = false;
  await again.click();
  await expect(sent).toHaveAttribute('aria-disabled', 'true');
  await expect(sent).toBeFocused();
  expect(auth.resendCount).toBe(1);

  // Another browser has no PKCE verifier for the link.
  const other = await browser.newContext();
  await mockAuth(other, { state: auth });
  const elsewhere = await other.newPage();
  await elsewhere.goto('/auth/callback?code=fixture-one-time-code');
  await expect(elsewhere.getByRole('heading', { name: 'Вход не завершён' })).toBeVisible();
  await expect(elsewhere.getByText('не в том браузере')).toBeVisible();
  await other.close();

  // A mail app opens the link in a new tab: no sessionStorage there, the destination still holds.
  const tab = await context.newPage();
  await tab.goto('/auth/callback?code=fixture-one-time-code');
  await expect(tab).toHaveURL('http://localhost:4317/path');
  await tab.getByRole('button', { name: 'Меню аккаунта' }).click();
  await expect(tab.locator('.account-summary strong')).toHaveText('Подтверждающий');
  // Spent once a member arrives.
  expect(await tab.evaluate(() => localStorage.getItem('agentica.auth.letter-next'))).toBeNull();
});

test('a letter that cannot be sent says so, not a connection problem', async ({ page, context }) => {
  const auth = await mockAuth(context);
  auth.confirmEmail = true;
  auth.letterFails = true;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await page.getByRole('textbox', { name: 'Имя на сайте' }).fill('Без Письма');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('nomail@example.com');
  const password = page.getByLabel('Пароль', { exact: true });
  await password.fill('long-enough-9');
  await password.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Не удалось отправить письмо с подтверждением. Попробуйте позже.');
  await expect(password).toBeFocused();
});

test('an expired letter link says so and leads back to signing in', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByRole('heading', { name: 'Вход не завершён' })).toBeVisible();
  await expect(page.getByText('Ссылка из письма устарела')).toBeVisible();
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
  await expectNoOverflow(page);
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
  await expectNoOverflow(page);
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
