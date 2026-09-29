import type { BrowserContext, Request, Route } from '@playwright/test';

const userId = '34ae3545-ae23-41b1-a2c1-8292e58ba0dc';
const storageKey = 'sb-agentica-test-auth-token';

export type ProgressRow = { user_id: string; step_id: string; status: 'in_progress' | 'done' | 'skipped'; updated_at: string };
const stepBody = 'Закрытый текст шага для участников.\n\nВторой абзац с заданием.';

// The server's clock: every write is a second later than the one before, as in «last opened».
let clock = Date.now();
const stamp = () => new Date(clock += 1000).toISOString();

function createState() {
  const progress = new Map<string, ProgressRow>();
  return {
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'developer@example.com',
      email_confirmed_at: '2026-09-24T00:00:00Z',
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: 'Тестовый Разработчик', avatar_url: null },
      created_at: '2026-09-24T00:00:00Z',
    },
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
    dataExpired: false,
    seed(stepId: string, status: ProgressRow['status']) {
      progress.set(stepId, { user_id: userId, step_id: stepId, status, updated_at: stamp() });
    },
  };
}

export type FixtureState = ReturnType<typeof createState>;

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
      await rows(route, request, stepFilter(url) ? [{ body: stepBody }] : []);
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
    } else if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'pkce') {
        state.exchangeCount += 1;
        const body = request.postDataJSON();
        if (state.badCode || body.auth_code !== 'fixture-one-time-code' || !body.code_verifier) {
          await json(route, { error_code: 'bad_code_verifier', msg: 'Invalid code' }, 400);
          return;
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
