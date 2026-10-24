# GitHub 登录认证服务

此 Worker 实现 Decap CMS 的 `/auth` 与 `/callback` 协议，网站仍由 GitHub Pages 托管。仅允许 `zhongzhengli13` 登录，并核对该账号对目标仓库有写权限。请求公开仓库写权限 `public_repo`，不请求私人仓库或个人资料写权限。注意 GitHub OAuth 的 `public_repo` 权限本身覆盖该账号的公开仓库，不能描述为单仓库范围。

客户端 Secret 只保存为 Cloudflare Worker Secret。认证使用随机 state、HttpOnly Cookie 和 PKCE；回传时校验编辑器的固定来源及窗口。服务端不保存或记录访问令牌。服务源码与测试不部署到 GitHub Pages。

## 部署

在此目录执行（需要 Node 22 或更新版本）：

```sh
npm install
npm test
npx wrangler login --device
npx wrangler deploy
```

Worker 名称为 `zhongzhengli-decap-auth`。部署后取得 `https://zhongzhengli-decap-auth.<账号子域名>.workers.dev`，以下简称 `AUTH_URL`。未设置密钥时 `/health` 返回 `503` 和 `ready: false`，不会发起无效 GitHub 登录。

本次已部署的 `AUTH_URL`：`https://zhongzhengli-decap-auth.zhongzhengli-decap-auth.workers.dev`。

## 创建 GitHub OAuth App

在 https://github.com/settings/applications/new 创建：

- Application name：`Zhongzheng Li Journal`
- Homepage URL：`https://zhongzhengli13.github.io`
- Authorization callback URL：`AUTH_URL/callback`
- Device Flow：不需要开启。

生成 Client Secret，将这两项通过 Cloudflare 控制台的 Worker → Settings → Variables and Secrets，作为 **Secret** 添加：

- `GITHUB_OAUTH_ID`：GitHub 显示的 Client ID。
- `GITHUB_OAUTH_SECRET`：生成的 Client Secret。

也可使用 `npx wrangler secret put GITHUB_OAUTH_ID` 与 `npx wrangler secret put GITHUB_OAUTH_SECRET`，在交互提示中输入。不要把 Secret 放进命令参数、版本库或聊天。绑定后再访问 `AUTH_URL/health`，应返回 `ready: true`。

## 接通编辑器

把仓库根目录 `admin/config.yml` 中 `backend.base_url` 改为实际 `AUTH_URL`，保留 `auth_endpoint: auth` 和 `site_domain: zhongzhengli13.github.io`。提交发布后，从 `https://zhongzhengli13.github.io/admin/` 发起登录；认证服务仅向该正式站点回传令牌，本地预览请继续使用 `?local=1`。

GitHub 授权成功后，CMS 直接使用 GitHub API 读写文章，Cloudflare 不保存文章。验证时先新建一篇可删除的测试草稿，确认仓库草稿分支能创建，再发布验证站点构建。

如果修改站点域名，需要同步更新 Worker 的 `SITE_ORIGIN`、编辑器的 `site_domain` 和 OAuth App 的配置。失效或取消的登录应从编辑器重新发起，不要复用 `/callback` 链接。

参考：[Decap OAuth 协议](https://decapcms.org/docs/backends-overview/#using-github-with-an-oauth-proxy)、[GitHub OAuth Web flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)。
