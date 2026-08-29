# 我的笔记

一个以知识库方式组织的个人博客。项目基于 [Momo](https://github.com/Motues/Momo)，视觉和信息架构参考文档型笔记站，但不包含模板作者的内容、域名或品牌资产。

## 特性

- Astro 7 静态站点，仅生成中文路由
- 知识库式首页：分类、目录和最近更新
- 桌面端左侧知识树、中央正文、右侧本页目录
- Momo 的 Pagefind 本地搜索、RSS、代码高亮、KaTeX、提示块和图片查看
- 深色模式、移动端导航、键盘焦点和基础 SEO
- 评论默认关闭，配置后端后再启用

## 开发

```bash
pnpm install
pnpm dev
pnpm exec astro check
pnpm build
pnpm preview
```

生产构建会在 `dist/pagefind` 生成单一搜索索引；搜索弹窗只在生产预览中加载 Pagefind，并按当前 locale 过滤结果。开发服务器可以预览页面，但 Pagefind 搜索需要先执行 `pnpm build`，再运行 `pnpm preview`。

## 写作

文章放在 `src/content/blog/`；文件夹只决定文章路由 ID，主题目录由显式的 `directory` ID 决定。每篇公开文章至少需要以下 frontmatter：

```yaml
title: 文章标题
pubDate: 2026-08-28
description: 一句话摘要
image: ""
slugId: stable-id
directory: deep-learning/paper-reading/transformer
category: 深度学习
draft: false
pinTop: 0
```

首次创建文章使用 `pnpm newpost -- <文章路径> <directory> zh-cn`，例如 `pnpm newpost -- deep-learning/transformer-notes deep-learning/paper-reading/transformer`。`slugId` 是独立稳定的外部标识，文章目录移动时不会自动改写；已有文章的 `slugId` 不迁移。作者只编辑 `directory`，`category` 由其根目录派生；草稿可暂时没有目录，但公开文章缺少或使用未知目录都会使构建失败。

目录注册表集中在 `src/content/directory-tree.json`，`src/content/navigation.ts` 负责校验并投影顶级导航。公开列表、详情路由、RSS 和 Pagefind 在所有环境都会过滤 `draft: true` 的文章；公开站点只输出中文内容。

每个通过校验的目录都会生成中文静态目录页，路由为 `/knowledge/<directoryId>/`。目录页展示中文名称和说明、直属子目录、当前目录及所有后代目录中的中文公开文章、文章总数、最近更新和最后更新时间；空目录也会生成页面，未知目录按 404 处理。站点只生成中文页面，不生成 `/en/` locale 路由。

目录页及首页、归档、关于、友链和 404 等非文章页面会从 Pagefind 排除，搜索只索引中文文章详情页。目录和文章链接统一经过 URL helper，在根路径或设置 `BASE_PATH` 的部署下保持部署前缀。

文章文件统一使用 `zh-cn.md`，文件夹路径决定文章路由 ID。项目不创建英文文章、英文 fallback 或英文路由。

## 配置

- `src/config.ts`：站点名称、文章分页遗留配置、目录深度、评论开关和许可证
- `astro.config.mjs`：Markdown 插件、语言路由和站点 URL
- `PUBLIC_SITE_URL`：生产环境站点地址；未配置时使用 `https://example.com`
- `BASE_PATH`：站点部署的 URL 前缀；未配置时使用根路径 `/`

当前首页按顶级分类和最近文章展示，归档页展示全部公开文章；`pageSize`、`PostPage.astro` 和 `Navi.astro` 是尚未接入主调用链的分页遗留，本项目当前不重新接入分页。

评论只有在 `siteConfig.comments.enable === true` 且 `backendUrl` 非空时才会加载。静态部署不需要运行时 API。

## 发布

构建产物位于 `dist/`，可部署到 Cloudflare Pages、Netlify、Vercel 静态托管或任何静态文件服务器。部署时设置 `PUBLIC_SITE_URL`，以生成正确的 canonical URL 和 RSS 地址；如果部署在非根路径，同时设置 `BASE_PATH`，例如 `BASE_PATH=/blob_website`。

### GitHub Pages

仓库已配置 `.github/workflows/deploy.yml`：用户站点仓库 `wentzhao.github.io` 推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。当前代码仓库 `blob_website` 会跳过该部署工作流，专门保存源代码。用户站点使用根路径，地址为：

`https://wentzhao.github.io/`

当前 `blob_website` 仓库保留为代码仓库；工作流也兼容普通项目站点路径，例如该仓库若单独启用 Pages，地址会是 `https://wentzhao.github.io/blob_website/`。

首次使用时，在仓库 Settings → Pages → Build and deployment → Source 中选择 `GitHub Actions`。

## 修改日志

### 2026-08-28

风险修复：统一文章 schema 与 newpost 模板，隐藏所有环境的草稿，收敛为中文-only 站点并统一根路径 URL，收窄导航 children 为说明项，收敛 Pagefind 搜索生命周期，修复 RSS 链接，同时记录分页遗留和 CMS 独立写入边界。

## 来源与许可证

本项目继承 [Momo](https://github.com/Motues/Momo) 的 MIT License，并在此基础上由 `wentZh2004` 进行站点结构、内容模型和视觉层的独立修改。许可证全文见 [LICENSE](./LICENSE)。
