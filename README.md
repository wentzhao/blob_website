# 我的笔记

一个以知识库方式组织的个人博客。项目基于 [Momo](https://github.com/Motues/Momo)，视觉和信息架构参考文档型笔记站，但不包含模板作者的内容、域名或品牌资产。

## 特性

- Astro 7 静态站点，默认中文并保留英文路由
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

文章放在 `src/content/blog/`，文件夹层级可以表达主题目录。每篇文章至少需要以下 frontmatter：

```yaml
title: 文章标题
pubDate: 2026-08-28
description: 一句话摘要
image: ""
slugId: stable-id
category: 技术笔记
draft: false
pinTop: 0
```

`script/newpost.js` 会生成上述字段，其中 `slugId` 是独立稳定的外部标识，文章目录移动时不会自动改写；已有文章的 `slugId` 不迁移。`category` 可以为空，但不能添加 schema 未定义的字段。CMS 与脚手架在同一文章目录下复用同一个中英文共享 `slugId`，CMS 保存不会因标识变化移动文章目录。

顶级分类和目录说明集中在 `src/content/navigation.ts`。children 目前是说明性内容，不是二级筛选链接。公开列表、详情路由、RSS 和 Pagefind 在所有环境都会过滤 `draft: true` 的文章。

支持中文和英文文章：在同一个文章目录下分别创建 `zh-cn.md` 与 `en.md`，文件夹路径决定文章路由 ID。没有英文版本时，英文路由会回退到中文内容并显示提示；只有英文版本的文章不会出现在默认中文列表中。

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

仓库已配置 `.github/workflows/deploy.yml`：推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。用户站点仓库 `wentzhao.github.io` 使用根路径，地址为：

`https://wentzhao.github.io/`

当前 `blob_website` 仓库保留为代码仓库；工作流也兼容普通项目站点路径，例如该仓库若单独启用 Pages，地址会是 `https://wentzhao.github.io/blob_website/`。

首次使用时，在仓库 Settings → Pages → Build and deployment → Source 中选择 `GitHub Actions`。

## 修改日志

### 2026-08-28

风险修复：统一文章 schema 与 newpost 模板，隐藏所有环境的草稿，补齐 locale 回退和根路径 URL，收窄导航 children 为说明项，收敛 Pagefind 搜索生命周期并按 locale 过滤，修复 RSS 链接，同时记录分页遗留和 CMS 独立写入边界。

## 来源与许可证

本项目继承 [Momo](https://github.com/Motues/Momo) 的 MIT License，并在此基础上由 `wentZh2004` 进行站点结构、内容模型和视觉层的独立修改。许可证全文见 [LICENSE](./LICENSE)。
