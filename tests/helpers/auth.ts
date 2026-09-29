import type { BrowserContext, Route } from '@playwright/test';

const userId = '34ae3545-ae23-41b1-a2c1-8292e58ba0dc';
const storageKey = 'sb-agentica-test-auth-token';

export async function mockAuth(context: BrowserContext, options: { signedIn?: boolean; expired?: boolean } = {}) {
  const state = {
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
  };

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

  async function json(route: Route, body: unknown, status = 200) {
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  }

  await context.route('https://agentica-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/auth/v1/authorize') {
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
