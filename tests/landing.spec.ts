import { test, expect, type Page } from '@playwright/test';
import { library } from '../content/library/index.ts';
import { findStep, stages, steps } from '../src/features/guide/catalog';
import { frameCount, heroAt, phases, sceneLength } from '../src/features/landing/introPhases';
import { nbsp } from '../src/lib/typography';
import { holdSupabaseSdk, mockAuth } from './helpers/auth';

// The page offset of a point of the opening scene's scroll progress, as sceneOffset in motion/scene.ts.
const sceneTop = (page: Page, progress: number) => page.evaluate(value => {
  const film = document.querySelector<HTMLElement>('.film')!;
  return film.offsetTop + (film.offsetHeight - innerHeight) * value;
}, progress);

const jumpTo = (page: Page, top: number) => page.evaluate(value => window.scrollTo({ top: value, behavior: 'instant' }), top);

// Jumps to a point of the opening scene's scroll progress (see introPhases.ts).
const scrollScene = async (page: Page, progress: number) => jumpTo(page, await sceneTop(page, progress));

const heroLink = (page: Page) => page.locator('.film-hero').getByRole('link', { name: 'Начать бесплатно' });

// The film frames the page asks for: the set and the index (f_001 is 0) of each request.
function watchFrames(page: Page) {
  const frames: { set: string; index: number }[] = [];
  page.on('request', request => {
    const match = /\/frames\/typing\/([\w-]+)\/f_(\d+)\.webp$/.exec(request.url());
    if (match) frames.push({ set: match[1]!, index: Number(match[2]) - 1 });
  });
  return frames;
}

const allFrames = [...Array(frameCount).keys()];
// Each frame once (the dev rebuild asks again); with `inOrder` equal to the expected list, nothing else was asked for.
const distinct = (frames: { index: number }[]) => new Set(frames.map(frame => frame.index));
const inOrder = (frames: { index: number }[]) => allFrames.filter(index => distinct(frames).has(index));

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
  const frames = watchFrames(page);
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await expect(page.locator('.film-canvas')).toHaveClass(/is-ready/);
  // The scene is as long as its timing assumes.
  expect(await page.locator('.film').evaluate((film: HTMLElement) => film.offsetHeight / innerHeight)).toBeCloseTo(sceneLength / 100, 1);
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
  expect([...new Set(frames.map(frame => frame.set))]).toEqual([set]);
});

// Before any scroll: the poster, every 16th frame and the last, where the scene rests.
const coarse = allFrames.filter(index => index % 16 === 0 || index === frameCount - 1);

test('the film fetches a coarse pass first and the rest once the reader scrolls', async ({ page }) => {
  const frames = watchFrames(page);
  await page.goto('/');
  await expect(page.locator('.film-canvas')).toHaveClass(/is-ready/);
  // The idle timer starts only once the coarse pass is in, so it cannot overtake this check.
  await expect.poll(() => distinct(frames).size).toBe(coarse.length);
  expect(inOrder(frames)).toEqual(coarse);
  await scrollScene(page, 0.05);
  await expect.poll(() => distinct(frames).size).toBe(frameCount);
});

test('a tab in the background keeps the rest of the film until it is shown', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Loading logic only.');
  await page.addInitScript(() => {
    let hidden = true;
    Object.defineProperty(document, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible' });
    Object.assign(window, { showTab: () => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); } });
  });
  const frames = watchFrames(page);
  await page.goto('/');
  await expect.poll(() => distinct(frames).size).toBe(coarse.length);
  // Well past the idle delay: still only the coarse pass.
  await page.waitForTimeout(3500);
  expect(inOrder(frames)).toEqual(coarse);
  await page.evaluate(() => (window as unknown as { showTab: () => void }).showTab());
  await expect.poll(() => distinct(frames).size, { timeout: 10_000 }).toBe(frameCount);
});

const lean = [
  ['a slow connection', () => Object.defineProperty(navigator, 'connection', { value: { effectiveType: '3g' } })],
  ['a device with little memory', () => Object.defineProperty(navigator, 'deviceMemory', { value: 2 })],
] as const;

for (const [device, emulate] of lean) {
  test(`on ${device} the film arrives without a scroll and skips every other frame`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile' && device !== 'a slow connection', 'Loading logic only.');
    await page.addInitScript(emulate);
    const frames = watchFrames(page);
    await page.goto('/');
    // A visitor who stays on the first screen gets the film after a moment; blending bridges the gaps.
    const even = allFrames.filter(index => index % 2 === 0);
    await expect.poll(() => distinct(frames).size, { timeout: 10_000 }).toBe(even.length);
    expect(inOrder(frames)).toEqual(even);
  });
}

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
  const release = await sceneTop(page, 1);
  await jumpTo(page, release - 40);
  await expect(page.locator('main')).toHaveAttribute('data-header', 'clear');
  // Past it the hero moves up under the header, which must not stay see-through.
  await jumpTo(page, release + 60);
  await expect(page.locator('main')).not.toHaveAttribute('data-header', 'clear');
  await jumpTo(page, release + 30);
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
  const frames = watchFrames(page);
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
  expect(frames.filter(frame => frame.index !== 0)).toEqual([]);
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
  const release = await holdSupabaseSdk(context);
  await page.goto('/');
  await expect(page.locator('.site-header').getByRole('link', { name: 'Войти', exact: true })).toBeVisible();
  await expect(page.getByText('Загрузка…')).toHaveCount(0);
  release();
});

test('while a sign-in completes, the header waits with the member and offers no sign-up', async ({ page, context }) => {
  await mockAuth(context);
  const release = await holdSupabaseSdk(context);
  await page.goto('/auth/callback?code=test-code');
  const header = page.locator('.site-header');
  await expect(header.getByText('Загрузка…')).toBeVisible();
  // One answer for the whole header: the account menu and the rest agree a member is arriving.
  await expect(header.getByRole('link', { name: 'Начать бесплатно' })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Роль' })).toHaveCount(0);
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
  // Header, hero, guide, library and outro; on a phone the header's one waits in the menu.
  if (testInfo.project.name === 'mobile') {
    await expect(signUps).toHaveCount(4);
    await page.getByRole('button', { name: 'Открыть меню' }).click();
  }
  await expect(signUps).toHaveCount(5);
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
  // Named as the route's own headings do: «Этап 1», the capstone with its ★.
  await expect(rows.first()).toContainText(`Этап ${stages[0]!.number}${stages[0]!.title}`);
  await expect(rows.last()).toContainText(`★${stages.at(-1)!.title}`);
  // The copy counts what members find: six stages, the capstone and every step of catalog.ts.
  await expect(page.locator('#guide .guide-copy > p')).toContainText(`Шесть этапов и выпускной проект — ${steps.length} урок`);
  await expect(page.locator('.ask-item', { hasText: 'Что внутри маршрута?' })).toContainText(`${steps.length} шаг`);
});

const kindCount = (kind: string) => String(library.filter(material => material.kind === kind).length);

test('the library section promises what members find and unlocks it by scroll', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#library');
  // The counts are the library's own: every kind of content/library/ and their total.
  await expect(section.locator('.vault-stats b')).toHaveText([kindCount('prompt'), kindCount('template'), kindCount('checklist')]);
  await expect(section.locator('.vault-count')).toContainText(`из ${library.length} открыто`);
  // Each title on the shelf is a real material, with the step that opens it.
  for (const row of await section.locator('.vault-item').all()) {
    const title = await row.locator('strong').innerText();
    const material = library.find(item => nbsp(item.title) === title);
    expect(material, title).toBeDefined();
    await expect(row.locator('.vault-step')).toHaveText(`шаг ${findStep(material!.stepId)!.label}`);
  }
  await expect(section.locator('.vault-item[data-open]')).toHaveCount(2);
  // With motion the counter runs to the whole library as the shelf scrolls past, and every material opens.
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'on');
  await section.locator('.vault-shelf').evaluate(shelf => window.scrollTo({ top: shelf.getBoundingClientRect().bottom + scrollY, behavior: 'instant' }));
  await expect(section.locator('.vault-count b')).toHaveText(String(library.length));
  await expect(section.locator('.vault-item:not([data-open])')).toHaveCount(0);
  await expect(section.locator('.vault-done')).toBeVisible();
  // The perk in the guide's list leads here.
  await expect(page.locator('#guide .guide-perks a[href="/#library"]')).toBeVisible();
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

const meta = (page: Page, property: string) => page.locator(`meta[property="${property}"]`);

test.describe('link previews and site files', () => {
  test.skip(({ isMobile }) => isMobile, 'document head and static files only');

  test('a shared link shows the title, the image and the site\'s address', async ({ page, request }) => {
    // This test server knows its origin (VITE_SITE_URL in playwright.config.ts).
    await page.goto('/');
    await expect(meta(page, 'og:title')).toHaveAttribute('content', 'Код пишет Claude. Решения — ваши.');
    await expect(meta(page, 'og:url')).toHaveAttribute('content', 'https://agentica.test/');
    await expect(meta(page, 'og:image')).toHaveAttribute('content', 'https://agentica.test/og.jpg');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const site = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}') as Record<string, string>;
    expect(site).toMatchObject({ '@type': 'WebSite', name: 'agentica', url: 'https://agentica.test/' });
    const image = await request.get('/og.jpg');
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toBe('image/jpeg');
  });

  test('without the site\'s origin the page leaves out the tags that need it', async ({ page }) => {
    await page.goto('http://localhost:4318/');
    await expect(meta(page, 'og:title')).toHaveCount(1);
    await expect(meta(page, 'og:image')).toHaveCount(0);
    await expect(meta(page, 'og:url')).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test('the manifest\'s icons exist and crawlers stay out of the members\' pages', async ({ request }) => {
    const manifest = await (await request.get('/site.webmanifest')).json() as { start_url: string; icons: { src: string }[] };
    expect(manifest.start_url).toBe('/');
    for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    const robots = await (await request.get('/robots.txt')).text();
    for (const path of ['/path', '/profile', '/login', '/auth/']) expect(robots).toContain(`Disallow: ${path}\n`);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page says that it needs JavaScript', async ({ page }) => {
    await page.goto('/');
    // Text locators skip <noscript>, hence the selector.
    const notice = page.locator('noscript > p');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Для работы agentica нужен JavaScript.');
  });
});
