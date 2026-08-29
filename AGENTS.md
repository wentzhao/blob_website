<!--
 Copyright (c) 2026 19642

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

# AGENTS.md

AI 助手在此仓库中工作时的指导说明。

本文适用于整个仓库。修改 `cms/` 时还应阅读 `cms/AGENT.md`；若局部说明与本文冲突，以更接近目标文件且能够由当前代码验证的约定为准。

## 项目概览

- 本项目是一个以知识库方式组织的中文个人博客，基于 Astro 7、TypeScript 和 Svelte 5，默认生成静态站点。
- 根应用负责公开站点：页面入口在 `src/pages/`，内容在 `src/content/`，布局与组件在 `src/layouts/` 和 `src/components/`，Markdown 扩展在 `src/plugins/`。
- `cms/` 是 pnpm workspace 中独立的本地内容管理工具。它使用 Vite、Hono 和原生 TypeScript SPA，直接读写 `src/content/blog/**/*.md`，不属于生产静态站点的运行时依赖。
- 生产构建链为 `Astro Content Collections -> Astro 静态页面 -> dist/ -> Pagefind 索引`。`pnpm build` 已包含 Astro 构建和 Pagefind 索引生成。
- 公开站点只支持 `zh-cn`，使用无前缀路由；不得新增英文页面、英文内容或 `/en/` 路由。部署子路径由 `BASE_PATH` 处理。

### 主要职责边界

- `src/content.config.ts`：`blog` 与 `spec` 集合的唯一 schema 来源。
- `src/utils/content-utils.ts`：公开文章查询、草稿过滤、排序、语言选择与默认语言回退。
- `src/content/navigation.ts`：首页知识库顶级分类及其说明性目录。
- `src/config.ts`：站点、个人资料、评论、主题和许可证配置。
- `src/i18n/`：中文界面文案；文章内容只使用中文 Markdown 文件。
- `src/utils/url-utils.ts`：`BASE_PATH`、locale 路由和文章资源路径的统一拼接入口。
- `astro.config.mjs`：站点 URL、base path、i18n、Astro 集成及正式 Markdown 处理管线。
- `cms/server/store.mjs`：CMS 对博客内容的统一读写边界；不要在新的 CMS API 中绕过它直接操作文章文件。


## 关键规则

- 修改前先阅读目标文件、直接调用方和对应配置，不根据目录名猜测行为。
- 优先复用现有组件、工具、CSS 变量和依赖。只有现有能力无法满足明确需求时才新增依赖或抽象，并说明必要性。
- Astro 负责静态数据准备和页面组合；仅在确实需要浏览器状态、事件或生命周期时使用 Svelte 或客户端脚本。
- 保持静态站点边界。除已配置的可选评论能力外，不要让公开页面依赖 CMS、本地 API 或其他构建时不可用的服务。
- 站内 URL 使用 `getRelativeLocaleUrl()`；仅处理部署前缀的资源 URL 使用 `baseUrl()`。不要手写 `/en` 前缀，也不要假设站点一定部署在域名根路径。
- 公共文章查询复用 `getBlogEntrySort()`，不得在页面中另写一套会绕过草稿过滤或 locale 回退的查询逻辑。
- 修改路由、内容 schema、Markdown 插件顺序、公共组件接口或 CMS 写入格式时，要同时检查其所有消费者，并在交付说明中指出行为变化。
- `.ai_docs/` 中标有“AI 初稿，待确认”的文件是参考材料，不是高于当前代码和本文件的强制规范。

### 项目级语言限制

- 本项目是中文博客，公开站点唯一语言为 `zh-cn`；所有页面、导航、面包屑、目录标签、文章内容和新增界面文案必须使用中文。
- 不得新增、恢复或暴露英文页面、英文文章、英文目录标签、英文翻译文件或 `/en/` 路由；不得为了“兼容未来多语言”增加英文 fallback、英文静态路径或英文验收项。
- 既有代码中的英文技术标识、依赖名、许可证文本和实现注释不属于站点内容；修改时不得将其渲染为公开 UI 文案。


### 内容修改

- 博客文章位于 `src/content/blog/<文章路径>/zh-cn.md`。目录路径构成文章路由 ID；移动目录会改变 URL。
- 同一文章目录的不同语言版本必须共用 `slugId`。`slugId` 是评论等外部系统使用的稳定标识，不决定路由，不应因改标题、翻译或移动目录而随意更换。
- `blog` frontmatter 以 `src/content.config.ts` 为准：

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

  `title`、`pubDate`、`slugId` 必填；其余字段已有默认值或允许省略。不要写入 schema 未定义的业务字段。
- `draft: true` 必须在首页、归档、详情静态路由、RSS 和 Pagefind 中保持不可见。不要为方便预览而放宽公开查询。
- 默认语言列表只收录中文公开文章；不生成英文路由或英文回退页面。
- `src/content/spec/` 存放关于页和友链页等固定内容，其 frontmatter 当前只允许 `title`。修改时保持中文文件结构一致。
- 新文章优先使用 `pnpm newpost -- <文章路径> zh-cn` 或本地 CMS。脚手架默认创建公开文章，CMS 默认创建草稿，提交前必须确认 `draft` 状态。
- 文章目录内图片优先使用 `./文件名` 相对路径；公共静态资源放在 `public/`。不要用绝对本地文件路径写入内容。


### 导航

- 顶级分类统一定义在 `src/content/navigation.ts` 的 `topSections` 中。文章 `category` 必须与目标 section 的 `label` 完全一致，首页和知识树才会正确归类。
- `children` 当前只用于展示主题说明，不是二级分类、路由或筛选条件。不要仅添加 child 就假设对应页面或过滤逻辑已存在。
- 修改顶级 `label` 时同步迁移已有文章的 `category`；修改 `path` 时使用 locale/base-path 安全的链接生成函数检查所有入口。
- Header、首页分类区块和文章知识树共享 `topSections`。调整结构时至少检查这三个消费者以及归档页的 `category` query。


### 新增站点

- 这里的“站点”指新增公开页面或内容入口。页面放在 `src/pages/`，沿用 `[...locale]` 路由结构但只为 `zh-cn` 提供 `getStaticPaths()`。
- 普通页面优先使用 `MainPageLayout.astro`，以继承 Header、Footer、Search、主题和页面过渡；只有需要修改完整 HTML 文档结构时才直接使用 `Layout.astro`。
- 新增界面文案时，维护 `src/i18n/key.ts` 和 `src/i18n/language/zh-cn.ts`。内容型长文优先放入 `src/content/spec/`，并按需先明确扩展其 schema。
- 新页面的内部链接必须通过 `getRelativeLocaleUrl()` 生成，静态资源通过 `baseUrl()` 生成；同时验证中文路由和非根 `BASE_PATH`。
- 若页面需要进入 Header、首页知识库或其他导航，显式修改对应数据源。文件路由的存在不会自动把页面加入导航。
- 新增新的独立应用或部署单元不属于普通“新增页面”，必须先说明构建、发布、配置和维护边界，获得确认后再实施。


## 命令参考

所有命令默认在仓库根目录执行，包管理器使用 pnpm。

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 安装根应用和 `cms` workspace 依赖 |
| `pnpm dev` | 启动 Astro 开发服务器 |
| `pnpm exec astro check` | 检查 Astro、TypeScript 和 Svelte |
| `pnpm build` | 构建静态站点并生成 Pagefind 索引 |
| `pnpm preview` | 预览 `dist/`；搜索功能应在此模式验证 |
| `pnpm newpost -- <路径> [语言]` | 创建文章，语言默认为 `zh-cn` |
| `pnpm cms` | 在 `http://localhost:5188` 启动本地 CMS |
| `pnpm --dir cms build` | 构建 CMS 前端，验证打包边界 |
| `pnpm --dir cms smoke` | 在 CMS 服务已启动时执行真实 CRUD 冒烟测试 |

### 验证要求

- 仅修改文档：核对文档中的路径、脚本名和配置字段；无需为了文档改动执行完整站点构建。
- 修改 Astro、TypeScript、Svelte、内容 schema 或公共工具：至少运行 `pnpm exec astro check`。
- 修改页面、路由、内容查询、Markdown 插件、构建配置或部署路径：运行 `pnpm exec astro check` 和 `pnpm build`。
- 修改搜索：完成生产构建后使用 `pnpm preview` 验证，因为 `pnpm dev` 不生成 Pagefind 索引。
- 修改 CMS 前端或服务端：运行 `pnpm --dir cms build`；涉及创建、保存、上传或删除时，在 CMS 服务运行期间执行 `pnpm --dir cms smoke`，并确认测试没有遗留文章。
- 修改布局、交互、主题或响应式样式：除命令检查外，手工检查桌面端和移动端、浅色和深色主题、键盘焦点与 `zh-cn` 路由。
- 只报告实际运行过的检查。若未运行或失败，明确说明原因，不通过删除校验、放宽 schema 或隐藏错误来制造通过结果。


## 技术约束

- TypeScript 继承 Astro strict 配置并启用 `strictNullChecks`；保持现有 `@/`、`@components/`、`@utils/` 等路径别名，不新增只做转发的模块。
- 正式 Markdown 渲染管线定义在 `astro.config.mjs`。CMS 预览复用其中的主要 remark/rehype 插件；修改插件、语法或顺序时必须同步检查 `cms/server/preview.mjs`，避免预览与生产渲染漂移。
- 样式优先复用 `src/styles/variables.css`、`global.css` 和 `markdown.css` 中的变量与全局规则；组件特有样式保留在组件内，避免复制站点级规则。
- `PUBLIC_SITE_URL` 控制生产站点绝对地址，未设置时回退到 `https://example.com`；`BASE_PATH` 控制部署前缀，未设置时为 `/`。涉及 URL 的改动必须兼容二者。
- 评论默认关闭，只有 `siteConfig.comments.enable` 为 `true` 且相应后端配置完整时才加载；不得使评论后端成为构建前提。
- `pageSize`、`PostPage.astro` 和 `Navi.astro` 当前未接入主页面调用链。除非需求明确要求分页，不要基于这些遗留代码恢复或扩展分页。
- CMS 面向本地或受控环境并拥有文件写入、上传和删除能力。不要将其直接暴露为公开生产服务，也不要削弱 `cms/server/store.mjs` 中的路径、符号链接和文件边界检查。
- GitHub Pages 工作流只在仓库名等于 `<owner>.github.io` 时部署；当前源代码仓库不会因普通 `main` 推送自动发布。不要在未确认目标仓库和 base path 时改变此门禁。


## 不要做的事

- 不要绕过 `src/content.config.ts`、`getBlogEntrySort()` 或 CMS store 各自承担的校验和边界。
- 不要手写 locale 前缀、部署前缀或拼接站内绝对路径。
- 不要把导航 `children` 当作已实现的二级分类系统，也不要为假设中的分类层级提前设计新模型。
- 不要让草稿进入公开构建、RSS 或搜索索引，不要无故改写既有 `slugId`。
- 不要为静态内容引入不必要的客户端 hydration、全局状态或运行时 API。
- 不要随意新增依赖、测试框架、兼容层、baseline、hash、冻结 contract 或额外 gate；先说明现有机制无法覆盖的具体失败场景。
- 不要提交 `dist/`、`.astro/`、`node_modules/` 或 CMS 冒烟测试生成的临时内容。
- 不要覆盖、回滚或混入与当前任务无关的工作区改动；提交、推送、发布和创建 PR 都需要用户明确授权。
