import { test, expect, type Page } from '@playwright/test';
import { stages, steps } from '../src/features/guide/catalog';
import type { Block } from '../src/features/guide/lesson/types';
import { mockAuth, published } from './helpers/auth';
import { expectNoOverflow, screenshot, settle } from './helpers/page';

test('the catalog has seven stages and 31 steps with unique ids', () => {
  expect(stages).toHaveLength(7);
  expect(steps).toHaveLength(31);
  expect(new Set(steps.map(step => step.id)).size).toBe(31);
  for (const step of steps) expect(step.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('members land in the cabinet and start the route from its first step', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('agentica — Кабинет');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Добро пожаловать, Тестовый.');
  const header = page.getByRole('navigation', { name: 'Главная навигация' });
  await expect(header.getByRole('link', { name: 'Кабинет' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Начать маршрут: 1.1 Установка и первый запуск' })).toHaveCount(2);
  await expect(page.locator('.stage-meter > li')).toHaveCount(7);
  await expectNoOverflow(page);
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/cabinet-${testInfo.project.name}.png`, fullPage: true });
  await page.locator('.cabinet').getByRole('link', { name: 'Начать маршрут: 1.1 Установка и первый запуск' }).click();
  await expect(page).toHaveURL(/\/path\/first-contact\/install$/);
  await expect(page).toHaveTitle('agentica — 1.1 Установка и первый запуск');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(header.getByRole('link', { name: 'Маршрут' })).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
});

test('the route lists every stage and step, and its stage links move focus to the stage', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/path');
  await expect(page).toHaveTitle('agentica — Маршрут');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('От клавиатуры к оркестровке.');
  await expect(page.locator('.stage-card')).toHaveCount(7);
  await expect(page.locator('.step-row')).toHaveCount(31);
  await expect(page.getByRole('link', { name: '1.1 Установка и первый запуск Не начат' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('navigation', { name: 'Этапы маршрута' }).getByRole('link', { name: /Первый контакт/ })).toHaveAttribute('aria-current', 'step');
  await expectNoOverflow(page);
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/path-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('navigation', { name: 'Этапы маршрута' }).getByRole('link', { name: /Постановка задач/ }).click();
  await expect(page).toHaveURL(/\/path#stage-tasks$/);
  await expect(page.getByRole('heading', { name: 'Этап 3. Постановка задач' })).toBeFocused();
  await expect(page.locator('#stage-tasks')).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '3.1 Анатомия задачи: цель, границы, критерий готовности Не начат' })).toBeFocused();
});

test('a step links to its neighbours from the keyboard and keeps focus on its heading', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/plan-first');
  await expect(page).toHaveTitle('agentica — 3.2 План до кода');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('План до кода');
  await expect(page.locator('.step-code')).toHaveText('03.2');
  await expectNoOverflow(page);
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/step-${testInfo.project.name}.png`, fullPage: true });
  const pager = page.getByRole('navigation', { name: 'Соседние шаги' });
  await pager.getByRole('link', { name: /Дальше · 3\.3/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/path\/tasks\/decomposition$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Декомпозиция на проверяемые шаги');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await pager.getByRole('link', { name: /Назад · 3\.2/ }).click();
  await expect(page).toHaveURL(/\/path\/tasks\/plan-first$/);
  await page.getByRole('navigation', { name: 'Вы здесь' }).getByRole('link', { name: 'Этап 3 · Постановка задач' }).click();
  await expect(page).toHaveURL(/\/path#stage-tasks$/);
  await expect(page.getByRole('heading', { name: 'Этап 3. Постановка задач' })).toBeFocused();
});

test('the first and last steps lead back to the map', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/path/first-contact/install');
  await expect(page.getByRole('link', { name: /Назад Карта маршрута/ })).toHaveAttribute('href', '/path');
  await page.goto('/path/capstone/public-profile');
  await expect(page).toHaveTitle('agentica — ★.3 Публичный профиль с результатом');
  await expect(page.getByRole('link', { name: /Готово Карта маршрута/ })).toHaveAttribute('href', '/path');
});

test('unknown steps are not found, and a step under the wrong stage finds its own', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/no-such-step');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
  await expect(page).toHaveTitle('agentica — Страница не найдена');
  await page.goto('/path/review/plan-first');
  await expect(page).toHaveURL(/\/path\/tasks\/plan-first$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('План до кода');
  // A trailing slash is the same address.
  await page.goto('/path/tasks/decomposition/?from=chat#task');
  await expect(page).toHaveURL(/\/path\/tasks\/decomposition\?from=chat#task$/);
  await expect(page).toHaveTitle('agentica — 3.3 Декомпозиция на проверяемые шаги');
});

test('a guest following a link to a step never reaches its text, then signs in and lands on it', async ({ page, context }) => {
  const auth = await mockAuth(context);
  await page.goto('/path/review/read-diff');
  await expect(page).toHaveURL(/\/login\?next=%2Fpath%2Freview%2Fread-diff$/);
  await expect(page.getByRole('heading', { name: 'Чтение diff, написанного не вами' })).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('main.landing-page')).toBeVisible();
  expect(auth.dataRequests).toBe(0);
  // A shared link with a trailing slash still returns to the step.
  await page.goto('/path/review/read-diff/');
  await expect(page).toHaveURL(/\/login\?next=%2Fpath%2Freview%2Fread-diff$/);
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/path/review/read-diff');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Чтение diff, написанного не вами');
  await expect(page.locator('.step-placeholder')).toContainText('Урок этого шага готовится');
});

test('the members header continues the route and the brand leads to the cabinet', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/profile');
  await page.getByRole('link', { name: 'Начать маршрут: 1.1 Установка и первый запуск' }).click();
  await expect(page).toHaveURL(/\/path\/first-contact\/install$/);
  await page.getByRole('link', { name: 'agentica — на главную' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page).toHaveTitle('agentica — Кабинет');
});

test('opening a step records it, and «Продолжить» returns there after a reload and on another device', async ({ page, context, browser }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/plan-first');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await expect(page.getByRole('heading', { level: 2, name: 'Практика у себя' })).toBeVisible();
  expect(auth.progress.get('plan-first')?.status).toBe('in_progress');
  await page.goto('/path/context/claude-md');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  // The latest opened unfinished step is the resume point.
  await expect(page.getByRole('link', { name: 'Продолжить: 2.2 CLAUDE.md: память проекта' })).toBeVisible();
  await page.goto('/path/tasks/plan-first');
  await expect(page.getByRole('link', { name: 'Продолжить: 3.2 План до кода' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('С возвращением, Тестовый.');
  await expect(page.locator('.cabinet-lead')).toHaveText('Вы остановились на этапе «Постановка задач». Следующий шаг уже ждёт.');
  const device = await browser.newContext();
  await mockAuth(device, { signedIn: true, state: auth });
  const other = await device.newPage();
  await other.goto('http://localhost:4317/');
  await other.locator('.cabinet').getByRole('link', { name: 'Продолжить: 3.2 План до кода' }).click();
  await expect(other).toHaveURL(/\/path\/tasks\/plan-first$/);
  await device.close();
});

test('marking a step done moves focus to the next step and fills the stage', async ({ page, context }, testInfo) => {
  const auth = await mockAuth(context, { signedIn: true });
  for (const id of ['task-anatomy', 'iterations']) auth.seed(id, 'skipped');
  auth.seed('plan-first', 'done');
  await page.goto('/path/tasks/decomposition');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await page.getByRole('button', { name: 'Выполнено' }).click();
  await expect(page.locator('.step-state')).toHaveText('Выполнен');
  await expect(page.locator('.step-note')).toHaveText('Шаг выполнен.');
  await expect(page.getByRole('link', { name: 'Следующий шаг: 3.4 Итерации и корректировка курса' })).toBeFocused();
  await expect.poll(() => auth.progress.get('decomposition')?.status).toBe('done');
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/step-done-${testInfo.project.name}.png`, fullPage: true });
  await page.goto('/path');
  await expect(page.locator('#stage-tasks')).toHaveAttribute('data-complete', 'true');
  await expect(page.getByRole('link', { name: '3.3 Декомпозиция на проверяемые шаги Выполнен' })).toBeVisible();
  await expect(page.getByRole('link', { name: '3.1 Анатомия задачи: цель, границы, критерий готовности Уже умею' })).toBeVisible();
  // Stage 3 is passed, so the route resumes at the first unfinished step.
  await expect(page.locator('.path-summary').getByRole('link', { name: 'Продолжить: 1.1 Установка и первый запуск' })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/path-progress-${testInfo.project.name}.png`, fullPage: true });
});

test('«Уже умею» counts as passed and «Вернуть в работу» reopens the step', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/path/review/read-diff');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await page.getByRole('button', { name: 'Уже умею' }).click();
  await expect(page.locator('.step-state')).toHaveText('Уже умею');
  await expect.poll(() => auth.progress.get('read-diff')?.status).toBe('skipped');
  await page.getByRole('button', { name: 'Вернуть в работу' }).click();
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await expect(page.getByRole('button', { name: 'Выполнено' })).toBeFocused();
  await expect.poll(() => auth.progress.get('read-diff')?.status).toBe('in_progress');
});

test('opening a finished step keeps it finished', async ({ page, context }, testInfo) => {
  const auth = await mockAuth(context, { signedIn: true });
  auth.seed('hooks', 'done');
  await page.goto('/path/automation/hooks');
  await expect(page.locator('.step-state')).toHaveText('Выполнен');
  await expect(page.getByRole('link', { name: /Следующий шаг: 5\.2/ })).toBeVisible();
  await expect(page.locator('.step-placeholder')).toBeVisible();
  expect(auth.progress.get('hooks')?.status).toBe('done');
  await screenshot(page, `.local/screenshots/step-placeholder-${testInfo.project.name}.png`);
});

test('a failed save rolls back with a clear message and focus returns to the buttons', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/decomposition');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  auth.saveFails = true;
  await page.getByRole('button', { name: 'Выполнено' }).click();
  await expect(page.getByRole('alert')).toHaveText('Не удалось сохранить отметку. Проверьте соединение и попробуйте ещё раз.');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await expect(page.getByRole('button', { name: 'Выполнено' })).toBeFocused();
  expect(auth.progress.get('decomposition')?.status).toBe('in_progress');
  auth.saveFails = false;
  await page.getByRole('button', { name: 'Выполнено' }).click();
  await expect(page.locator('.step-state')).toHaveText('Выполнен');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('progress and step texts that fail to load can be retried', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  auth.loadFails = true;
  auth.bodyFails = true;
  await page.goto('/path/tasks/decomposition');
  await expect(page.getByRole('alert').filter({ hasText: 'Не удалось загрузить текст шага' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Не удалось загрузить прогресс' })).toBeVisible();
  // Until the step arrives, nobody knows whether a check or the member marks it.
  await expect(page.getByRole('button', { name: 'Выполнено' })).toHaveCount(0);
  auth.bodyFails = false;
  await page.locator('.step-loading').getByRole('button', { name: 'Повторить загрузку' }).click();
  await expect(page.locator('.step-placeholder')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Выполнено' })).toBeDisabled();
  auth.loadFails = false;
  await page.locator('.step-actions').getByRole('button', { name: 'Повторить загрузку' }).click();
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await expect(page.getByRole('button', { name: 'Выполнено' })).toBeEnabled();
});

test('an expired session on the route data signs out and hides the step', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/plan-first');
  await expect(page.getByRole('heading', { level: 2, name: 'Практика у себя' })).toBeVisible();
  auth.dataExpired = true;
  await page.reload();
  await expect(page).toHaveURL(/\/login\?next=%2Fpath%2Ftasks%2Fplan-first$/);
  await expect(page.locator('.lesson')).toHaveCount(0);
});

// The pilot lesson as served: answers come from its source, so the wording can change freely.
const planFirst = published.get('plan-first')!;
const questions = planFirst.lesson.check!.questions;
const key = planFirst.key!;
const rightAnswers = Object.fromEntries(Object.entries(key).map(([id, { correct }]) => [id, correct]));
const wrongOption = (id: string) => Object.keys(key[id].why).find(option => !key[id].correct.includes(option))!;
const option = (page: Page, question: string, choice: string) => page.locator(`input[name="${question}"][value="${choice}"]`);

async function answer(page: Page, answers: Record<string, string[]>) {
  for (const [question, chosen] of Object.entries(answers)) {
    for (const input of await page.locator(`input[name="${question}"]`).all()) {
      if (chosen.includes((await input.getAttribute('value'))!)) await input.check();
      else if (await input.getAttribute('type') === 'checkbox') await input.uncheck();
    }
  }
}

test('a lesson teaches with its blocks: the session plays and pauses, the command copies, the diagram draws', async ({ page, context }, testInfo) => {
  // The session plays at its natural pace, about 13 s.
  test.setTimeout(60_000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/plan-first');
  await expect(page.locator('.step-meta')).toContainText(`≈${planFirst.lesson.minutes} минут`);
  for (const name of ['Режим планирования', 'Что читать в плане', 'Практика у себя', 'Проверка']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }
  await expect(page.locator('.compare-side')).toHaveCount(2);
  await expect(page.getByRole('note')).toHaveCount(2);
  // The check passes this step, so there are no manual marks.
  await expect(page.getByRole('button', { name: 'Выполнено' })).toHaveCount(0);
  const session = page.locator('.lesson-session');
  await expect(session.locator('figcaption')).toContainText('Симуляция сеанса');
  await session.scrollIntoViewIfNeeded();
  const control = session.getByRole('button');
  await expect(control).toHaveText('Пауза');
  await control.click();
  await expect(control).toHaveText('Продолжить');
  await control.click();
  await expect(control).toHaveText('Повторить', { timeout: 20_000 });
  await expect(session.locator('.session-line.is-ahead')).toHaveCount(0);
  await control.click();
  await expect(control).toHaveText('Пауза');
  await page.getByRole('button', { name: 'Скопировать' }).click();
  await expect(page.getByRole('button', { name: 'Скопировано' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('claude --permission-mode plan');
  const diagram = page.getByRole('img', { name: /^Схема:/ });
  await diagram.scrollIntoViewIfNeeded();
  await expect(diagram).toHaveAttribute('data-play', 'on');
  await expectNoOverflow(page);
  await screenshot(page, `.local/screenshots/lesson-${testInfo.project.name}.png`);
});

test('with reduced motion the session and the diagram rest finished', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/path/tasks/plan-first');
  const block = planFirst.lesson.blocks.find(item => item.type === 'session') as Extract<Block, { type: 'session' }>;
  const session = page.locator('.lesson-session');
  await expect(session.locator('.session-line')).toHaveCount(block.lines.length);
  await expect(session.locator('.session-line.is-ahead')).toHaveCount(0);
  await expect(session.getByRole('button')).toHaveCount(0);
  await expect(page.locator('.diagram')).not.toHaveAttribute('data-play');
});

test('the check explains only the chosen answers, and passing it finishes the step and moves focus on', async ({ page, context }, testInfo) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/plan-first');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  const [first, second, third] = questions;
  const submit = page.getByRole('button', { name: 'Проверить ответы' });
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('Ответьте на вопрос 1');
  await expect(option(page, first.id, first.options[0].id)).toBeFocused();
  await answer(page, { [first.id]: rightAnswers[first.id], [second.id]: [wrongOption(second.id)], [third.id]: [wrongOption(third.id)] });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await submit.click();
  const summary = page.locator('.check-summary');
  await expect(summary).toBeFocused();
  await expect(summary).toContainText(`Верно 1 из ${questions.length}`);
  const fieldsets = page.locator('.check-question');
  await expect(fieldsets.nth(0)).toHaveAttribute('data-verdict', 'right');
  await expect(fieldsets.nth(1)).toHaveAttribute('data-verdict', 'wrong');
  await expect(page.locator('.check-why')).toHaveCount(rightAnswers[first.id].length + 2);
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  expect(auth.progress.get('plan-first')?.status).toBe('in_progress');
  await screenshot(page, `.local/screenshots/check-wrong-${testInfo.project.name}.png`, '#check');
  // A changed answer loses its verdict; arrow keys move between a question's options.
  await answer(page, { [second.id]: rightAnswers[second.id] });
  await expect(fieldsets.nth(1)).not.toHaveAttribute('data-verdict');
  await option(page, third.id, third.options[1].id).focus();
  await page.keyboard.press('ArrowUp');
  await expect(option(page, third.id, third.options[0].id)).toBeChecked();
  await answer(page, rightAnswers);
  await submit.click();
  await expect(page.locator('.step-state')).toHaveText('Выполнен');
  await expect(page.getByRole('link', { name: 'Следующий шаг: 3.3 Декомпозиция на проверяемые шаги' })).toBeFocused();
  await expect(summary).toContainText('Все ответы верны');
  await expect(page.locator('.check-why')).toHaveCount(questions.reduce((sum, question) => sum + question.options.length, 0));
  await expect(submit).toHaveCount(0);
  expect(auth.progress.get('plan-first')?.status).toBe('done');
  await screenshot(page, `.local/screenshots/check-passed-${testInfo.project.name}.png`, '#check');
  // Later: the check is passed, and can be taken again.
  await page.reload();
  await expect(page.getByText('Проверка пройдена, шаг засчитан.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Уже умею — сразу к проверке' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Пройти ещё раз' }).click();
  await expect(option(page, first.id, first.options[0].id)).toBeFocused();
});

test('«Уже умею» on a step with a check goes straight to it, and a failed check keeps the answers', async ({ page, context }) => {
  const auth = await mockAuth(context, { signedIn: true });
  await page.goto('/path/tasks/plan-first');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await page.getByRole('link', { name: 'Уже умею — сразу к проверке' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Проверка' })).toBeFocused();
  await expect(page.locator('#check')).toBeInViewport();
  await answer(page, rightAnswers);
  auth.checkFails = true;
  await page.getByRole('button', { name: 'Проверить ответы' }).click();
  await expect(page.getByRole('alert')).toHaveText('Не удалось проверить ответы. Проверьте соединение и попробуйте ещё раз.');
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  for (const [question, chosen] of Object.entries(rightAnswers)) {
    for (const choice of chosen) await expect(option(page, question, choice)).toBeChecked();
  }
  auth.checkFails = false;
  await page.getByRole('button', { name: 'Проверить ответы' }).click();
  await expect(page.locator('.step-state')).toHaveText('Выполнен');
  // Back to work: a fresh, empty check, and focus on it.
  await page.getByRole('button', { name: 'Вернуть в работу' }).click();
  await expect(page.locator('.step-state')).toHaveText('В процессе');
  await expect(page.getByRole('heading', { level: 2, name: 'Проверка' })).toBeFocused();
  await expect(page.locator('#check input:checked')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Проверить ответы' })).toBeVisible();
});
