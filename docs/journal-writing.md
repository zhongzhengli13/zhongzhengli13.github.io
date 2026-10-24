# 随笔写作说明

随笔首页：`/journal/`。编辑后台：`/admin/`。页面设计参考了 Chirpy 的阅读布局，沿用原主页的配色；没有安装整套 Chirpy 主题。

## 本地写作

1. 把 `templates/journal-entry.md` 复制到 `_journal/`，改成英文文件名，例如 `an-ordinary-day.md`。
2. 修改标题、日期（北京时间）、分类和摘要，在 YAML 分隔线下面写 Markdown 正文。文件名决定文章地址，发布后不要改名。
3. 图片放到 `static/assets/img/journal/`，在正文中用 `![说明](/static/assets/img/journal/文件名.jpg)` 引用；封面不是必填项。
4. 写完把 `published: false` 改为 `published: true`。提交并推送到 GitHub，等待 Pages 构建完成即可。新增、修改、删除文章都会自动更新列表，不用维护目录或索引。

首篇 `modeling-memories.md` 只使用了已公开的建模比赛照片和选定文案，日期沿用原动态中的比赛结束日期 2026-09-27，可以自行调整或删除。

注意：这个仓库是公开仓库。`published: false` 只是不生成公开网页，Markdown 文件和 Git 历史仍可在 GitHub 看到。私密日记不要提交；Decap 的草稿分支与 PR 也不提供隐私保护。

## 本地预览

仓库使用 GitHub Pages 支持的 Jekyll 3.10。先安装 Ruby、Bundler，然后在仓库根目录运行：

```sh
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

打开 `http://127.0.0.1:4000/`。不要直接双击 HTML，或用普通静态服务器预览随笔；随笔列表和阅读页需要先经过 Jekyll 构建。原主页仍然保持原来的 Markdown 动态加载方式。

## GitHub 在线写作

也可以直接在 GitHub 仓库的 `_journal/` 中新增或编辑 Markdown。修改后提交即可。回到本地继续写之前先 `git pull`。

## 在浏览器里编辑本地文件

想先试试真正保存文章，而不配置线上登录，可以在仓库根目录另开终端运行：

```sh
BIND_HOST=127.0.0.1 npx decap-server
```

保持 Jekyll 预览运行，打开 `http://127.0.0.1:4000/admin/?local=1`。此模式读写本地 `_journal/` 和图片目录，保存后可在预览中看到变化；不会自动提交或推送。关闭代理即可结束本地编辑。页面顶部有清晰的本地编辑提示。此入口只在 localhost / 127.0.0.1 上启用，不支持在公开网站上使用。

## Decap CMS 体验与正式登录

`/admin/?demo=1` 使用 Decap 官方的 `test-repo` 后端。可以体验文章字段、Markdown 编辑、图片选择和预览，但不会读取仓库现有文章，不会保存到文件或 GitHub，刷新后内容消失。页面顶部会一直显示体验提示。

正式 GitHub 登录已接入 Cloudflare Workers。网站发布后，打开 `https://zhongzhengli13.github.io/admin/`，点击 GitHub 登录并完成首次授权，即可在线写作。认证服务只允许 `zhongzhengli13` 账号登录。

认证服务源码、测试与后续维护步骤见 [`services/decap-auth/README.md`](../services/decap-auth/README.md)。Client ID 和 Client Secret 已保存在 Cloudflare Secret 中；它们不写进网站仓库。

以下步骤用于重新部署或维护认证服务，当前站点已完成接入：

1. 按 [Decap 的 GitHub 认证说明](https://decapcms.org/docs/backends-overview/#using-github-with-an-oauth-proxy) 配置 OAuth 代理。认证服务应限制为当前站点的来源。
2. 在 GitHub 创建与该认证服务配套的 OAuth App，按服务要求填写回调地址；Client Secret 仅保存在认证服务器的密钥配置中，不能放进网页、仓库或聊天。
3. 把代理 HTTPS 地址填入 `admin/config.yml` 的 `backend.base_url`，确认路径 `auth_endpoint: auth` 与服务一致。仓库和主分支已经填好。
4. 构建并发布网站后打开 `/admin/`，使用对该仓库有写权限的 GitHub 账号登录。先保存草稿，确认预览后发布。`editorial_workflow` 通过分支和 PR 管理草稿，发布会合并到 `main`，随后 Pages 自动构建。
5. CMS 的“链接名称”使用英文短横线格式，决定 Markdown 文件名，发布后保持不变。日期、分类、摘要、封面、标签和正文都可直接编辑。界面中英文切换只切换导航文案，不会自动翻译文章。

如果网站设置中禁用了 Jekyll（例如添加 `.nojekyll`），请恢复 Jekyll；当前随笔依赖它生成静态页。GitHub Pages 从当前主分支构建时无需额外的自定义构建 Action。

参考：[Decap 体验后端](https://decapcms.org/docs/test-backend/)、[草稿工作流](https://decapcms.org/docs/editorial-workflows/)、[Jekyll Collections](https://jekyllrb.com/docs/collections/)。
