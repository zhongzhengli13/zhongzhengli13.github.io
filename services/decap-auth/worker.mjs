const COOKIE = '__Host-decap-oauth';
const BASE_HEADERS = {
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
};

const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const clearCookie = () => cookie('', 0);
const respond = (text, status = 200, extra = {}) => new Response(text, { status, headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...extra } });
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function settings(env) {
    const origin = new URL(env.SITE_ORIGIN);
    if (origin.protocol !== 'https:' || origin.origin !== env.SITE_ORIGIN) throw new Error('Invalid site origin');
    if (!/^[\w-]+\/[\w.-]+$/.test(env.GITHUB_REPO || '') || !/^[\w-]+$/.test(env.ALLOWED_USER || '')) throw new Error('Invalid GitHub settings');
    return { origin: origin.origin, hostname: origin.hostname };
}

function callbackPage(token, origin) {
    const nonce = randomString();
    const payload = `authorization:github:success:${JSON.stringify({ token, provider: 'github' })}`;
    return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex"><title>GitHub 登录完成</title><body><p id="status">登录完成，正在返回随笔编辑器…</p><script nonce="${nonce}">
(() => {
    const origin = ${safeJSON(origin)};
    const opener = window.opener;
    if (!opener) { document.getElementById('status').textContent = '请从随笔编辑器的登录按钮重新打开本页面。'; return; }
    const receive = event => {
        if (event.origin !== origin || event.source !== opener || event.data !== 'authorizing:github') return;
        opener.postMessage(${safeJSON(payload)}, origin);
        window.removeEventListener('message', receive);
        setTimeout(() => window.close(), 150);
    };
    window.addEventListener('message', receive);
    opener.postMessage('authorizing:github', origin);
})();
</script></body></html>`, {
        headers: {
            ...BASE_HEADERS,
            'Content-Type': 'text/html; charset=utf-8',
            'Set-Cookie': clearCookie(),
            'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`
        }
    });
}

async function beginAuth(request, env, site) {
    const url = new URL(request.url);
    if (url.searchParams.get('provider') !== 'github') return respond('仅支持 GitHub 登录。', 400);
    if (url.searchParams.get('site_id') !== site.hostname) return respond('此认证服务仅供本站编辑器使用。', 403);
    const state = randomString();
    const verifier = randomString();
    const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.search = new URLSearchParams({
        client_id: env.GITHUB_OAUTH_ID,
        redirect_uri: `${url.origin}/callback`,
        scope: 'public_repo',
        state,
        login: env.ALLOWED_USER,
        allow_signup: 'false',
        code_challenge: challenge,
        code_challenge_method: 'S256'
    }).toString();
    return new Response(null, { status: 302, headers: { ...BASE_HEADERS, Location: authorize.href, 'Set-Cookie': cookie(`${state}.${verifier}`, 600) } });
}

async function finishAuth(request, env, site) {
    const url = new URL(request.url);
    const saved = (request.headers.get('Cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
    const [savedState, verifier] = (saved ? saved.slice(COOKIE.length + 1) : '').split('.');
    const state = url.searchParams.get('state');
    if (!state || !savedState || state !== savedState || !/^[\w-]{43}$/.test(verifier || '')) {
        return respond('登录请求已失效，请返回编辑器重新登录。', 400, { 'Set-Cookie': clearCookie() });
    }
    if (url.searchParams.has('error')) return respond('GitHub 授权已取消，请返回编辑器重试。', 400, { 'Set-Cookie': clearCookie() });
    const code = url.searchParams.get('code');
    if (!code) return respond('缺少 GitHub 授权码。', 400, { 'Set-Cookie': clearCookie() });

    const exchange = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_OAUTH_ID, client_secret: env.GITHUB_OAUTH_SECRET, code, redirect_uri: `${url.origin}/callback`, code_verifier: verifier }),
        signal: AbortSignal.timeout(10000)
    });
    if (!exchange.ok) throw new Error('Token exchange failed');
    const token = await exchange.json();
    if (typeof token.access_token !== 'string' || !token.access_token || token.error) throw new Error('Invalid access token');
    const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'ZhongzhengLi-Decap-Auth', 'X-GitHub-Api-Version': '2022-11-28' };
    const profileResponse = await fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(10000) });
    if (!profileResponse.ok) throw new Error('User lookup failed');
    const profile = await profileResponse.json();
    if (typeof profile.login !== 'string' || profile.login.toLowerCase() !== env.ALLOWED_USER.toLowerCase()) {
        return respond('此编辑器仅允许网站所有者登录。', 403, { 'Set-Cookie': clearCookie() });
    }
    const repoResponse = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!repoResponse.ok || !(await repoResponse.json()).permissions?.push) {
        return respond('当前账号没有网站仓库的写入权限。', 403, { 'Set-Cookie': clearCookie() });
    }
    return callbackPage(token.access_token, site.origin);
}

export default {
    async fetch(request, env) {
        try {
            const site = settings(env);
            const url = new URL(request.url);
            if (request.method !== 'GET') return respond('Method not allowed', 405, { Allow: 'GET' });
            const ready = Boolean(env.GITHUB_OAUTH_ID && env.GITHUB_OAUTH_SECRET);
            if (url.pathname === '/' || url.pathname === '/health') {
                return new Response(JSON.stringify({ service: 'zhongzhengli-decap-auth', ready, site: site.origin }), { status: ready ? 200 : 503, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json' } });
            }
            if (!['/auth', '/callback'].includes(url.pathname)) return respond('Not found', 404);
            if (!ready) return respond('GitHub 登录服务正在配置中，请稍后再试。', 503);
            if (url.pathname === '/auth') return await beginAuth(request, env, site);
            return await finishAuth(request, env, site);
        } catch {
            return respond('GitHub 登录暂时未能完成，请返回编辑器重新登录。', 502, { 'Set-Cookie': clearCookie() });
        }
    }
};
