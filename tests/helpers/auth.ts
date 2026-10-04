import type { BrowserContext, Request, Route } from '@playwright/test';
import { lessons } from '../../content/guide/index.ts';
import { compileLesson } from '../../scripts/guideContent.ts';
import { library } from '../../content/library/index.ts';
import { compileLibrary } from '../../scripts/libraryContent.ts';

const userId = '34ae3545-ae23-41b1-a2c1-8292e58ba0dc';
const storageKey = 'sb-agentica-test-auth-token';

export type ProgressRow = { user_id: string; step_id: string; status: 'in_progress' | 'done' | 'skipped'; updated_at: string };
// The written lessons as the server holds them: what members read and the keys only it sees.
// A step missing from content/guide would get `null` (the placeholder).
export const published = new Map(lessons.map(source => [source.stepId, compileLesson(source)]));
// The library as published: every title, and bodies the server hands out per passed step.
export const materials = compileLibrary(library);

// The server's clock: every write is a second later than the one before, as in «last opened».
let clock = Date.now();
const stamp = () => new Date(clock += 1000).toISOString();

function accountUser(email: string, provider: 'google' | 'email', metadata: Record<string, unknown>) {
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: '2026-09-24T00:00:00Z' as string | null,
    app_metadata: { provider, providers: [provider] },
    user_metadata: metadata,
    created_at: '2026-09-24T00:00:00Z',
  };
}

function createState() {
  const progress = new Map<string, ProgressRow>();
  return {
    // Signed in through Google, until a password sign-in or sign-up switches the account.
    user: accountUser('developer@example.com', 'google', { full_name: 'Тестовый Разработчик', avatar_url: null }),
    // Email and password accounts by address. `confirmEmail`: sign-up waits for the letter's link.
    accounts: new Map<string, { password: string; name: string; confirmed: boolean }>(),
    confirmEmail: false,
    // The address of the latest letter; its link's code exchange confirms and signs in that account.
    letter: null as string | null,
    resendCount: 0,
    resendLimited: false,
    // SMTP down: GoTrue's 500 on sign-up with confirmations on.
    letterFails: false,
    exchangeCount: 0,
    refreshCount: 0,
    authorizeUrl: '',
    updateFails: false,
    denied: false,
    badCode: false,
    logoutFails: false,
    refreshFails: false,
    // The route's data (guide_progress, open_guide_step, guide_steps), shared by every context of a test.
    progress,
    dataRequests: 0,
    loadFails: false,
    saveFails: false,
    bodyFails: false,
    checkFails: false,
    libraryFails: false,
    dataExpired: false,
    seed(stepId: string, status: ProgressRow['status']) {
      progress.set(stepId, { user_id: userId, step_id: stepId, status, updated_at: stamp() });
    },
  };
}

export type FixtureState = ReturnType<typeof createState>;

// The lazily loaded Supabase SDK module, pre-bundled (@supabase_supabase-js) or raw (@supabase/supabase-js).
export const supabaseSdk = /@supabase[_/]supabase-js/;

// Holds the SDK module back, as on a slow first visit, until the returned function is called.
export async function holdSupabaseSdk(context: BrowserContext) {
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  await context.route(supabaseSdk, async route => { await released; await route.continue(); });
  return release;
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

// PostgREST answers `.single()` (object Accept header) with one object, or 406 without exactly one row.
async function rows(route: Route, request: Request, found: unknown[]) {
  if (!request.headers().accept?.includes('vnd.pgrst.object')) await json(route, found);
  else if (found.length === 1) await json(route, found[0]);
  else await json(route, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, 406);
}

// `?step_id=eq.plan-first` → 'plan-first'.
const stepFilter = (url: URL) => url.searchParams.get('step_id')?.replace(/^eq\./, '');

// Pass `state` from an earlier call to share one account between contexts, like a second device.
export async function mockAuth(context: BrowserContext, options: { signedIn?: boolean; expired?: boolean; state?: FixtureState } = {}) {
  const state = options.state ?? createState();

  function session(expired = false) {
    const expiresAt = Math.floor(Date.now() / 1000) + (expired ? -120 : 3600);
    const token = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: expiresAt })).toString('base64url'),
      'not-a-real-signature',
    ].join('.');
    return { access_token: token, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user: state.user };
  }

  if (options.signedIn) {
    await context.addInitScript(({ key, initialSession }) => {
      if (!localStorage.getItem('agentica.fixture.seeded')) {
        localStorage.setItem(key, JSON.stringify(initialSession));
        localStorage.setItem('agentica.fixture.seeded', 'true');
      }
    }, { key: storageKey, initialSession: session(options.expired) });
  }

  async function data(route: Route, request: Request, url: URL) {
    state.dataRequests += 1;
    if (state.dataExpired) { await json(route, { code: 'PGRST301', message: 'JWT expired' }, 401); return; }
    if (!request.headers().authorization?.startsWith('Bearer ey')) { await json(route, { message: 'Not authorized' }, 401); return; }
    const method = request.method();
    if (url.pathname === '/rest/v1/guide_progress' && method === 'GET') {
      if (state.loadFails) { await json(route, { message: 'Database unavailable' }, 503); return; }
      const step = stepFilter(url);
      await rows(route, request, [...state.progress.values()].filter(row => !step || row.step_id === step));
    } else if (url.pathname === '/rest/v1/guide_progress' && method === 'POST') {
      if (state.saveFails) { await json(route, { message: 'Database unavailable' }, 503); return; }
      const { step_id: stepId, status } = request.postDataJSON() as Pick<ProgressRow, 'step_id' | 'status'>;
      // Like the RLS policy: a step with a check is passed only by the check.
      if (status !== 'in_progress' && published.get(stepId)?.key) { await json(route, { code: '42501', message: 'new row violates row-level security policy' }, 403); return; }
      state.seed(stepId, status);
      await rows(route, request, [state.progress.get(stepId)]);
    } else if (url.pathname === '/rest/v1/rpc/open_guide_step') {
      const { step } = request.postDataJSON() as { step: string };
      const existing = state.progress.get(step);
      // Like the SQL function: a finished step stays finished.
      if (existing && existing.status !== 'in_progress') { await json(route, []); return; }
      state.seed(step, 'in_progress');
      await json(route, [state.progress.get(step)]);
    } else if (url.pathname === '/rest/v1/guide_steps' && method === 'GET') {
      if (state.bodyFails) { await json(route, { message: 'Database unavailable' }, 503); return; }
      const step = stepFilter(url);
      await rows(route, request, step ? [{ lesson: published.get(step)?.lesson ?? null }] : []);
    } else if (url.pathname === '/rest/v1/library_items' && method === 'GET') {
      if (state.libraryFails) { await json(route, { message: 'Database unavailable' }, 503); return; }
      await json(route, materials.map(({ item }) => item));
    } else if (url.pathname === '/rest/v1/library_bodies' && method === 'GET') {
      if (state.libraryFails) { await json(route, { message: 'Database unavailable' }, 503); return; }
      // Like the RLS policy: a body opens once its step is done or marked «Уже умею».
      const passed = (stepId: string) => ['done', 'skipped'].includes(state.progress.get(stepId)?.status ?? '');
      await json(route, materials.filter(({ item }) => passed(item.step_id)).map(({ body }) => body));
    } else if (url.pathname === '/rest/v1/rpc/submit_guide_check') {
      if (state.checkFails) { await json(route, { message: 'Database unavailable' }, 503); return; }
      const { step, answers } = request.postDataJSON() as { step: string; answers: Record<string, string[]> };
      const key = published.get(step)?.key;
      if (!key) { await json(route, { code: '22023', message: `Step ${step} has no check` }, 400); return; }
      // Like the SQL function: explanations for the chosen options, for all of them once every answer is right.
      const graded = Object.entries(key).map(([id, { correct, why }]) => {
        const chosen = [...new Set(answers[id] ?? [])].toSorted();
        return { id, why, chosen, right: chosen.join() === correct.toSorted().join() };
      });
      const passed = graded.every(question => question.right);
      const questions = Object.fromEntries(graded.map(({ id, why, chosen, right }) => [id, {
        correct: right,
        why: passed ? why : Object.fromEntries(chosen.map(option => [option, why[option]])),
      }]));
      if (!passed) { await json(route, { passed, questions }); return; }
      state.seed(step, 'done');
      const row = state.progress.get(step)!;
      await json(route, { passed, questions, progress: { status: row.status, updated_at: row.updated_at } });
    } else {
      await json(route, { message: `Unexpected fixture endpoint: ${method} ${url.pathname}` }, 501);
    }
  }

  await context.route('https://agentica-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/rest/v1/')) {
      await data(route, request, url);
    } else if (url.pathname === '/auth/v1/authorize') {
      state.authorizeUrl = url.href;
      const callback = new URL(url.searchParams.get('redirect_to')!);
      if (state.denied) callback.searchParams.set('error', 'access_denied');
      else callback.searchParams.set('code', 'fixture-one-time-code');
      await route.fulfill({ status: 302, headers: { location: callback.href } });
    } else if (url.pathname === '/auth/v1/signup') {
      const { email, password, data: metadata } = request.postDataJSON() as { email: string; password: string; data: { display_name: string } };
      if (state.accounts.has(email) || email === state.user.email) {
        await json(route, { error_code: 'user_already_exists', msg: 'User already registered' }, 422);
        return;
      }
      if (state.confirmEmail && state.letterFails) {
        await json(route, { error_code: 'unexpected_failure', msg: 'Error sending confirmation email' }, 500);
        return;
      }
      state.accounts.set(email, { password, name: metadata.display_name, confirmed: !state.confirmEmail });
      const user = accountUser(email, 'email', metadata);
      // Like GoTrue: with confirmations on, a letter and the unconfirmed user alone, no session.
      if (state.confirmEmail) { state.letter = email; await json(route, { ...user, email_confirmed_at: null }); return; }
      state.user = user;
      await json(route, session());
    } else if (url.pathname === '/auth/v1/resend') {
      if (state.resendLimited) { await json(route, { error_code: 'over_email_send_rate_limit', msg: 'Email rate limit exceeded' }, 429); return; }
      state.resendCount += 1;
      state.letter = (request.postDataJSON() as { email: string }).email;
      await json(route, {});
    } else if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password') {
        const { email, password } = request.postDataJSON() as { email: string; password: string };
        const account = state.accounts.get(email);
        if (account?.password !== password) {
          await json(route, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
          return;
        }
        if (!account.confirmed) { await json(route, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, 400); return; }
        state.user = accountUser(email, 'email', { display_name: account.name });
      } else if (url.searchParams.get('grant_type') === 'pkce') {
        state.exchangeCount += 1;
        const body = request.postDataJSON();
        if (state.badCode || body.auth_code !== 'fixture-one-time-code' || !body.code_verifier) {
          await json(route, { error_code: 'bad_code_verifier', msg: 'Invalid code' }, 400);
          return;
        }
        // A letter's link: the account is confirmed and signed in.
        const account = state.letter ? state.accounts.get(state.letter) : undefined;
        if (state.letter && account) {
          account.confirmed = true;
          state.user = accountUser(state.letter, 'email', { display_name: account.name });
          state.letter = null;
        }
      } else {
        state.refreshCount += 1;
        if (state.refreshFails) {
          await json(route, { code: 'refresh_token_not_found', message: 'Refresh token not found' }, 400);
          return;
        }
      }
      await json(route, session());
    } else if (url.pathname === '/auth/v1/user') {
      if (request.method() === 'PUT') {
        if (state.updateFails) { await json(route, { msg: 'Unable to save' }, 500); return; }
        state.user.user_metadata = { ...state.user.user_metadata, ...request.postDataJSON().data };
      }
      await json(route, state.user);
    } else if (url.pathname === '/auth/v1/logout') {
      if (state.logoutFails) await json(route, { message: 'Server unavailable' }, 503);
      else await route.fulfill({ status: 204 });
    } else {
      await json(route, { message: `Unexpected fixture endpoint: ${url.pathname}` }, 501);
    }
  });
  return state;
}
