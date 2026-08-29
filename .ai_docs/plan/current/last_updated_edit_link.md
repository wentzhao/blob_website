# 增加文章最后更新时间与 GitHub 编辑链接实施计划

## 概述

### Feature Description

为博客文章 frontmatter 增加可选的 `updatedDate`，在文章详情页展示发布时间；仅当存在真实更新时间时再展示最后更新时间，并提供指向 GitHub 中实际 Markdown 源文件的“编辑”链接。首页/目录等统计在更新时间缺省时仍可用发布时间作为有效的最后更新时间，避免已有文章统计为空，同时避免详情页重复显示同一个日期。

编辑链接只属于文章详情页；首页、归档、知识目录、知识树、RSS、评论和其他自动生成页面不显示编辑入口。链接根据内容查询已经确定的 `sourceLocale` 生成，因此当前语言有源文件时指向当前语言文件；发生语言回退时指向实际被渲染的源文件，例如英文请求回退中文时指向同目录的 `zh-cn.md`。

本计划只描述实现方案，不创建或切换分支，不修改业务代码，不批量改写文章内容。

### User Benefits

- 读者能区分文章首次发布和最近一次内容更新。
- 旧文章无需立即补充 frontmatter，仍能显示稳定、合理的日期。
- 读者可以从文章详情直接打开对应的 GitHub 源文件进行编辑。
- 语言回退时编辑链接不会指向不存在的翻译文件。

### Project Alignment

- 复用 `src/utils/content-utils.ts` 已有的公开过滤、分组、`sourceLocale` 和 `isFallback` 语义，不重新扫描文章或推断语言。
- 复用 `src/utils/url-utils.ts` 作为 URL 生成边界；GitHub 源码链接是外部绝对 URL，不经过站内 locale/base path helper。
- 保持 Astro 静态生成、草稿过滤、中文-only 公开路由、目录树和 `slugId` 语义，不新增依赖或运行时 API。
- 因为 `updatedDate` 会进入 blog schema，未来实现需同步 CMS 的 frontmatter 类型、日期规范化和编辑表单，避免 CMS 保存时丢失或写出非法值。

### 计划分支名称

`feat/last_updated_edit_link`（仅记录，不创建或切换分支）。

## 需求分析

### Functional Requirements

1. 在 `blog` schema 中增加可选日期字段 `updatedDate`，类型与 `pubDate` 一致，允许缺省。
2. 明确定义日期语义：`pubDate` 是文章首次公开发布时间，不因后续编辑改变；`updatedDate` 是该语言源文件最近一次有意义的内容更新日期。
3. 提供统一的有效最后更新时间计算：`updatedDate ?? pubDate`，供首页/目录等统计使用；详情页缺少 `updatedDate` 时只显示发布日期，不额外渲染重复的“最后更新”字段。
4. 文章详情页展示发布时间；仅当存在 `updatedDate` 时展示最后更新时间，并展示 GitHub 编辑链接；日期使用实际渲染 entry 的数据。
5. GitHub 链接使用配置的仓库和分支，路径为 `src/content/blog/<文章路由 ID>/<sourceLocale>.md`。
6. 当当前语言存在源文件时，链接使用当前语言的 `sourceLocale`；当英文请求回退中文时，链接必须使用 `sourceLocale = zh-cn`，指向真实存在的 `zh-cn.md`，而不是拼接请求语言 `en.md`。
7. GitHub 链接在新标签页打开，使用 `rel="noopener noreferrer"`，具备适当的中文可访问名称。
8. 首页/知识库“最后更新”统计若继续使用该字段，必须改用统一的有效最后更新时间；首页最新列表、目录最近列表、归档面板和 RSS 保留发布列表语义并继续使用 `pubDate`，任何方案都不新增编辑链接。
9. 目录页、首页、归档/归档客户端列表、知识树、RSS、文章卡片、许可证卡片、文章前后导航及其他自动生成页面不显示编辑链接。
10. 不新增英文公开页面、英文路由或英文翻译文件；仅保留对现有 `sourceLocale`/fallback 数据语义的兼容，使回退上下文可以生成正确源文件链接。

### Non-Functional Requirements

- 静态构建期计算链接和日期，不依赖 GitHub API、CMS 服务或浏览器 JavaScript。
- 不新增依赖、测试框架、hash、冻结 contract、baseline 或额外发布 gate。
- 保持 strict TypeScript/Astro 类型、现有主题变量、键盘焦点、语义链接和中文界面文案。
- 外部仓库配置集中在现有配置入口；路径段需要安全编码，不能因文章 ID 中的层级、空格或特殊字符生成错误 URL。
- 保持 `BASE_PATH` 只影响站内链接；GitHub 编辑链接不得重复添加站点部署前缀。
- 保持草稿不进入公开页面；草稿不应通过编辑链接被公开渲染。

### Edge Cases

- 旧文章没有 `updatedDate`：详情页只显示 `pubDate`；首页/目录统计使用 `pubDate` 作为有效最后更新时间。
- `updatedDate` 与 `pubDate` 相同：详情页可显示两个语义相同但标签明确的日期；不隐式修改 frontmatter。
- `updatedDate` 晚于 `pubDate`：详情页显示更新时间；日期排序是否改变不属于本 feat 的默认行为。
- `updatedDate` 早于 `pubDate` 或格式非法：由 schema 与 CMS 服务端以严格 `YYYY-MM-DD` 和跨字段校验拒绝，不在 UI 中静默修正。
- 请求语言有对应源文件：链接最后一段为该语言文件名。
- 请求英文但 entry 为中文 fallback：链接最后一段必须为 `zh-cn.md`，日期也来自实际渲染的中文 entry。
- 文章 ID 为多级目录或包含需要 URL 编码的字符：GitHub URL 保留目录分隔关系并编码各个路径段。
- 仓库 URL 末尾已有 `/`、分支名变化或分支含特殊字符：配置和 URL helper 只产生一个分隔符并正确编码分支。
- 空目录、首页、归档、RSS 或其他自动生成页面：可继续显示已有统计/日期，但不出现“编辑”链接。
- 当前生产配置仅有 `zh-cn` locale：不为了验证 fallback 而扩大 `astro.config.mjs` 的静态路由生成范围。

### Dependencies

- `src/content.config.ts`：blog frontmatter schema。
- `src/utils/content-utils.ts`：`BlogEntryWithLocaleStatus`、`selectPublicBlogEntry()`、`getBlogEntrySort()` 和现有 `sourceLocale`/fallback 结果。
- `src/pages/[...locale]/blog/[...id].astro`：文章详情静态路径、entry 选择和文章元信息渲染。
- `src/utils/content-tree.ts` 与 `src/pages/[...locale]/[...page].astro`：知识树/首页统计中的“最后更新”日期，以及新增 Date 字段的不可变快照处理。
- `src/utils/time.ts`：日期解析和 `formatFullDate()`；增加面向 blog date-only 字段的稳定格式化路径，避免时区偏移和页面重复实现 fallback。
- `src/config.ts`、`src/types/config.ts`：仓库 URL/分支配置入口。
- `src/utils/url-utils.ts`：外部源文件 URL helper 及现有站内 URL/base path 边界。
- `src/i18n/key.ts`、`src/i18n/language/zh-cn.ts`：文章元信息和编辑链接的中文文案。
- `cms/server/store.mjs`、`cms/src/types.ts`、`cms/src/pages/EditorPage.ts`：schema 变更后的本地内容管理读写边界。
- Git 证据：`origin` 为 `https://github.com/wentzhao/blob_website.git`，默认分支按规则记录为 `main`；实现前仍需按 git 规则核对远程实际默认分支。

## 技术设计

### Architecture Overview

内容层在 `src/content.config.ts` 接受可选 `updatedDate`；公共查询层继续负责草稿过滤、逻辑文章分组和 locale 选择，并将 `sourceLocale` 作为编辑链接的唯一语言依据。文章详情页从静态 props 取得已经选定的 entry，使用共享日期 helper 和源码 URL helper 输出静态 HTML。

仓库配置只提供源代码仓库根 URL和目标分支，不把仓库信息散落在页面中。源码 URL helper 接收逻辑文章 ID与 `sourceLocale`，把 ID 各路径段编码后拼接为 GitHub `blob` URL。站内路由仍使用 `getRelativeLocaleUrl()`；外部 URL 不调用它。

### Component Breakdown

- **内容 schema**：`src/content.config.ts` 增加可选 `updatedDate`，采用严格 `YYYY-MM-DD` 与 `updatedDate >= pubDate` 校验。无需迁移现有 Markdown，也不在新文章模板中强制写同于发布日期的更新时间。
- **日期语义 helper**：在已有 `src/utils/time.ts` 或 `src/utils/content-utils.ts` 中提供只读、纯函数式的 `getBlogLastUpdated({ pubDate, updatedDate? })`，输入缺省时返回 `pubDate`，供统计使用；详情页用 `updatedDate` 是否存在决定是否渲染更新时间。blog frontmatter 日期的展示使用稳定的 date-only 格式化路径，不能依赖运行环境本地时区。
- **不可变内容树**：`src/utils/content-tree.ts` 的 `immutableArticleData()` 若复制 Date 字段，必须像 `pubDate` 一样复制/冻结 `updatedDate`；目录 summary 的有效最后更新时间改用统一 helper。目录页面只消费统计结果，不获得编辑链接。
- **首页统计**：`src/pages/[...locale]/[...page].astro` 的站点及分类 `lastUpdated` 计算改用有效最后更新时间；首页最新列表继续使用 `pubDate`，并明确为发布列表。
- **文章详情页**：`src/pages/[...locale]/blog/[...id].astro` 计算 `updatedDate` 是否存在和 `sourceUrl`，在现有 `.article-meta` 内加入发布时间、条件式最后更新时间和 GitHub 编辑链接；使用 `entry.sourceLocale`，不得使用只代表请求页面的 locale 变量拼接源文件名。
- **站点文案**：在公开中文 `Translation` 类型及中文翻译中增加文章发布日期、最后更新和编辑源文件所需 key；legacy `en.ts` 不承担公开中文 key，不恢复或新增英文公开页面。
- **CMS 适配**：为 `FrontmatterData` 增加可选字符串字段；`emptyData()`、语言切换和 `script/newpost.js` 均只提供 `pubDate`，不自动生成初始 `updatedDate`；CMS 保存时比较原始与新正文/内容元数据，检测到实际内容变化才自动写入当天 `updatedDate`，仅预览、无变化保存、切换语言或修改草稿状态不触发更新；作者可手动覆盖或清空该字段。`store.mjs` 统一规定 `null`、空字符串和空白值删除 `updatedDate`，非空值必须是严格合法日期且不早于 `pubDate`，非法值返回保存错误而不是静默写入。
- **不变更的生成页**：沿 `MainPageLayout -> KnowledgeTree`、首页 `SectionOverview`/最新列表、`DirectoryPage.astro`、`ArchivePanel.svelte`、`PostCard.astro`、RSS、`LicenseCard.astro` 和 `BlogNavi.astro` 的调用链逐一确认，不向这些共享/自动生成组件下放编辑入口；它们仅按需要接收 schema 类型推导出的字段或使用统一统计值。

### Data Flow

`Markdown frontmatter -> blog schema(updatedDate?) -> getPublicBlogEntryGroups() -> selectPublicBlogEntry(requestedLocale) -> BlogEntryWithLocaleStatus(sourceLocale,isFallback) -> article detail`。

文章详情和统计中的派生值为：

```ts
const lastUpdated = getBlogLastUpdated(entry.data); // 统计值：updatedDate ?? pubDate
const sourceUrl = getBlogSourceUrl(entry.id, entry.sourceLocale);
```

详情页只有在 `entry.data.updatedDate` 存在时渲染 `lastUpdated`；缺省时只渲染 `pubDate`。这与首页/目录统计使用降级日期是两个明确不同的展示语义。

当请求语言为当前源语言时，`sourceLocale` 为该语言；当请求语言没有文章版本时，现有选择逻辑返回默认语言 entry，`sourceLocale` 为 `zh-cn`，因此 URL 使用 `.../<id>/zh-cn.md`。当前 `astro.config.mjs` 和各页面 `getStaticPaths()` 只生成 `zh-cn`，本 feat 不改变该边界。

首页/目录统计只消费 `getBlogLastUpdated(article.data)`。它们可显示有效日期，但没有 `sourceUrl` 的渲染分支，从数据流上保证自动生成页面不出现编辑链接。首页最新列表、目录最近列表、归档面板和 RSS 保持 `pubDate` 的发布列表语义，不改动既有排序与 RSS 时间。

更新时间的来源与维护方式：`updatedDate` 仍存储在文章源文件 frontmatter 中，例如 `updatedDate: 2026-08-28`，是网站构建时读取的正式数据源。文章首次创建或没有实际维护时省略该字段；通过 CMS 保存正文或内容元数据发生变化时，由 CMS 自动写入当天日期，作者也可手动覆盖或清空。网站不读取构建时间、文件系统 mtime 或 Git 提交时间；直接编辑 Markdown 时若不经过 CMS，仍需手动维护该字段。

### Configuration Changes

- 在 `src/config.ts` 增加独立的源代码仓库配置，例如：

  ```ts
  export const sourceRepository = {
    url: "https://github.com/wentzhao/blob_website",
    branch: "main",
  } as const;
  ```

- 如项目类型约定需要，在 `src/types/config.ts` 为该配置增加明确类型；不要把 GitHub 地址硬编码到文章页。
- 默认使用当前 `origin` 对应仓库和 `main`，实现前核对远程默认分支；不新增环境变量，除非实际部署有多个源仓库且现有配置无法表达。
- 不修改 `astro.config.mjs` 的 `locales: ['zh-cn']`、`prefixDefaultLocale`、`BASE_PATH` 或 GitHub Pages 部署门禁。

### API/Interface Definitions

```ts
type BlogDateData = {
  pubDate: Date;
  updatedDate?: Date;
};

function getBlogLastUpdated(data: BlogDateData): Date;

function getBlogSourceUrl(articleId: string, sourceLocale: string): string;
```

约束：`getBlogLastUpdated()` 不修改输入日期；blog date-only 格式化 helper 必须以日期本身的年月日稳定输出，不受构建机本地时区影响；`getBlogSourceUrl()` 只接受内容层已选出的 `sourceLocale`，不得在 helper 内自行 fallback 或读取 collection。仓库配置限定为 HTTPS GitHub 仓库根 URL（去除末尾 `/` 和可选 `.git`）；helper 独立构造绝对 URL，不复用只面向站内路径的 `joinPath()`。固定源码根路径为 `src/content/blog`，分支路径段按 GitHub 规则编码并保留分支层级，文章 ID 各段与 locale 文件名分别编码。路径格式固定为：

`<repositoryUrl>/blob/<branch>/src/content/blog/<encoded article id segments>/<encoded sourceLocale>.md`

文章页编辑链接的语义 HTML 约定为外部链接、新标签页、`rel="noopener noreferrer"`，可见中文文案明确表示“编辑源文件/在 GitHub 编辑”。

### Key Design Decisions and Alternatives

1. **字段名选择：`updatedDate`**。它与现有 `pubDate` 成对、可直接映射到 `Date`；备选 `lastUpdated` 更容易与目录 summary 的派生字段混淆，排除。
2. **缺省更新时间：区分统计与详情展示**。统计使用 `updatedDate ?? pubDate`，详情缺省时只显示 `pubDate`，避免重复日期且保留旧文章兼容；备选是详情始终显示回退后的“最后更新”，会违反“无更新时间只显示发布日期”的需求。
3. **编辑链接依据 `entry.sourceLocale`**。这是现有 fallback 选择的事实结果；备选依据请求 locale 拼接会在中文回退的英文页面产生不存在的 `en.md`，排除。
4. **编辑链接只放文章详情页**。详情页拥有明确的文章源文件上下文；备选将链接放入卡片、目录或首页会使自动生成页出现重复入口并扩大 UI 范围，排除。
5. **列表日期语义（已决策：选项 A）**。首页最新、目录最近、归档面板和 RSS 保留 `pubDate` 排序/展示，并将对应文案明确为“最新发布/发布日期”；只有文章详情的显式 `updatedDate` 和首页/目录统计使用最后更新时间语义，避免扩大 RSS 与归档行为变化。
6. **仓库配置使用静态常量**。当前只有一个明确源仓库；备选读取 Git remote 或构建期 Git 命令不适用于静态部署且增加构建耦合，排除。
7. **不扩大英文公开路由**。当前代码证据显示 Astro 只注册 `zh-cn`；fallback URL 逻辑仍按 `sourceLocale` 设计，以覆盖已有数据选择能力，不借本 feat 恢复英文页面。
8. **更新时间校验强度（已决策：选项 A）**。采用严格 `YYYY-MM-DD` 校验，并要求 `updatedDate >= pubDate`；schema 与 CMS 服务端保持同一规则，优先保证日期语义可靠。
9. **翻译类型兼容（已决策：选项 B）**。拆分公开中文翻译类型与未注册的 legacy 类型，不恢复英文公开页面，也不通过可选字段掩盖新增 key 缺失。

### Confirmed User Decisions

1. **Challenge 3：严格校验 `updatedDate` — 选择 A**
   - schema 使用严格 `YYYY-MM-DD` 校验，并增加 `updatedDate >= pubDate` 的跨字段校验；CMS 同步同一规则。代价是扩大 schema contract、CMS 保存逻辑和错误处理范围；收益是数据语义强、错误尽早暴露。
2. **Challenge 7：保持 `Translation` 类型完整 — 选择 B**
   - 拆分公开中文翻译类型与未注册的 legacy 类型，不新增英文公开文案或英文页面。代价是类型层调整范围更大；收益是保持中文-only 边界，不修改 legacy 英文翻译文件。
3. **Challenge B：列表使用发布日期 — 选择 A**
   - 首页最新、目录最近、归档和 RSS 保留 `pubDate` 排序/展示，并明确为发布语义。代价是列表不反映维护时间；收益是保持现有排序、RSS 和前后导航稳定，控制本 feat 范围。

## 实施策略

### Implementation Phases

1. **实现前核对**：确认工作区无关改动、远程仓库默认分支、所有 `getBlogEntrySort`/`getContentTree` 调用方和文章详情布局；确认目标仍只修改计划列出的文件。
2. **内容与派生值**：增加 `updatedDate` schema、共享有效日期 helper 和稳定 date-only 格式化路径，更新 content tree 日期快照及首页/目录统计，保持发布日期排序和草稿过滤。
3. **源码 URL 与配置**：增加源仓库配置和 URL helper，按路径段编码；用 `entry.id + entry.sourceLocale` 生成绝对 GitHub `blob` 链接。
4. **文章详情 UI**：增加中文文案，在文章元信息中展示发布时间；仅在存在真实 `updatedDate` 时展示最后更新时间和编辑链接；保持新标签页、焦点样式和移动端换行。
5. **CMS 同步**：更新 CMS frontmatter 类型、日期规范化和编辑表单；验证空值不会破坏 schema，且保存文章不会丢失既有 `updatedDate`。不修改 CMS 的公开部署边界。
6. **边界审查与验证**：检查 fallback、旧文章、特殊路径、非根 `BASE_PATH`、非东八区日期展示、主题/键盘/响应式和自动生成页面无编辑链接；执行分开的根项目/CMS 命令并记录实际结果。

### File Structure Changes

| 文件 | 计划变更 |
| --- | --- |
| `src/content.config.ts` | 增加可选 `updatedDate` 日期字段 |
| `src/utils/content-utils.ts` 或 `src/utils/time.ts` | 增加统一的 `updatedDate ?? pubDate` helper；在已有日期工具中增加稳定 date-only 格式化路径；最终只选一个职责合适的位置 |
| `src/utils/content-tree.ts` | 冻结/复制新增 Date 字段；目录 summary 使用有效最后更新时间 |
| `src/pages/[...locale]/[...page].astro` | 首页及分类最后更新时间使用统一 helper |
| `src/config.ts` | 增加源代码仓库 URL 和分支配置 |
| `src/types/config.ts` | 如采用显式配置类型则增加仓库配置类型 |
| `src/utils/url-utils.ts` | 增加 GitHub 文章源文件 URL helper |
| `src/pages/[...locale]/blog/[...id].astro` | 展示更新时间和文章详情编辑链接 |
| `src/i18n/key.ts`、`src/i18n/language/zh-cn.ts` | 增加中文元信息/编辑链接文案 |
| `cms/src/types.ts` | 增加可选 `updatedDate` 字段 |
| `cms/server/store.mjs` | 规范化非空更新时间，保留/清理空值 |
| `cms/src/pages/EditorPage.ts` | 增加可选更新时间输入、事件绑定和表单同步；`emptyData()`/语言切换不得自动填充 |
| `src/content/blog/**` | 默认不改；只有明确知道真实修改日期时才由后续实施者单独补充 |
| `script/newpost.js` | 默认只生成 `pubDate`，不生成或回填 `updatedDate` |
| `astro.config.mjs`、`.github/workflows/*` | 不改，仅验证 locale、站点 URL/base path 和部署边界 |

### Code Locations

- schema：`src/content.config.ts` 的 `blogCollection.schema`。
- fallback：`src/utils/content-utils.ts` 的 `selectPublicBlogEntry()` 和 `BlogEntryWithLocaleStatus`。
- 日期快照/目录统计：`src/utils/content-tree.ts` 的 `immutableArticleData()`、`getDirectorySummary()`。
- 首页统计：`src/pages/[...locale]/[...page].astro` 的 `categorySummaries` 与全站 `lastUpdated`。
- 详情元信息：`src/pages/[...locale]/blog/[...id].astro` 的 `entry` 解构、`article-meta` 和局部样式。
- 外部 URL：`src/utils/url-utils.ts` 的 `baseUrl()`/`getRelativeLocaleUrl()` 附近新增独立 helper。
- CMS：`cms/server/store.mjs` 的 `normalizeData()`/`scanArticles()`/`saveArticle()`，以及 `EditorPage.ts` 的 `emptyData()`、表单构建、`bindForm()` 和 `syncForm()`。

### Integration Points

- `getBlogEntrySort()` 的返回类型会自动携带 schema 新字段；其默认发布日期排序保持不变。
- 文章页静态 props 继续来自 `getBlogEntrySort()` 和 `getArticleTreeContext()`，不在页面内重新 `getCollection()`。
- content tree 的 readonly 语义必须覆盖 `updatedDate`，否则目录/文章共享快照会出现可变 Date。
- `sourceRepository` 与 `blogSourceUrl()` 是唯一 GitHub 源码链接入口；页面不得重复拼接仓库 URL。
- `MainPageLayout`、`KnowledgeTree`、目录页和自动生成列表不需要新增 prop；编辑入口不应向这些组件下传。
- CMS 只服务本地/受控环境；同步字段时不得削弱 `store.mjs` 既有路径、符号链接、slugId、directory 和草稿保护。

### Assumptions

- `updatedDate` 以日为粒度，和现有 `pubDate` 一样使用 `YYYY-MM-DD` 语义，不记录时分秒。
- `updatedDate` 记录被渲染语言源文件的更新时间；中文 fallback 页面使用中文源文件的 frontmatter 和中文源文件链接。
- 当前仓库 `origin` 与 README/规则中的 `wentzhao/blob_website` 一致，目标分支暂定 `main`；正式实现前再次核对远程默认分支。
- 当前公开站点只有 `zh-cn`；英文 fallback 作为现有选择器的兼容场景验证，不意味着本 feat 新增英文路由或英文内容。
- 不自动根据文件系统 mtime 计算更新时间，因为静态构建、Git checkout 和部署过程不能提供稳定内容语义。
- CMS 中更新时间由内容变化触发自动维护，并保留作者手动覆盖/清空能力；新建、预览、无变化保存、切换语言和修改草稿状态不自动生成更新时间，避免写入伪造日期。
- 只新增/修改本计划文档，不创建分支、提交、推送、PR 或业务代码。

## 测试计划

默认只写手工验证和既有命令，不设计新的测试模块或测试框架。未来实施时只报告实际执行的检查结果。

### Test Scenarios

1. 运行根项目 `pnpm exec astro check`，确认新增 schema 字段、helper、文章 props、翻译 key 和 content tree readonly Date 无错误；该命令不替代 CMS 检查。
2. 运行根项目 `pnpm build`，确认 Astro 静态构建和 Pagefind 生成成功，现有草稿过滤、中文文章路由、RSS 和目录页仍正常。
3. 使用没有 `updatedDate` 的现有文章打开详情页：只显示发布时间，不重复显示“最后更新”；编辑链接指向 `src/content/blog/tech/getting-started/zh-cn.md`。
4. 在受控临时文章或本地 frontmatter 中加入合法 `updatedDate`，确认发布时间保持原值，详情页最后更新时间显示新日期；列表仍按 `pubDate` 排序与展示；验证结束前删除临时文章/恢复原文件。
5. 检查当前语言源文件场景：source locale 为中文时链接末尾是 `zh-cn.md`；用未提交的内存 fixture 直接验证 `selectPublicBlogEntry()` 与 `getBlogSourceUrl()` 的英文请求回退中文输入/输出，确认 `sourceLocale` 和 URL 仍指向 `zh-cn.md`；不新增英文 route/content。
6. 对存在当前语言源文件的数据上下文验证链接使用实际 `sourceLocale`，而不是页面请求 locale；不为此修改当前中文-only 静态生成配置。
7. 验证多级文章 ID、含空格/特殊字符的路径段、仓库 URL 末尾斜杠、可选 `.git` 后缀及含 `/` 分支名不会产生双斜杠、未编码空格或错误目录层级；确认 helper 独立于 `joinPath()` 构造绝对 URL，并按路径段分别编码。
8. 以根路径和 `BASE_PATH=/blob_website` 构建/预览，确认站内链接只带一次 base path，GitHub 外部链接不带站点 base path。
9. 在非东八区时区环境或等价的 date-only formatter 验证中检查 `YYYY-MM-DD` 不因本地时区显示前一天；评论时间等带时刻日期继续遵循原有 formatter 语义。
10. 检查首页、知识目录、知识树、归档列表、文章卡片、RSS 页面源和其他自动生成页：可以保留/显示统计日期，但不出现编辑链接或 GitHub 源文件入口。
11. 单独运行 `pnpm --dir cms build`，确认 CMS 独立 workspace 的类型/打包通过；启动 CMS 后运行 `pnpm --dir cms smoke`，并额外直接验证 `emptyData()`/语言切换/`script/newpost.js` 不产生初始更新时间，正文/内容元数据变化会自动更新日期，而预览、无变化保存和草稿状态变化不会更新；同时验证合法日期、`null`、空字符串、空白值和非法日期提交，确认空值移除、非法值拒绝且既有字段不丢失。
12. 桌面与移动端检查详情元信息换行、外链新标签页、`noopener noreferrer`、键盘 Tab 焦点、浅色/深色主题和可读对比度；至少覆盖 375px、640px、1024px 和桌面宽度。
13. 完成临时数据清理后执行 `git status --short`，确认工作区只包含计划文档和预期业务文件，没有 `dist/`、`.astro/`、CMS 临时文章或其他无关改动。

### Test Data and Expected Results

| 数据/页面 | 预期结果 |
| --- | --- |
| 现有文章，无 `updatedDate` | schema 通过；详情页只显示 `pubDate`；首页/目录统计可用 `pubDate`；详情页有一个正确的 GitHub 中文源文件链接 |
| 文章含合法 `updatedDate` | 发布时间不变；详情页最后更新时间显示 `updatedDate` |
| 内存 fixture 的英文请求回退中文 | `entry.isFallback` 为真时仍使用 `entry.sourceLocale`；链接指向真实 `zh-cn.md`；不新增公开英文路由 |
| 当前语言有源文件 | 直接 helper 输入 `sourceLocale` 后，链接指向同目录对应语言的 `.md` 文件 |
| 多级/特殊文章 ID | GitHub `blob` 路径保留层级，特殊段正确编码 |
| 空目录/首页/归档/RSS | 既有页面行为正常；不渲染编辑链接 |
| CMS `null`/空字符串/空白更新时间 | 保存后字段缺省或被安全移除，Astro schema 不因空字符串失败 |
| CMS 非法更新时间 | API/保存操作拒绝并返回明确错误，不静默写入 |
| 根路径与非根 `BASE_PATH` | 站内 URL 前缀正确；外部 GitHub URL 不受 `BASE_PATH` 污染 |
| 草稿文章 | 继续不进入公开静态页面、目录、RSS 或编辑入口 |

## 验收标准

### Success Metrics

- [ ] blog schema 接受可选 `updatedDate`，现有无该字段的文章可以成功构建。
- [ ] 文章详情页展示发布时间；只有存在真实 `updatedDate` 时才显示最后更新时间，缺省时不重复显示发布日期。
- [ ] `sourceLocale` 为当前语言时，编辑链接指向对应语言真实 Markdown 源文件。
- [ ] locale fallback 时，编辑链接指向实际渲染源文件；英文请求回退中文时明确为 `zh-cn.md`。
- [ ] GitHub 仓库和分支来自集中配置，独立绝对 URL helper 正确处理 `.git`/斜杠、路径编码、分支层级、`noopener noreferrer` 和 base path 边界。
- [ ] 目录页、首页、归档、知识树、RSS 和其他自动生成页面没有编辑链接。
- [ ] 中文-only 路由、草稿过滤、发布日期排序、目录结构、`slugId`、评论标识和静态部署边界没有被改变。
- [ ] content tree 新增 Date 字段仍保持不可变快照；CMS 可安全读取、编辑、清空和保存更新时间。
- [ ] 根项目 `pnpm exec astro check`、`pnpm build` 与独立的 `pnpm --dir cms build`/`pnpm --dir cms smoke` 均分开执行，并只在实际执行后报告结果。
- [ ] date-only 日期在非东八区验证中不偏移；临时文章已清理，`git diff --stat`/`git status --short` 只包含计划文档和预期业务文件，未提交构建产物或无关改动。

### User Acceptance

用户打开一篇旧文章时能看到发布时间（不重复显示缺省的最后更新时间），并能通过“在 GitHub 编辑”打开正确的中文源文件；补充更新时间的文章显示新日期且不篡改发布时间。任何自动生成的目录、首页、归档或 RSS 页面都不出现编辑入口；若存在英文请求回退中文的上下文，链接仍准确落到实际中文 Markdown 源文件。

## 挑战整合记录

1. **Challenge 1 — accept**：区分统计与详情展示；`updatedDate` 缺省时详情页只显示 `pubDate`，统计仍使用 `updatedDate ?? pubDate`，避免重复日期。
2. **Challenge 2 — accept**：不扩大当前中文-only 路由；英文 fallback 通过未提交的内存 fixture 验证 `sourceLocale` 和源码 URL，明确当前生产没有英文 blog 文件/页面。
3. **Challenge 3 — escalate → resolved**：用户选择严格 `YYYY-MM-DD` 和 `updatedDate >= pubDate` 校验，并同步到 CMS 服务端。
4. **Challenge 4 — accept**：增加 blog date-only 的稳定格式化路径，并加入非东八区验证；不改变评论等带时刻日期的既有 formatter 语义。
5. **Challenge 5 — accept**：明确 CMS 对 `null`、空字符串、空白、合法值和非法值的服务端规范化/拒绝规则，并增加直接 API 验证。
6. **Challenge 6 — accept**：拆分根项目和 CMS 验证命令；`astro check` 不再被描述为覆盖 CMS，CMS 变更单独运行 `pnpm --dir cms build`，写入场景再运行 smoke。
7. **Challenge 7 — escalate → resolved**：用户选择拆分公开中文翻译类型与 legacy 类型，不新增英文公开文案，不以可选字段掩盖遗漏。
8. **Challenge 8 — accept**：源码 URL 使用独立绝对 URL 构造，固定 `src/content/blog`，规范 `.git`/斜杠、分支层级和各路径段编码，不复用 `joinPath()`。
9. **Challenge 9 — accept**：外链属性统一为 `target="_blank" rel="noopener noreferrer"`，并纳入验收。
10. **Challenge 10 — accept**：临时文章验证后必须删除/恢复；最终工作区断言改为“计划文档和预期业务文件”，同时排除构建产物、CMS 临时文章和无关改动。
11. **Challenge A — accept**：英文 fallback 不按当前不存在的公开英文页面验收，改为直接验证 `selectPublicBlogEntry()`/`getBlogSourceUrl()` 的 fixture 输入输出；不新增英文页面。
12. **Challenge B — escalate → resolved**：用户选择保留 `pubDate` 发布列表语义，不改变首页、目录、归档和 RSS 的排序/时间字段。
13. **Challenge C — accept**：明确 `emptyData()`、语言切换和 `script/newpost.js` 不自动生成初始 `updatedDate`；CMS 仅在检测到正文/内容元数据变化时自动更新，空值删除，作者可显式覆盖或清空。
14. **Challenge D — accept**：明确 GitHub 源路径按路径段分别 `encodeURIComponent`，保留多级目录结构，不整条路径编码。
15. **Challenge E — accept**：补充 `MainPageLayout -> KnowledgeTree`、首页/`SectionOverview`、目录、归档、RSS、许可证和前后导航调用链，保证共享/自动生成组件不下放编辑链接。
