import { test, expect } from '@playwright/test';
import { stages, steps } from '../src/features/guide/catalog';
import { mockAuth } from './helpers/auth';
import { expectNoOverflow, settle } from './helpers/page';

test('the catalog has eight stages and 35 steps with unique ids', () => {
  expect(stages).toHaveLength(8);
  expect(steps).toHaveLength(35);
  expect(new Set(steps.map(step => step.id)).size).toBe(35);
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
  await expect(page.getByRole('link', { name: 'Начать маршрут: 0.1 Ваш опыт и стек' })).toHaveCount(2);
  await expect(page.locator('.stage-meter > li')).toHaveCount(8);
  await expectNoOverflow(page);
  await settle(page);
  await page.screenshot({ path: `.local/screenshots/cabinet-${testInfo.project.name}.png`, fullPage: true });
  await page.locator('.cabinet').getByRole('link', { name: 'Начать маршрут: 0.1 Ваш опыт и стек' }).click();
  await expect(page).toHaveURL(/\/path\/start\/experience$/);
  await expect(page).toHaveTitle('agentica — 0.1 Ваш опыт и стек');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(header.getByRole('link', { name: 'Маршрут' })).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
});

test('the route lists every stage and step, and its stage links move focus to the stage', async ({ page, context }, testInfo) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/path');
  await expect(page).toHaveTitle('agentica — Маршрут');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('От клавиатуры к оркестровке.');
  await expect(page.locator('.stage-card')).toHaveCount(8);
  await expect(page.locator('.step-row')).toHaveCount(35);
  await expect(page.getByRole('link', { name: '0.1 Ваш опыт и стек Не начат' })).toHaveAttribute('aria-current', 'step');
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
  await page.goto('/path/start/experience');
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
});

test('a guest following a link to a step signs in and lands on that step', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/path/review/read-diff');
  await expect(page).toHaveURL(/\/login\?next=%2Fpath%2Freview%2Fread-diff$/);
  await expect(page.getByRole('heading', { name: 'Чтение diff, написанного не вами' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/path/review/read-diff');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Чтение diff, написанного не вами');
});

test('the members header continues the route and the brand leads to the cabinet', async ({ page, context }) => {
  await mockAuth(context, { signedIn: true });
  await page.goto('/profile');
  await page.getByRole('link', { name: 'Начать маршрут: 0.1 Ваш опыт и стек' }).click();
  await expect(page).toHaveURL(/\/path\/start\/experience$/);
  await page.getByRole('link', { name: 'agentica — на главную' }).click();
  await expect(page).toHaveURL('http://localhost:4317/');
  await expect(page).toHaveTitle('agentica — Кабинет');
});
