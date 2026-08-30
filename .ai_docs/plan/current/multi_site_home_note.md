# 多站入口与笔记站路径化实施计划

状态：已合并 subagent2 挑战审查建议。本计划只覆盖当前工作区的代码与文档设计，不创建分支、不修改业务代码。

## 概述

### Feature Description

将当前根路径上的知识库笔记首页调整为“站点入口首页”，并新增 `/note/` 作为笔记站入口。现有文章、归档和知识目录继续使用当前顶层 URL；Project 与 Lab 只在入口页展示为不可点击的“即将开放”卡片。

本阶段仍是一个 Astro 静态站点、一次构建、一个 GitHub Pages 产物。这里的“多站”是同一产物内的站点路径与信息架构，不实现独立 Astro 应用、独立构建产物、真实子域名或跨域同步。

### User Benefits

- 访问根路径即可看到统一的站点入口。
- 进入“笔记站”后继续使用当前 Astro + Svelte 界面、搜索、知识树、文章和 CMS 内容。
- 现有 `/blog/...`、`/archives/`、`/knowledge/...` 等外部链接无需迁移。
- Project、Lab 有明确的预留位置，但不会误导用户进入不存在的页面。
- 将来购买域名后，可以在不改变内容模型的前提下继续规划子域名拆分。

### Project Alignment

- 复用当前 `src/content.config.ts`、`getBlogEntrySort()`、`getContentTree()` 和 `MainPageLayout.astro`，不新增内容集合或运行时 API。
- 复用 `getRelativeLocaleUrl()` 处理 `BASE_PATH`，不手写域名、locale 前缀或部署前缀。
- 不修改 `cms/server/store.mjs` 及 CMS API；CMS 继续只管理 `src/content/blog/**/*.md`。
- 保持公开站点仅生成中文路由，不新增 `/en/` 页面或英文入口文案。

### 计划分支名称

`feat/multi_site_home_note`（仅记录，不创建或切换）。

## 需求分析

### Functional Requirements

1. 根路径 `/`（由 `BASE_PATH` 统一包裹）展示主站入口页，而不是当前知识库统计首页。
2. 新增中文笔记站入口 `/note/`；其页面保留当前根首页的 Note 视觉、统计、最近发布和顶级分类内容。
3. 继续生成并保留以下既有逻辑 URL，不添加 `/note/` 前缀：
   - `/blog/<文章路径>/`
   - `/archives/` 及其 `category` 查询参数
   - `/knowledge/<directoryId>/`
   - `/about/`、`/friends/`、`/rss.xml`
4. 主站入口至少展示三个站点卡片：笔记站可点击进入 `/note/`；项目站和实验站只显示中文名称、说明及“即将开放”状态，不带 `href`、不注册新路由，也不具备链接键盘行为。
5. 笔记站内部的品牌入口指向主站 `/`；笔记站导航中的“首页”、知识树“全部内容”、目录面包屑和文章面包屑指向 `/note/`，避免它们误回主站门户。
6. 所有新增或改动的站内链接均通过 `getRelativeLocaleUrl()` 或其语义化封装生成，兼容根部署和 `BASE_PATH=/blob_website` 等项目站部署。
7. 根入口页、笔记首页等非文章页面继续从 Pagefind 排除；搜索仍只依赖现有生产构建后的文章索引。
8. 不改变文章 frontmatter、文章目录、`slugId`、草稿过滤、RSS 文章链接、评论标识或 CMS 的文章读写边界。

本次正式验收目标是用户 Pages 站点 `https://wentzhao.github.io/`，对应 `BASE_PATH=/`；`https://wentzhao.github.io/blob_website/`、对应 `BASE_PATH=/blob_website` 仅作为项目站兼容性构建场景，不代表本次正式发布目标。

### Non-Functional Requirements

- 使用现有 Astro、Svelte、CSS 变量、图标和主题能力，不新增依赖或独立前端框架。
- 根入口和 `/note/` 均为静态 HTML；公开页面不依赖 CMS、本地 API 或构建时运行的服务。
- 新增可见文案使用中文 i18n；不新增英文页面、英文路由或英文公开验收项。
- 入口页使用现有浅色/深色主题变量，满足桌面端、移动端、键盘焦点和基本语义可访问性。
- 不为未来子域名提前加入 CNAME、跨站 API、构建矩阵、manifest 或配置抽象。

### Edge Cases

- `src/pages/[...locale]/[...page].astro` 是当前根路由的 catch-all 页面，不能另加同级 `index.astro` 造成路由冲突；应直接将其改为门户页。
- `/note/` 必须显式生成，并在 `BASE_PATH` 下成为 `/blob_website/note/`，不能把 `BASE_PATH` 当作业务路径。
- 文章深层 URL、目录 URL 和查询参数需继续带尾斜杠/查询语义；入口卡片不能误链接到未来的 `/project/` 或 `/lab/`。
- 没有文章时，Note 首页应沿用现有空数据展示逻辑，不因新增门户而引入异常。
- 404 页的主按钮当前使用根路径，应继续返回主站入口；笔记页面的面包屑则返回 `/note/`，两者语义不同。
- 现有 Markdown 中可能存在原始绝对链接（例如 `/archives/`）；本功能不改写文章正文。代码生成的链接需单独验证 `BASE_PATH`，原始 Markdown 链接作为既有边界记录。

### Dependencies

- Astro 7 的文件路由与 `astro:config/client` locale 配置。
- `src/utils/url-utils.ts` 的 `getRelativeLocaleUrl()` 和 `baseUrl()`。
- Note 当前页面使用的 `MainPageLayout.astro`、`Header.astro`、`KnowledgeTree.astro`、内容查询工具和 `src/content/directory-tree.json`。
- `Layout.astro`、`Footer.astro`、`ThemeIcon.astro` 和现有 CSS 主题变量用于门户页外壳。
- GitHub Pages 的现有静态部署流程；本阶段不依赖自定义域名。

## 技术设计

### Architecture Overview

```mermaid
flowchart TD
    Pages[单个 Astro 构建产物 dist] --> Portal[根路径 / 主站入口]
    Pages --> NoteHome[/note/ 笔记入口]
    Pages --> Legacy[既有顶层笔记 URL]

    Portal --> Layout[Layout + 入口卡片 + Footer]
    NoteHome --> MainLayout[MainPageLayout]
    Legacy --> MainLayout
    MainLayout --> Header[Header: 品牌回主站 / 首页回 Note]
    MainLayout --> Tree[KnowledgeTree / Mega Menu]
    MainLayout --> Search[Pagefind 搜索]

    Content[src/content/blog/**/*.md] --> Schema[content.config.ts]
    Schema --> Query[getBlogEntrySort / getContentTree]
    Query --> NoteHome
    Query --> Legacy
    CMS[本地 CMS] --> Store[cms/server/store.mjs]
    Store --> Content
```

根路径门户不调用内容集合，也不渲染 Note 的知识树和搜索；`/note/` 以及所有既有文章相关页面继续走当前 Note 外壳。这样能把门户和内容站的职责分开，同时不改变内容路由。

### Route Compatibility Matrix

| 逻辑入口 | 正式 Pages 根部署 | 项目站兼容构建 | 页面职责 |
| --- | --- | --- | --- |
| 主站门户 | `/` | `/blob_website/` | 站点入口，不读取文章集合 |
| Note 首页 | `/note/` | `/blob_website/note/` | 当前 Note 首页 |
| 文章 | `/blog/<id>/` | `/blob_website/blog/<id>/` | 保持既有文章路由结构 |
| 归档 | `/archives/` | `/blob_website/archives/` | 保持既有筛选参数 |
| 知识目录 | `/knowledge/<id>/` | `/blob_website/knowledge/<id>/` | 保持既有目录路由结构 |

因此，根路径从旧 Note 首页变为主站门户是有意的行为变化；需要兼容的是文章、归档、知识目录等内容 URL，而不是旧根首页的内容语义。

### Component Breakdown

#### 1. 路由层

- `src/pages/[...locale]/[...page].astro`：保留现有 `getStaticPaths()` 的根路径生成方式，改为静态主站入口页。
- `src/pages/[...locale]/note.astro`：新增仅生成 `zh-cn` 的 Note 首页路由；将当前根首页的查询、展示和样式整体迁移到这里，避免复制两套统计逻辑。
- `src/pages/[...locale]/blog/[...id].astro`、`archives.astro`、`knowledge/[...directory].astro`：保留路由参数和静态生成，仅修正返回 Note 首页的链接语义。

#### 2. 站点外壳与导航层

- `src/layouts/Layout.astro`：继续作为门户的基础 HTML、主题初始化和 Astro transitions 外壳，不新增站点运行时状态。
- `src/layouts/MainPageLayout.astro`：保持 Note 内容站布局职责不变；其调用的 Header 仍服务于 Note 页面。
- `src/components/Header.astro`：拆分当前共用的 `indexPage` 语义：品牌链接回主站，桌面/移动导航“首页”回 `/note/`，移动端品牌也应可回主站。
- `src/components/Footer.astro`：门户复用现有 Footer，RSS 继续指向既有 `/rss.xml`。
- `src/components/knowledge/KnowledgeTree.astro`、`src/components/knowledge/DirectoryPage.astro`、文章面包屑：将“全部内容/首页”改为 Note 首页 URL。

#### 3. URL 与文案层

- `src/utils/url-utils.ts`：新增语义明确的 `getNoteHomeUrl(lang)`，内部只调用 `getRelativeLocaleUrl(lang, "/note/")`；主站仍使用现有 helper 生成 `/`。
- `src/i18n/key.ts`、`src/i18n/language/zh-cn.ts`：增加可选的 `portal` 文案分组，用于门户标题、卡片名称、说明和“即将开放”状态。字段保持可选，避免迫使当前未被公开加载的 `en.ts` 增加新的公开能力；实现不得新增英文页面或英文门户文案。

### Data Flow

1. 访问根路径时，门户页只读取站点配置和中文翻译，输出三个静态入口卡片；Note 卡片使用 `getNoteHomeUrl()`，另两张卡片输出非链接元素。
2. 访问 `/note/` 时，迁移后的 Note 首页继续调用 `getBlogEntrySort(currentLang)` 和 `getContentTree(currentLang)`，统计与最近文章结果保持现状，并由 `MainPageLayout` 提供 Header、知识树、搜索和 Footer。
3. 访问既有文章、归档或知识目录时，继续使用原有内容查询与静态路径；只将返回首页的代码生成链接从 `/` 改为 `/note/`。
4. CMS 仍把内容写入 `src/content/blog/**/*.md`；构建时由 Astro Content Collections 读取，CMS 不参与公开页面导航，也不需要理解 `/note/`。

### Configuration Changes

- 不修改 `astro.config.mjs` 的 `site`、`base`、中文 i18n、Markdown 插件和 Svelte 集成。
- 不修改 `src/content.config.ts`、`src/content/navigation.ts`、`src/config.ts` 的文章/目录/站点配置 contract。
- 不修改 `.github/workflows/deploy.yml`：它只在仓库名为 `<owner>.github.io` 时部署；当前工作区远程源仓库是 `wentzhao/blob_website`，README 已记录其 workflow 会跳过该源仓库，实际发布需沿用既有 `pages` 目标仓库/同步流程。
- 本功能只负责生成并验证单个 Astro `dist` 构建产物，不增加 `blob_website -> wentzhao.github.io` 的自动同步、跨仓库推送或新的发布 job；因此“线上已生效”不是本功能的验收项。正式发布必须由已有 Pages 目标仓库/同步流程完成。
- 正式 Pages 构建固定使用 `PUBLIC_SITE_URL=https://wentzhao.github.io`、`BASE_PATH=/`；另行执行的兼容性构建使用 `PUBLIC_SITE_URL=https://wentzhao.github.io/blob_website`、`BASE_PATH=/blob_website`，禁止混用两组值。
- 未来自定义域名、子域名、CNAME 和独立站点构建列为后续设计，不在本计划配置。

### API/Interface Definitions

本功能不新增 HTTP API。新增的代码级 URL 接口为：

```ts
export function getNoteHomeUrl(lang: string): string {
  return getRelativeLocaleUrl(lang, "/note/");
}
```

门户卡片只需要页面内的静态数据结构，不建立全局站点注册表：

```ts
type PortalEntry = {
  label: string;
  description: string;
  href?: string;
  status?: string;
};
```

该类型可以留在门户页面内部，避免为尚未开发的 Project/Lab 引入可配置 URL 或未来子域名抽象。不可点击卡片应根据 `href` 是否存在选择 `<a>` 或非交互容器，不能使用带 `href="#"` 的伪链接。

## 实施策略

### Implementation Phases

#### 阶段 0：工作区保护与基线核对

1. 记录 `git status --short`、`git diff -- cms` 和未跟踪文章目录状态；确认只存在当前已知的 CMS 未提交修改和未跟踪文章目录。
2. 不执行 `reset`、`checkout`、清理命令或覆盖操作；计划涉及的页面、URL 工具和文案文件目前不应覆盖用户改动。
3. 核对当前实际文章 ID、目录 ID、根路由和 GitHub Pages 目标仓库，作为后续手工验收样例。

#### 阶段 1：拆分根入口与 Note 入口

1. 将 `src/pages/[...locale]/[...page].astro` 的当前 Note 首页内容整体迁移到新建的 `src/pages/[...locale]/note.astro`，保留其 `getBlogEntrySort()`、`getContentTree()`、统计、最近发布、分类表和响应式样式。
2. 将原文件改为门户页，使用 `Layout.astro`、现有主题按钮和 Footer，渲染“笔记站/项目站/实验站”三项入口。
3. 在门户页和 Note 页设置正确的 `data-pagefind-ignore` 边界，避免门户标题、卡片或 Note 首页统计进入文章索引。
4. 通过 `getStaticPaths()` 只生成默认中文路径；不创建 `/project/`、`/lab/` 或英文页面。

#### 阶段 2：统一站点导航与 URL 语义

1. 在 `src/utils/url-utils.ts` 增加 `getNoteHomeUrl()`。
2. 修改 `Header.astro`，使品牌链接指向主站根路径，桌面和移动“首页”指向 `/note/`；将当前移动菜单顶部的 `strong` 品牌文本改为实际链接，使其也能返回主站；保留归档、知识目录、关于和 RSS 的既有 URL。
3. 修改 `KnowledgeTree.astro` 的“全部内容”、`DirectoryPage.astro` 的目录面包屑以及文章详情页面包屑，统一使用 Note 首页 helper。
4. 全文检索根路径链接，确认只有门户入口和 404 返回主站根路径；文章、目录和 Note 导航不再因共用 `/` 误回门户。
5. 在 `src/i18n/key.ts` 与中文翻译中添加门户文案，避免在多个页面散落重复状态文字。

#### 阶段 3：文档同步与部署说明

1. 更新 `README.md`：说明根路径是主站入口、`/note/` 是笔记首页、旧文章/归档/知识目录 URL 保持不变。
2. 更新 `docs/usage-guide.md` 中关于首页入口文件、首页职责和路由的段落，明确 Note 首页已迁移到 `src/pages/[...locale]/note.astro`。
3. 文档中明确本阶段仍是一个 `dist`、一个 Pages 站点；不新增自定义域名和多子域名发布流程。
4. 不改写现有 CMS 文档、store 路径和用户未提交的 CMS 修改。

#### 阶段 4：构建与手工验收

1. 运行 `pnpm exec astro check`。
2. 运行 `pnpm build`，确认 Astro 静态生成与 Pagefind 均成功。
3. 直接检查 `dist/index.html` 与 `dist/note/index.html`：根产物包含门户标记而不包含旧 Note 首页主体，Note 产物包含迁移后的 Note 页面；确认不存在 `dist/note/note/index.html`。
4. 运行 `pnpm preview`，按测试计划检查根入口、Note 入口、旧 URL、搜索和响应式行为。
5. 在清理/隔离构建产物后，以 `BASE_PATH=/blob_website` 和对应 `PUBLIC_SITE_URL` 构建一次，检查第二组输出路径；不得把项目站配置当作正式 Pages 配置。
6. 结束时再次查看 `git diff -- cms`、未跟踪文章目录和 `git status --short`，确认没有改动 CMS、内容草稿、`dist/`、`.astro/` 或 `node_modules/`。

### File Structure Changes

| 文件 | 变更 | 目的 |
| --- | --- | --- |
| `src/pages/[...locale]/[...page].astro` | 修改 | 根路径改为静态主站入口 |
| `src/pages/[...locale]/note.astro` | 新增 | 承载迁移后的当前 Note 首页 |
| `src/utils/url-utils.ts` | 修改 | 增加 Note 首页 URL 封装 |
| `src/components/Header.astro` | 修改 | 区分主站品牌入口与 Note 首页入口 |
| `src/components/knowledge/KnowledgeTree.astro` | 修改 | “全部内容”返回 `/note/` |
| `src/components/knowledge/DirectoryPage.astro` | 修改 | 目录面包屑返回 `/note/` |
| `src/pages/[...locale]/blog/[...id].astro` | 修改 | 文章面包屑首页返回 `/note/` |
| `src/i18n/key.ts` | 修改 | 增加门户文案类型 |
| `src/i18n/language/zh-cn.ts` | 修改 | 增加中文门户文案 |
| `README.md` | 修改 | 同步入口、路由和部署说明 |
| `docs/usage-guide.md` | 修改 | 同步用户维护文档中的首页职责和文件路径 |

明确不修改：`src/content.config.ts`、`src/content/navigation.ts`、`src/config.ts`、`astro.config.mjs`、`cms/**`、文章 Markdown、`.github/workflows/deploy.yml`。若实施时发现必须触及这些文件，应先重新评估边界，不得为了实现入口页绕过现有 contract 或部署门禁。

### Code Locations

- 根入口：`src/pages/[...locale]/[...page].astro` 的 `getStaticPaths()` 和页面模板。
- Note 首页：从当前根页面迁移其 `entries`、`tree`、`categorySummaries`、`lastUpdated` 逻辑和对应样式到 `src/pages/[...locale]/note.astro`。
- URL：`src/utils/url-utils.ts` 的 `getRelativeLocaleUrl()` 附近新增 `getNoteHomeUrl()`。
- Header：`src/components/Header.astro` 中当前共用的 `indexPage` 常量、品牌链接、桌面导航和移动导航。
- 知识导航：`src/components/knowledge/KnowledgeTree.astro` 的“全部内容”链接、`DirectoryPage.astro` 和文章详情页的面包屑。
- 文案：`src/i18n/key.ts` 的 `Translation` 类型和 `src/i18n/language/zh-cn.ts` 的翻译对象。

### Integration Points

- Astro 文件路由必须同时保证根 catch-all 和新增 `note.astro` 不冲突。
- Note 页面仍通过 `MainPageLayout -> Header -> KnowledgeTree/Search/Footer` 集成；门户页只通过 `Layout -> ThemeIcon/Footer` 集成。
- 文章数据仍通过 `Astro Content Collections -> content-utils -> 静态页面` 流动，门户不读取文章集合。
- `BASE_PATH` 仍由 `getRelativeLocaleUrl()`/`baseUrl()` 统一处理；`PUBLIC_SITE_URL` 继续只负责站点绝对地址和 RSS/canonical 相关输出。
- Pagefind 仍由 `pnpm build` 在同一个 `dist` 中生成；门户和 Note 首页必须位于排除边界内。
- GitHub Pages 只承载最终单一静态产物。由于当前源仓库是 `blob_website` 且工作流有仓库名门禁，本计划只保证构建产物和路径正确，不自动改变发布仓库或推送流程。

## 测试计划

本功能默认只设计手工测试，不新增测试模块或测试依赖。

### Test scenarios

1. **根入口桌面端**
   - 在开发服务器或预览服务器打开 `/`。
   - 预期：只看到主站入口和三个站点卡片；笔记站可进入 `/note/`；项目站、实验站显示“即将开放”，没有可点击行为。
2. **根入口移动端**
   - 使用窄视口打开 `/`，检查卡片堆叠、文字换行、无水平溢出。
3. **主题与焦点**
   - 在根入口切换浅色/深色主题；使用 Tab 键检查笔记站和主题按钮焦点可见，Project/Lab 不被当作可操作控件。
4. **Note 首页**
   - 打开 `/note/`，确认现有 Note 标题、公开文章数、最近发布、分类/目录和 Footer 仍存在；空数据状态沿用原逻辑。
5. **Note 导航方向**
   - 在 `/note/`、任意文章、归档和知识目录页面点击品牌、导航“首页”、知识树“全部内容”和面包屑。
   - 预期：品牌回 `/`；Note 语义的首页链接回 `/note/`；归档、目录、文章 URL 不改变。
6. **既有 URL 兼容**
   - 直接访问至少一个真实文章 URL、`/archives/`、带 `category` 的归档 URL、一个真实 `/knowledge/<id>/`、`/about/`、`/friends/` 和 `/rss.xml`。
   - 预期：全部正常生成/加载；文章详情、RSS 中的文章链接仍为顶层 `/blog/...`，不出现 `/note/blog/...`。
7. **404 语义**
   - 访问不存在的路径并点击返回首页；预期回到根门户。文章/目录内部面包屑不应把 Note 首页误显示为主站入口。
8. **搜索与 Pagefind**
   - 完成 `pnpm build` 后运行 `pnpm preview`，搜索真实中文文章标题。
   - 预期：结果仍指向顶层文章 URL；门户、`/note/`、归档和知识目录不作为搜索结果出现。
9. **BASE_PATH**
   - 使用 `BASE_PATH=/blob_website`、`PUBLIC_SITE_URL=https://wentzhao.github.io/blob_website` 构建并预览。
   - 预期：入口为 `/blob_website/`，Note 为 `/blob_website/note/`，文章/归档/知识目录都带 `/blob_website`；资源和 Pagefind 脚本不丢失前缀。
10. **CMS 边界**
    - 通过只读检查确认 CMS 仍引用 `src/content/blog`；不要求本功能执行 CMS CRUD。
    - 预期：没有改动 `cms/server/store.mjs`、预览接口或文章文件格式。
11. **构建产物路由**
    - 构建后检查 `dist/index.html` 和 `dist/note/index.html`，搜索门户标记、Note 首页标记及旧 Note 首页的统计标记。
    - 预期：`dist/index.html` 是主站门户，`dist/note/index.html` 是 Note 首页；不存在 `dist/note/note/index.html`，也不存在将 Note 内容误嵌入根门户的结果。
12. **公开内容负向验证**
    - 使用现有草稿（若当前内容中存在）确认它不出现在门户统计、Note 首页、归档、RSS、文章静态页或 Pagefind；确认构建不生成 `/en/` 页面。
    - 在一篇文章中检查许可证卡片仍按 `licenseConfig.enable` 渲染；当前评论关闭时检查没有评论组件/后端请求；对比文章 frontmatter 确认 `slugId` 未变化。
13. **两组 Pages 配置隔离**
    - 正式目标构建使用 `PUBLIC_SITE_URL=https://wentzhao.github.io` 与 `BASE_PATH=/`；兼容构建使用 `PUBLIC_SITE_URL=https://wentzhao.github.io/blob_website` 与 `BASE_PATH=/blob_website`。
    - 预期：前者产出根路径链接，后者所有代码生成的页面、资源和 Pagefind 链接带 `/blob_website`；不以兼容构建结果宣称正式线上已发布。

### Test data and expected results

- 使用现有公开文章 `tech/getting-started` 或构建时实际存在的公开文章作为文章样例；不得创建临时文章或改变未跟踪文章。
- 使用 `src/content/directory-tree.json` 中实际存在的一个顶级目录作为知识目录样例，不在计划中虚构目录 ID。
- 同时使用当前已知的 `wentzhao/blob_website` 源仓库与 `wentzhao/wentzhao.github.io` Pages 目标背景验证部署说明；不在本功能中修改远程仓库或推送。

## 验收标准

### Success Metrics

- [ ] 根路径是只包含站点入口职责的主站首页，且 Project/Lab 为不可点击的“即将开放”卡片。
- [ ] 明确验证根路径从旧 Note 首页变更为门户；旧 Note 首页只在 `/note/` 提供，内容 URL 兼容范围不包含旧根首页语义。
- [ ] `/note/` 可以进入当前 Note 首页，Note 的现有视觉、内容统计、导航、搜索和主题能力没有回归。
- [ ] `/blog/...`、`/archives/`、`/knowledge/...`、`/about/`、`/friends/`、`/rss.xml` 的 URL 结构保持不变。
- [ ] 文章、归档、知识树和面包屑中的 Note 首页链接统一指向 `/note/`；品牌入口指向根门户。
- [ ] 构建产物包含 `dist/index.html` 和 `dist/note/index.html`，不存在 `dist/note/note/index.html`，且两者页面职责没有串位。
- [ ] 根路径和 Note 首页不进入 Pagefind；搜索结果仍只指向顶层中文文章详情页。
- [ ] 正式根部署场景使用 `BASE_PATH=/`，项目站兼容场景使用 `BASE_PATH=/blob_website`，两组 URL 未混用。
- [ ] `pnpm exec astro check` 和 `pnpm build` 成功；两组 `BASE_PATH` 构建验证通过。
- [ ] 桌面/移动、浅色/深色、键盘焦点和直接深层链接手工验证通过；移动菜单顶部品牌为可返回主站的链接。
- [ ] 草稿、英文路由、许可证、评论开关、`slugId`、RSS 和 Pagefind 的负向验证通过。
- [ ] CMS、文章 schema、文章内容、部署工作流门禁和未提交用户修改均未被覆盖或削弱。

### User Acceptance

用户打开 GitHub Pages 根地址时先看到站点入口，点击笔记站后可以继续按原有方式访问笔记内容；现有文章分享链接无需改写；Project 与 Lab 只作为未来站点占位，不会产生死链或误操作。

本功能的线上验收边界是构建产物与既有 Pages 发布流程可接收；由于当前源码仓库 `blob_website` 的 workflow 会跳过发布，不能把本次本地构建通过表述为线上已经生效。

## 假设、风险与决策记录

### Assumptions

- 用户接受根路径原有的 Note 首页语义被主站门户取代；“保留 URL”指文章、归档和知识目录等内容 URL，不指根首页内容本身。
- `/note/` 是新增的逻辑 Note 首页；文章仍留在顶层 `/blog/`，因此这是兼容优先的混合路径，而不是把整个 Note 内容移动到 `/note/*`。
- 当前 GitHub Pages 的正式目标仍是文档中记录的 `wentzhao.github.io`；当前工作区的 `origin` 是源代码仓库，不能从本地计划推断应修改其部署门禁。
- Project/Lab 在本阶段没有目标 URL、内容模型或页面需求，因此只实现不可交互占位，不生成空页面。
- 本阶段仍只有 `zh-cn` 公开页面；现有英文源文件和英文翻译文件不因本功能被删除、恢复或扩展。
- 实施时保留现有 `cms/**` 修改和未跟踪文章，不执行回滚、重置、清理或自动格式化无关文件。

### Risks

1. **根路由迁移风险（高）**：旧根首页书签会看到门户而不是原 Note 首页。通过新增 `/note/` 并在文档/导航中明确入口降低影响；不对根路径做重定向，因为根路径本身就是新主站首页。
2. **导航语义回归风险（高）**：若遗漏任一 `/` 链接，文章或知识页可能回到门户。通过全文检索、路径清单和逐页手工测试覆盖 Header、知识树、目录及文章面包屑。
3. **Catch-all 路由冲突风险（中）**：新增 `index.astro` 或错误的静态参数会与当前根 catch-all 冲突。实施时只替换当前根文件，并显式新增 `note.astro`。
4. **GitHub Pages 发布风险（高）**：当前 `deploy.yml` 对 `blob_website` 会跳过，代码构建成功不等于线上自动更新。计划不擅自改动发布门禁；交付时必须明确产物需要按既有 Pages 仓库流程发布。
5. **非根部署链接风险（中）**：代码链接可以通过 helper 保留 `BASE_PATH`，但文章 Markdown 中的原始 `/archives/` 等绝对链接无法自动经过 helper。此风险记录为既有内容边界，不在本功能中批量改写文章。
6. **未来子域名迁移风险（低/延期）**：当前文章顶层 URL 与 Note 入口分离，未来拆成 `note.example.com` 时需要重新定义跨站链接与 canonical 策略。本计划不提前加入域名配置，避免增加未验证的构建复杂度。

### Decision Points

- **根路径方案**：采用 `/` 主站门户 + `/note/` Note 首页；不采用 `/note/blog/...`，因为那会破坏已确认要保留的文章 URL。
- **构建方案**：采用一个 Astro 构建、一个 `dist`、一个 Pages 站点；不实现四个独立 build，也不建立多仓库发布矩阵。
- **占位站点方案**：Project/Lab 使用无 `href` 的静态卡片；不创建占位路由、不使用伪链接。
- **部署方案**：本阶段不改 `.github/workflows/deploy.yml` 和远程仓库；沿用现有 `wentzhao.github.io` Pages 目标流程，未来若要让 `blob_website` 自动发布需另行确认仓库与门禁。

## 合并审查

以下为对 subagent2 八条挑战建议的逐条回合评估。所有建议均可在不扩大用户已确认功能范围的前提下落地，因此本轮没有 `reject` 或 `escalate`；线上发布仍是既有运维流程的前置条件，不作为本功能的隐藏验收项。

1. **建议 1：GitHub Pages 发布链路未闭合 —— accept**
   - 理由：当前源码仓库 `blob_website` 的 workflow job-level `if` 确实会跳过部署。计划已明确本功能只生成/验证单个 `dist`，不新增跨仓库同步或发布 job，并将“线上已生效”排除出验收；正式发布沿用已有 Pages 目标仓库流程。
   - 影响：实施阶段增加发布边界说明和最终 `git status` 检查；不修改 `.github/workflows/deploy.yml`。
2. **建议 2：BASE_PATH 与 Pages 目标混用 —— accept**
   - 理由：计划已定义正式目标 `https://wentzhao.github.io/` + `BASE_PATH=/`，并把 `https://wentzhao.github.io/blob_website/` + `BASE_PATH=/blob_website` 限定为兼容性构建，两组配置分别验证。
   - 影响：新增路由矩阵、两组构建测试和“不以兼容构建宣称正式发布”的验收条件。
3. **建议 3：根路径变化需明确是有意行为 —— accept**
   - 理由：这正是根门户需求与旧 Note 首页共存的必要取舍。计划已在需求、路由矩阵、假设和验收中明确 `/` 改为门户，兼容范围只包括文章、归档、知识目录等内容 URL。
   - 影响：旧根首页书签需要改用 `/note/`，文档需同步说明；不增加重定向。
4. **建议 4：补充构建产物检查 —— accept**
   - 理由：文件路由冲突和页面串位仅靠浏览器访问不够明确，检查 `dist/index.html`、`dist/note/index.html` 和不存在的 `dist/note/note/index.html` 能直接确认静态产物边界。
   - 影响：实施阶段与验收标准新增产物检查，不引入测试模块。
5. **建议 5：移动菜单品牌目前不是链接 —— accept**
   - 理由：原 `Header.astro` 移动菜单顶部是 `strong`，与“移动端品牌返回主站”的目标不一致。计划改为实际链接，并纳入键盘/移动端验收。
   - 影响：只修改 Header 的导航标记，不改变移动菜单交互逻辑。
6. **建议 6：i18n portal 文案影响 `en.ts` —— accept**
   - 理由：`Translation` 的新 `portal` 字段定义为可选，只在中文公开翻译中提供；当前公开配置只加载 `zh-cn`，不迫使未公开加载的 `en.ts` 扩大 contract，也不新增英文 UI。该做法保持类型定义合法并符合中文-only 约束。
   - 影响：实施时只修改 `src/i18n/key.ts` 与 `src/i18n/language/zh-cn.ts`，并检查 portal 文案不落入英文路由。
7. **建议 7：补充内容与能力负向验证 —— accept**
   - 理由：迁移 Note 首页查询逻辑时，最容易误伤草稿、中文-only、许可证、评论、`slugId`、RSS 或 Pagefind 边界；计划已新增负向测试和验收项。
   - 影响：测试使用现有内容和配置，不创建临时文章，不改 schema、内容或 CMS。
8. **建议 8：补充实施前后工作区检查 —— accept**
   - 理由：工作区已有 CMS 修改和未跟踪文章，普通全仓库格式化或清理可能造成越界变更。计划已在实施前后检查 `git diff -- cms`、未跟踪文章目录和 `git status --short`。
   - 影响：增加保护性检查，不回滚、不清理、不覆盖用户改动。

### Remaining Decisions

无需要用户重新拍板的功能范围决策。唯一的外部操作前提是：完成代码实施后，需由用户按现有 `wentzhao.github.io` Pages 目标仓库/同步流程发布；本计划不代替该发布授权，也不把它宣称为本功能已自动完成的工作。
