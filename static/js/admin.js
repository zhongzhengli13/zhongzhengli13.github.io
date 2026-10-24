(async () => {
    const status = document.getElementById('cms-status');
    const demo = new URL(location.href).searchParams.get('demo') === '1';
    const local = !demo && new URL(location.href).searchParams.get('local') === '1';
    document.getElementById('cms-local-link').hidden = !['localhost', '127.0.0.1'].includes(location.hostname);
    try {
        if (!window.jsyaml) throw new Error('配置解析器未能加载，请检查网络后刷新。');
        const response = await fetch('/admin/config.yml');
        if (!response.ok) throw new Error('无法读取编辑器配置。');
        const config = jsyaml.load(await response.text());
        if (demo) {
            config.backend = { name: 'test-repo' };
            config.publish_mode = 'simple';
            document.getElementById('cms-demo-notice').hidden = false;
            document.body.classList.add('cms-is-demo');
        } else if (local) {
            if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('本地编辑只能在 localhost 或 127.0.0.1 中使用。');
            let proxy;
            try {
                proxy = await fetch('http://127.0.0.1:8081/api/v1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'info', params: {} }), signal: AbortSignal.timeout(4000) });
            } catch {
                throw new Error('未能连接本地编辑代理，请按写作说明启动 decap-server 后刷新。');
            }
            if (!proxy.ok) throw new Error('本地编辑代理尚未启动，请按写作说明运行 decap-server。');
            config.local_backend = { url: 'http://127.0.0.1:8081/api/v1' };
            config.publish_mode = 'simple';
            const notice = document.getElementById('cms-demo-notice');
            notice.textContent = '本地编辑模式 · 保存会修改本地仓库文件，提交并推送后才会上线。';
            notice.hidden = false;
            document.body.classList.add('cms-is-demo');
        } else if (!config.backend.base_url) {
            status.textContent = '编辑器已准备好，GitHub 登录尚未配置。可以先体验编辑器，或在本地 / GitHub 中写作。';
            return;
        } else if (new URL(config.backend.base_url).protocol !== 'https:') {
            throw new Error('GitHub 登录服务需要使用 HTTPS 地址。');
        }
        status.textContent = '正在加载编辑器…';
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/decap-cms@3.17.1/dist/decap-cms.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('编辑器未能加载，请检查网络后刷新。'));
            document.head.appendChild(script);
        });
        config.load_config_file = false;
        CMS.init({ config });
        CMS.registerPreviewStyle('/static/css/cms-preview.css');
        document.getElementById('cms-setup').hidden = true;
    } catch (error) {
        status.textContent = error.message;
    }
})();
