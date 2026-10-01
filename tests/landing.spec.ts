import { test, expect, type Page } from '@playwright/test';
import { stages } from '../src/features/guide/catalog';
import { heroAt, phases } from '../src/features/landing/introPhases';
import { mockAuth } from './helpers/auth';

// Jumps to a point of the opening scene's scroll progress (see introPhases.ts).
async function scrollScene(page: Page, progress: number) {
  await page.evaluate(value => {
    const film = document.querySelector<HTMLElement>('.film')!;
    window.scrollTo({ top: film.offsetTop + (film.offsetHeight - innerHeight) * value, behavior: 'instant' });
  }, progress);
}

const heroLink = (page: Page) => page.locator('.film-hero').getByRole('link', { name: 'Начать бесплатно' });

test('landing loads without runtime errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('agentica — Код пишет Claude. Решения — ваши.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Код пишет Claude.');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('the opening scene tells its story line by line and resolves into the hero', async ({ page }, testInfo) => {
  const set = testInfo.project.name === 'mobile' ? 'mobile' : 'desktop';
  const sets = new Set<string>();
  page.on('request', request => {
    const match = /\/frames\/typing\/([\w-]+)\/f_\d+\.webp$/.exec(request.url());
    if (match) sets.add(match[1]);
  });
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await expect(page.locator('.film-canvas')).toHaveClass(/is-ready/);
  // Each line has the stage to itself in its own stretch of the scroll.
  const story = [
    ['hands', phases.handsOut / 2],
    ['lines', (phases.linesIn[1] + phases.linesOut) / 2],
    ['agent', (phases.agentIn + phases.agentOut) / 2],
  ] as const;
  for (const [key, progress] of story) {
    await scrollScene(page, progress);
    for (const [line] of story) await expect(page.locator(`.film-line[data-beat="${line}"]`)).toHaveCSS('opacity', line === key ? '1' : '0');
  }
  await scrollScene(page, heroAt);
  await expect(heroLink(page)).toBeInViewport();
  await expect(heroLink(page)).toHaveCSS('opacity', '1');
  // One frame set per screen: the portrait crop on phones, the 1280px set on this desktop.
  expect([...sets]).toEqual([set]);
});

test('once the hero has settled, scrolling on moves the page at once', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await scrollScene(page, heroAt);
  // The hero's last part has arrived before the scene lets go.
  await expect(page.locator('.film-hero-copy > *').last()).toHaveCSS('opacity', '1');
  const title = page.locator('.film-hero h1');
  const before = (await title.boundingBox())!.y;
  await page.evaluate(() => window.scrollBy({ top: innerHeight * 0.2, behavior: 'instant' }));
  await expect.poll(async () => before - (await title.boundingBox())!.y).toBeGreaterThan(40);
});

test('the header turns to glass the moment the opening scene lets go', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  const release = await page.evaluate(() => {
    const film = document.querySelector<HTMLElement>('.film')!;
    return film.offsetTop + film.offsetHeight - innerHeight;
  });
  const jump = (top: number) => page.evaluate(value => window.scrollTo({ top: value, behavior: 'instant' }), top);
  await jump(release - 40);
  await expect(page.locator('main')).toHaveAttribute('data-header', 'clear');
  // Past it the hero moves up under the header, which must not stay see-through.
  await jump(release + 60);
  await expect(page.locator('main')).not.toHaveAttribute('data-header', 'clear');
  await jump(release + 30);
  await expect(page.locator('main')).toHaveAttribute('data-header', 'glass');
});

test('a section opened by its link gets a solid header without waiting for a scroll', async ({ page }) => {
  // The motion layer may start after the jump to the anchor: the header must still match where the page is.
  await page.goto('/#questions');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await expect(page.locator('#questions')).toBeInViewport();
  await expect(page.locator('main')).not.toHaveAttribute('data-header', 'clear');
});

test('the terminal types as the scene scrolls and rewinds when scrolling back', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  const session = page.locator('.film .session-scene');
  const done = session.locator('.session-line', { hasText: 'Готово. Проверьте diff перед коммитом.' });
  await scrollScene(page, phases.typing[1] + 0.01);
  await expect(done).toBeVisible();
  await expect(session.locator('.session-status')).toHaveText('готово к ревью');
  await scrollScene(page, phases.typing[0] + 0.05);
  await expect(done).toBeHidden();
  await expect(session.locator('.session-status')).not.toHaveText('готово к ревью');
});

test('"Пропустить интро" brings the hero and moves focus to its call to action', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await page.getByRole('button', { name: 'Пропустить интро' }).click();
  await expect(heroLink(page)).toBeFocused();
  await expect(heroLink(page)).toBeInViewport();
  await expect(heroLink(page)).toHaveCSS('opacity', '1');
});

test('keyboard focus on the hero before it arrives brings the stage there', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await heroLink(page).focus();
  await expect(page.locator('.film')).toHaveClass(/is-hero/);
  await expect(heroLink(page)).toHaveCSS('opacity', '1');
});

test('reduced motion shows the finished session and every section in place', async ({ page }, testInfo) => {
  const frames: string[] = [];
  page.on('request', request => { if (request.url().includes('/frames/typing/')) frames.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  // The motion layer is never downloaded: no smooth scrolling, no scene; the parts simply stack.
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
  await expect(page.locator('.film-canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Пропустить интро' })).toHaveCount(0);
  await expect(page.locator('.film-line').last()).toBeVisible();
  await expect(page.locator('.scroll-meter')).toBeHidden();
  await expect(heroLink(page)).toHaveCSS('opacity', '1');
  const session = page.locator('.session-scene');
  await expect(session.locator('.session-status')).toHaveText('готово к ревью');
  await expect(session.locator('.session-log')).toContainText('Готово. Проверьте diff перед коммитом.');
  expect(await page.locator('.reveal').evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '1'))).toBe(true);
  // The still is the film's poster, and nothing darkens it without motion.
  expect(await page.locator('.film-shade').evaluate(shade => getComputedStyle(shade, '::after').opacity)).toBe('0');
  // Only the poster still is fetched: no scroll film without motion.
  expect(frames.filter(url => !url.endsWith('/f_001.webp'))).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `.local/screenshots/${testInfo.project.name}-viewport.png` });
  await page.screenshot({ path: `.local/screenshots/${testInfo.project.name}.png`, fullPage: true });
});

test('the poster shows while the motion layer is still on its way', async ({ page, context }) => {
  // Never answered: the page stays in its first, pending state.
  await context.route(/LandingMotion/, () => {});
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'pending');
  expect(await page.locator('.film-shade').evaluate(shade => getComputedStyle(shade, '::after').opacity)).toBe('0');
});

test('the motion layer starts, with smooth scrolling for wheel and trackpad only', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  if (testInfo.project.name === 'mobile') {
    // Touch keeps the platform's own momentum.
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
    return;
  }
  await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  await page.mouse.move(720, 500);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
});

test('headings keep their full names while their lines are split for the entrance', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await expect(page.locator('#skills-title .split-line')).not.toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Агент печатает. Вы — думаете.' })).toBeAttached();
  await expect(page.getByRole('heading', { level: 1, name: 'Код пишет Claude. Решения — ваши.' })).toBeAttached();
});

test('section links glide below the header, also when followed a second time', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'The mobile menu path is covered by the navigation test.');
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  const offset = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  const gap = () => page.locator('#how').evaluate((element, expected) => Math.abs(element.getBoundingClientRect().top - expected), offset);
  const link = page.getByRole('navigation').getByRole('link', { name: 'Путь' });
  await link.click();
  await expect.poll(gap, { timeout: 8000 }).toBeLessThan(4);
  // Back to the top once the glide has settled (a jump during it would be overridden), at the worst
  // moment: the smooth scroller skips the scroll event after its last step, so the next glide has to
  // start from the page's position rather than the one it remembers.
  await page.evaluate(() => new Promise<void>(resolve => {
    const root = document.documentElement;
    const jump = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      resolve();
    };
    if (!root.classList.contains('lenis-scrolling')) {
      jump();
      return;
    }
    new MutationObserver((_, observer) => {
      if (root.classList.contains('lenis-scrolling')) return;
      observer.disconnect();
      jump();
    }).observe(root, { attributeFilter: ['class'] });
  }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await link.click();
  await expect.poll(gap, { timeout: 8000 }).toBeLessThan(4);
});

test('an open dialog keeps the page still under the wheel', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Wheel scrolling is a desktop gesture.');
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  await page.locator('.outro').getByRole('button', { name: 'Готовые запросы для старта' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(720, 150);
  await page.mouse.wheel(0, 1200);
  // Longer than a smooth scroll needs to visibly move the page.
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('role comparison sweeps on its own and keeps going under hover or a tap', async ({ page }, testInfo) => {
  await page.goto('/#why');
  const stage = page.locator('.shift-stage');
  const split = () => stage.evaluate(element => parseFloat(element.style.getPropertyValue('--split')));
  await stage.scrollIntoViewIfNeeded();
  if (testInfo.project.name === 'mobile') await stage.tap();
  else await stage.hover();
  const before = await split();
  await expect.poll(split, { timeout: 6000 }).not.toBe(before);
  await expect(page.getByRole('button', { name: /анимацию/ })).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
});

test('reduced motion keeps the role comparison still and clear of the new column', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#why');
  const stage = page.locator('.shift-stage');
  const split = () => stage.evaluate(element => parseFloat(element.style.getPropertyValue('--split')));
  await stage.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const resting = await split();
  expect(resting).toBeGreaterThanOrEqual(40);
  await page.waitForTimeout(1000);
  expect(await split()).toBe(resting);
  // The rest position never covers a "Стало" line.
  expect(await stage.evaluate(element => {
    const border = element.querySelector('.shift-handle')!.getBoundingClientRect();
    const text = document.createRange();
    return [...element.querySelectorAll('.shift-after .shift-title, .shift-after li')].every(node => {
      text.selectNodeContents(node);
      return text.getBoundingClientRect().left > border.right;
    });
  })).toBe(true);
});

test('a guest sees «Войти» at once, while the auth SDK is still loading', async ({ page, context }) => {
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  // Matches the SDK module in both pre-bundled and raw form, as in auth.spec.ts.
  await context.route(/@supabase[_/]supabase-js/, async route => { await released; await route.continue(); });
  await page.goto('/');
  await expect(page.locator('.site-header').getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
  await expect(page.getByText('Загрузка…')).toHaveCount(0);
  release();
});

test('sign-up calls to action lead through Google sign-in to the route', async ({ page, context }) => {
  await mockAuth(context);
  await page.goto('/');
  await page.locator('#guide').getByRole('link', { name: 'Начать бесплатно' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fpath$/);
  // The address changes first and the login page follows its chunk and page transition; going back
  // before it shows would only cancel the navigation, leaving the landing scrolled down at #guide.
  await expect(page.getByRole('button', { name: 'Продолжить с Google' })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: 'Пропустить интро' }).click();
  await heroLink(page).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fpath$/);
  await page.getByRole('button', { name: 'Продолжить с Google' }).click();
  await expect(page).toHaveURL('http://localhost:4317/path');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('От клавиатуры');
});

test('a call to action grows into the login card, while section links move without a page transition', async ({ page, context }) => {
  await mockAuth(context);
  // Counts the view transitions React starts.
  await page.addInitScript(() => {
    const counter = window as unknown as { transitions: number };
    counter.transitions = 0;
    const start = document.startViewTransition?.bind(document);
    if (start) document.startViewTransition = ((...args: Parameters<typeof start>) => { counter.transitions++; return start(...args); }) as typeof start;
  });
  const transitions = () => page.evaluate(() => (window as unknown as { transitions: number }).transitions);
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  if (test.info().project.name === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Вопросы' }).click();
  await expect(page).toHaveURL(/#questions$/);
  expect(await transitions()).toBe(0);
  await page.locator('#guide').getByRole('link', { name: 'Начать бесплатно' }).click();
  await expect(page.locator('.login-card')).toBeVisible();
  expect(await transitions()).toBeGreaterThan(0);
});

test('questions open one answer at a time from the keyboard', async ({ page }) => {
  await page.goto('/#questions');
  const items = page.locator('.ask-item');
  await expect(items.first()).toHaveAttribute('open', '');
  await items.nth(1).locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(items.nth(1)).toHaveAttribute('open', '');
  await expect(items.first()).not.toHaveAttribute('open', '');
  await expect(page.getByText('Инструмент Anthropic для агентной разработки', { exact: false })).toBeVisible();
});

test('starter dialog supports keyboard tabs, copying and Escape', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const trigger = page.locator('.outro').getByRole('button', { name: 'Готовые запросы для старта' });
  await trigger.click();
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
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('navigation reaches its destination and mobile menu closes', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Роль' }).click();
  await expect(page).toHaveURL(/#why$/);
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('navigation')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute('aria-expanded', 'false');
  }
});

test('every sign-up call to action has one label and leads to sign-in', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText(/Начать с агентами|Получить доступ|Зарегистрироваться/)).toHaveCount(0);
  const signUps = page.getByRole('link', { name: 'Начать бесплатно' });
  // Header, hero, guide and outro; on a phone the header's one waits in the menu.
  if (testInfo.project.name === 'mobile') {
    await expect(signUps).toHaveCount(3);
    await page.getByRole('button', { name: 'Открыть меню' }).click();
  }
  await expect(signUps).toHaveCount(4);
  for (const link of await signUps.all()) await expect(link).toHaveAttribute('href', '/login?next=%2Fpath');
  // The ready prompts stay as the outro's secondary action; «Вопросы» is a plain link without a dropdown's chevron.
  await expect(page.locator('.outro').getByRole('button', { name: 'Готовые запросы для старта' })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Вопросы' }).locator('svg')).toHaveCount(0);
  // The sign-in page is where they all lead, so its header has none.
  await page.goto('/login');
  await expect(page.locator('.site-header').getByRole('link', { name: 'Начать бесплатно' })).toHaveCount(0);
});

test('the landing speaks of what is inside today and lists the route\'s stages', async ({ page }) => {
  await page.goto('/');
  // Nothing «soon»: the guide's structure and progress already work for members.
  await expect(page.getByText(/Скоро|готовится|после выхода|как только он выйдет/)).toHaveCount(0);
  const rows = page.locator('#guide .guide-stages > li');
  await expect(rows).toHaveCount(stages.length);
  await expect(rows.first()).toContainText(stages[0]!.title);
  await expect(rows.last()).toContainText(stages.at(-1)!.title);
});

test('the header marks the section being read', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  const link = (id: string) => page.locator(`.main-nav a[href="/#${id}"]`);
  await page.evaluate(() => document.getElementById('questions')!.scrollIntoView({ behavior: 'instant' }));
  await expect(link('questions')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.main-nav a[aria-current]')).toHaveCount(1);
  await page.evaluate(() => document.getElementById('skills')!.scrollIntoView({ behavior: 'instant' }));
  await expect(link('skills')).toHaveAttribute('aria-current', 'true');
  await expect(link('questions')).not.toHaveAttribute('aria-current');
});
