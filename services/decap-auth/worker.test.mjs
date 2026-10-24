import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from './worker.mjs';

const env = { SITE_ORIGIN: 'https://zhongzhengli13.github.io', GITHUB_REPO: 'zhongzhengli13/zhongzhengli13.github.io', ALLOWED_USER: 'zhongzhengli13', GITHUB_OAUTH_ID: 'test-client', GITHUB_OAUTH_SECRET: 'test-secret' };
const authURL = 'https://auth.example/auth?provider=github&site_id=zhongzhengli13.github.io';
afterEach(() => mock.restoreAll());

async function flow() {
    const start = await worker.fetch(new Request(authURL), env);
    const target = new URL(start.headers.get('Location'));
    const cookie = start.headers.get('Set-Cookie').split(';')[0];
    return { start, target, cookie, callback: new Request(`https://auth.example/callback?code=test-code&state=${target.searchParams.get('state')}`, { headers: { Cookie: cookie } }) };
}

function github({ login = 'zhongzhengli13', push = true, exchangeOK = true } = {}) {
    return mock.method(globalThis, 'fetch', async (url, options) => {
        if (url === 'https://github.com/login/oauth/access_token') {
            const body = JSON.parse(options.body);
            assert.equal(body.client_secret, 'test-secret');
            assert.equal(body.redirect_uri, 'https://auth.example/callback');
            assert.match(body.code_verifier, /^[\w-]{43}$/);
            return Response.json(exchangeOK ? { access_token: 'test-access-token' } : { error: 'bad_verification_code' });
        }
        assert.equal(options.headers.Authorization, 'Bearer test-access-token');
        if (url === 'https://api.github.com/user') return Response.json({ login });
        if (url === 'https://api.github.com/repos/zhongzhengli13/zhongzhengli13.github.io') return Response.json({ permissions: { push } });
        throw new Error('Unexpected network call');
    });
}

test('missing secrets are reported without starting an invalid OAuth flow', async () => {
    const response = await worker.fetch(new Request('https://auth.example/health'), { ...env, GITHUB_OAUTH_SECRET: '' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ready, false);
    assert.equal((await worker.fetch(new Request(authURL), { ...env, GITHUB_OAUTH_ID: '' })).status, 503);
});

test('only the configured site, provider and methods can start login', async () => {
    assert.equal((await worker.fetch(new Request(authURL.replace('zhongzhengli13.github.io', 'other.example')), env)).status, 403);
    assert.equal((await worker.fetch(new Request(authURL.replace('provider=github', 'provider=gitlab')), env)).status, 400);
    assert.equal((await worker.fetch(new Request(authURL, { method: 'POST' }), env)).status, 405);
    assert.equal((await worker.fetch(new Request('https://auth.example/unknown'), env)).status, 404);
});

test('login binds unpredictable state and PKCE to a secure HttpOnly cookie', async () => {
    const { start, target, cookie } = await flow();
    assert.equal(start.status, 302);
    assert.equal(target.origin, 'https://github.com');
    assert.equal(target.searchParams.get('scope'), 'public_repo');
    assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
    assert.match(start.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
    assert.match(target.searchParams.get('state'), /^[\w-]{43}$/);
    const verifier = cookie.split('.')[1];
    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url');
    assert.equal(target.searchParams.get('code_challenge'), digest);
    assert.equal(start.headers.get('Cache-Control'), 'no-store');
});

test('a missing or mismatched state is rejected before any token exchange', async () => {
    const calls = mock.method(globalThis, 'fetch', () => { throw new Error('Network must not be called'); });
    const { callback } = await flow();
    const wrong = new URL(callback.url); wrong.searchParams.set('state', 'wrong');
    assert.equal((await worker.fetch(new Request(wrong, { headers: callback.headers }), env)).status, 400);
    assert.equal((await worker.fetch(new Request(callback.url), env)).status, 400);
    assert.equal(calls.mock.callCount(), 0);
});

test('successful login returns a token only to the configured CMS opener', async () => {
    const calls = github();
    const { callback } = await flow();
    const response = await worker.fetch(callback, env);
    assert.equal(response.status, 200);
    assert.equal(calls.mock.callCount(), 3);
    assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
    assert.match(response.headers.get('Content-Security-Policy'), /default-src 'none'/);
    const html = await response.text();
    const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
    const messages = [];
    const listeners = new Map();
    const opener = { postMessage: (data, origin) => messages.push({ data, origin }) };
    const window = { opener, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name), close() {} };
    vm.runInNewContext(script, { window, setTimeout() {} });
    assert.deepEqual(messages, [{ data: 'authorizing:github', origin: env.SITE_ORIGIN }]);
    listeners.get('message')({ origin: 'https://evil.example', source: opener, data: 'authorizing:github' });
    listeners.get('message')({ origin: env.SITE_ORIGIN, source: {}, data: 'authorizing:github' });
    assert.equal(messages.length, 1);
    listeners.get('message')({ origin: env.SITE_ORIGIN, source: opener, data: 'authorizing:github' });
    assert.equal(messages.length, 2);
    assert.equal(messages[1].origin, env.SITE_ORIGIN);
    assert.match(messages[1].data, /^authorization:github:success:/);
    assert.equal(JSON.parse(messages[1].data.slice('authorization:github:success:'.length)).token, 'test-access-token');
});

test('another GitHub account cannot receive an editor session', async () => {
    const calls = github({ login: 'another-user' });
    const { callback } = await flow();
    const response = await worker.fetch(callback, env);
    assert.equal(response.status, 403);
    assert.equal(calls.mock.callCount(), 2);
    assert(!((await response.text()).includes('test-access-token')));
});

test('a repo without push permission cannot receive an editor session', async () => {
    github({ push: false });
    const { callback } = await flow();
    assert.equal((await worker.fetch(callback, env)).status, 403);
});

test('GitHub failures and declined consent clear the cookie without exposing secrets', async () => {
    github({ exchangeOK: false });
    const { callback } = await flow();
    const response = await worker.fetch(callback, env);
    assert.equal(response.status, 502);
    const text = await response.text();
    assert(!text.includes('test-secret') && !text.includes('test-access-token'));
    const denied = new URL(callback.url); denied.searchParams.set('error', 'access_denied');
    assert.equal((await worker.fetch(new Request(denied, { headers: callback.headers }), env)).status, 400);
});
