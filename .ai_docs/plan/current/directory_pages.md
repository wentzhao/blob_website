# 全站中文博客与目录页面实施计划

## 概述

### Feature Description

将本站收敛为只发布中文内容的中文博客，并为每一个通过 `src/content/directory-tree.json` 注册且通过现有目录拓扑校验的目录生成中文独立静态页面，把首页/头部中的目录标签升级为可继续探索的内容入口。

页面路由继续采用默认中文 locale 的逻辑形式 `/knowledge/<directoryId>/`，最终 URL 由现有中文 URL helper 和 `BASE_PATH` 处理。例如当前真实目录 `deep-learning/paper-reading/transformer` 对应 `/knowledge/deep-learning/paper-reading/transformer/`；不凭空引入示例中的 `web/astro`，若未来注册该目录则自动拥有同样形式的中文页面。全站不再生成英文公开页面或 `/en/` locale 路由。

每个有效目录页面展示中文目录名称、说明、直属子目录、目录子树内的中文公开文章、最近更新内容、公开文章总数和最后更新时间。页面数据只来自已过滤草稿的中文内容树，不维护每个目录的手工文章清单。

### User Benefits

- 用户可以从首页、头部导航或目录页继续进入任意层级，而不是停留在不可点击的分类标签。
- 每个目录都能直接回答“这里有多少篇公开文章、最近更新是什么、最后更新于何时”。
- 父目录的统计覆盖整个目录子树，空目录仍可访问并能继续进入已注册的子目录。
- 中文公开站点只使用中文目录文案、中文文章和中文页面；英文源内容的迁移/清理必须显式盘点，不能静默丢失。
- 站点部署在根路径或 `BASE_PATH` 子路径时，目录和文章链接保持可用。

### Project Alignment

- 复用当前 `Astro Content Collections -> getPublicBlogEntryGroups() -> getContentTree("zh-cn") -> 静态页面` 数据流，并将站点公开 locale 收敛为中文；不引入运行时 API、客户端状态、分页或第三方依赖。
- 复用 `src/utils/content-tree.ts` 的目录注册表校验、中文公开内容快照和不可变树；不在目录页面内另写 `getCollection()` 或草稿过滤逻辑，也不读取英文内容聚合。
- 普通中文页面使用 `MainPageLayout.astro`，页面主体使用现有 CSS 变量和目录型知识库组件风格；不实施 `.ai_docs/plan/current/note-site-directory-style.md` 中超出本 feat 的整站视觉重构。
- 目录身份仍是稳定 `directory` ID，文章身份仍是逻辑文章路由 ID，`slugId` 不变；不从物理文章文件夹推断目录层级。

### 计划分支名称

`feat/directory_pages`（仅记录，不创建或切换分支）

## 需求分析

### Functional Requirements

1. 对 `directoryDefinitions` 中每个有效目录生成中文静态页面；目录是否有中文公开文章不影响页面是否生成。全站不生成英文公开页面或 `/en/` locale 路由。
2. 页面标题区显示中文目录名称和说明，并提供从根到当前目录的可探索路径；祖先链接、子目录链接和文章链接都使用中文 locale 的统一 URL 工具。
3. 页面显示直属子目录。每个子目录至少显示名称和说明，并链接到对应目录页面；不把 `children` 当作无语义说明文本。
4. 页面显示当前目录子树内的所有中文公开逻辑文章，每篇文章只显示一次；英文内容不进入公开站点、目录页面或统计。
5. 页面显示“文章总数”，统计中文公开文章中当前目录及所有后代目录的逻辑文章数量，而不是语言文件数量。
6. 页面显示“最近更新内容”，从同一目录子树的公开文章按 `pubDate` 降序取固定上限的短列表（默认 5 篇）；每项可进入文章详情。完整文章列表仍展示全部公开文章。
7. 页面显示“最后更新时间”，取中文公开文章子树的最大中文 `pubDate`；没有中文公开文章时显示中文无更新状态，不使用文件 mtime 或构建时间。
8. 目录页面及其聚合数据必须完全依赖中文公开内容树：`draft: true` 的中文文章不得进入文章列表、文章总数、最近更新或最后更新时间；英文文章不进入公开构建。
9. 将首页/头部中的顶级目录入口从归档分类查询链接升级为中文目录页面链接；首页直属子目录由非链接文本改为目录页面入口。现有归档分类查询仍保留给明确的分类筛选消费者。
10. 未知中文目录 ID 不生成静态页面，也不静默显示为“未分类”；静态部署按现有中文 404 语义处理，树查询继续返回 `undefined`。有效但空的目录必须生成正常中文空状态页面。
11. 站点只生成中文首页、文章、归档、RSS、404 和目录页面；删除右上角中英文切换键，停止生成英文公开页面/locale 路由。英文源内容、英文 spec、英文 i18n 和英文 fallback 的迁移/清理按内容迁移边界处理，不得静默丢失；中文文章路由 ID、`slugId`、draft 规则和 `BASE_PATH` 兼容性保持。
12. 目录页面必须从 Pagefind 索引中排除，目录页展示的文章标题/说明不得成为搜索文档；搜索只索引中文文章详情页。

### Non-Functional Requirements

- 静态生成：目录数据和统计在构建期完成，目录页面不请求 CMS、本地 API 或运行时后端，不引入客户端 hydration。
- 单一公开语义：目录页面只能消费 `getContentTree()` / `getDirectoryTreeContext()`，不得直接扫描 collection 或复制语言选择、草稿过滤逻辑。
- 可维护性：目录的名称、说明、父子关系和页面集合均由目录注册表驱动；不新增按目录 ID 分支的手写页面或文章清单。
- URL 安全：逻辑目录路径由当前已存在的安全目录 ID 生成，站内 URL 统一经过 `getRelativeLocaleUrl()`；`getRelativeLocaleUrl()` 已通过 `baseUrl()` 处理 `import.meta.env.BASE_URL`，不得手写 locale 或拼接 `BASE_PATH`。本 feat 不新增目录 ID 正则门禁，当前范围仅覆盖注册表中的 slash-separated ASCII ID。
- 语言边界：公开站点固定为中文；astro locale 配置、页面静态路径、文章查询、Header 和文案入口均不得再生成英文公开页面。英文源文件的去留必须经过迁移/清理步骤，不能因停止发布而静默丢失。
- 性能边界：复用按中文 locale 缓存的内容树；统计只在构建期进行，不设计数据库、索引文件、缓存持久化或新的测试框架。
- 可访问性：目录层级使用语义标题、列表和链接；空状态可读；键盘焦点沿用现有全局样式并手工检查。

### Edge Cases

- **空目录**：有效目录仍生成页面；文章总数为 0，最后更新时间显示无更新，最近更新和完整文章区显示本地化空状态；其子目录仍可进入。
- **父目录无直属文章但后代有文章**：父目录文章总数、最近更新和最后更新时间包含所有后代文章；“直属子目录”仍单独展示，避免把后代文章误列为直属文章。
- **叶子目录无文章**：显示名称、说明和空状态，不生成伪造文章或默认分类。
- **英文文章源文件**：公开站点不再读取或生成 `en.md`；实施阶段必须逐篇盘点，能保留的信息迁移为中文，需下线的源文件先登记/归档后再删除，不能静默丢失。
- **英文 spec 源文件**：`src/content/spec/**/en.md` 不再作为公开页面输入；实施阶段必须按关于页、友链等消费者逐项迁移中文内容或登记归档/删除。
- **英文 i18n 文件**：`src/i18n/language/en.ts` 不再作为公开 locale 文案来源；删除或迁移前必须确认 `src/i18n/key.ts`、页面和组件没有剩余引用。
- **仅英文文章**：不进入中文目录页、中文统计、中文归档、中文 RSS 或中文 Pagefind；其原有信息必须在迁移清单中标注去向或保留状态。
- **英文 fallback**：公开内容查询不再使用英文 fallback；中文缺失时不以英文补齐，英文 fallback 逻辑及相关分支应在实施阶段清理或迁移，并记录影响。
- **目录文案缺失**：当前 `validateDirectoryDefinitions()` 要求 `zh-cn`/`en` 标签和说明均存在；全站公开只使用中文字段，但注册表校验是否同时收紧为仅要求中文字段列入配置变更核对，不能在本计划阶段静默放宽错误。
- **公开文章缺少、填写未知或跨译文不一致的 `directory`**：沿用 `content-tree.ts` 的构建期错误，不在目录页中吞错或归入未分类。
- **未知目录路径**：不在 `getStaticPaths()` 中生成；静态宿主显示 404。不得将任意路径解释为目录 ID 后渲染空页面。
- **目录 ID 含多级 `/`**：使用 rest 参数 `[...directory].astro` 和 URL helper 传递稳定 ID；不得对 ID 再次错误编码成单段路径。
- **locale 路径**：只生成中文默认路由 `/knowledge/.../`；英文 `/en/` 页面和 locale 路由停止生成。旧 `/en/` 链接按中文 404 或重定向策略记录，实施时依据当前代码能力落地。非根 `BASE_PATH` 由 helper 统一加在最外层，例如 `/blob_website/knowledge/.../`。
- **语言切换**：右上角中英文切换键直接删除；不新增目录页专用开关，也不在 Layout/Header 保留语言切换 prop。
- **Pagefind 排除**：目录页最外层内容使用 `data-pagefind-ignore`，覆盖标题、说明、统计、子目录、最近更新和完整文章列表，避免其中的文章标题/说明被索引；非文章页面同样不得成为搜索文档，生产索引必须验证只保留文章详情页。
- **BASE_PATH + Pagefind**：停止依赖源码中的 `en/` locale 判断；必须在生产构建/预览中用实际返回 URL 验证中文文章 URL 和 `BASE_PATH`，不得将 base 段误判为路由内容。
- **时间并列**：最后更新时间相同按现有文章排序规则保持确定性；最近更新可按 `pubDate` 降序后用文章 ID 作为稳定次序兜底，避免构建结果抖动。
- **文章日期**：中文目录只读取中文公开文章 `pubDate`；英文日期不进入公开构建或任何统计。
- **最近更新与置顶**：最近更新按日期语义排序，不让 `pinTop` 把较旧文章错误排到“最近更新”之前；完整文章列表可保留树中现有 `pinTop` 优先、日期降序的展示排序，但必须在计划实现时明确并保持稳定。

### Dependencies

- `src/content/directory-tree.json`：有效目录、稳定 ID、父子关系和中文目录名称/说明的原始定义；英文字段的迁移/清理须先盘点。
- `src/content/navigation.ts`：目录定义验证、中文文案选择和 `topSections` 投影；为中文目录入口增加独立逻辑路径，移除英文公开入口依赖。
- `src/content.config.ts`：blog 的 `directory`、`draft`、`pubDate` 等字段 schema；本 feat 不扩展 schema。
- `src/utils/content-utils.ts`：公开逻辑文章分组、草稿过滤和中文版本选择；清理英文 fallback，目录页及全站公开查询固定请求中文版本。
- `src/utils/content-tree.ts`：当前已构建 `DirectoryNode`、直属文章、祖先链和 `getDirectoryTreeContext()`；需要补充子树聚合统计接口/字段。
- `src/utils/url-utils.ts`：`getRelativeLocaleUrl()` 与 `baseUrl()` 是 locale/BASE_PATH 链接边界；如重复构造目录 URL，优先在此处增加有语义的目录 URL helper，而不是新建转发模块。
- `src/layouts/MainPageLayout.astro`、`src/components/knowledge/SectionOverview.astro`、`src/components/knowledge/KnowledgeTree.astro`、`src/components/Header.astro`：中文页面外壳和目录入口消费者；删除 Header 的语言切换键及 Layout/Header 语言切换接口。
- `src/i18n/`：保留中文公开页面所需的翻译 contract；英文语言文件需盘点、迁移或清理，不再作为公开入口文案来源。
- `astro.config.mjs`：当前 locales、默认 locale、`prefixDefaultLocale` 和 `base` 配置；实施阶段必须将公开 locale/routing 收敛为 `zh-cn`，同时保留 `BASE_PATH`。
- 已有计划文档：`multilevel_content_tree.md` 已明确目录树和 `getDirectoryTreeContext()` 的数据边界；`note-site-directory-style.md` 已规划更大范围的目录型视觉改版。本 feat 只消费前者提供的数据并保持后者的“后续整站视觉改版”边界。

## 技术设计

### Architecture Overview

采用“注册目录定义 + 中文公开内容树 + 中文静态页面”三层结构；全站公开构建只接受中文 locale 和中文内容：

```text
directory-tree.json / navigation.ts
        +
中文公开文章快照（draft 过滤、逻辑文章分组）
        |
        v
getContentTree("zh-cn")
        |
        +--> DirectoryTreeContext
        |       - current directory / ancestors / path
        |       - direct child directories
        |       - direct articles
        |       - subtree articles / count / recent / lastUpdated
        |
        v
knowledge/[...directory].astro
        |
        +--> DirectoryPage.astro
              - breadcrumbs and heading
              - child directory links
              - statistics
              - recent public articles
              - all public articles in subtree
```

页面集合是所有有效目录的中文静态页面，加上既有中文首页、文章、归档、RSS 和 404 页面；英文公开页面、英文 locale 路由和英文内容不进入构建。目录注册表决定目录页面集合和中文文案，中文内容树决定统计和文章列表；不存在第三份目录页面配置。

### Component Breakdown

#### 1. 目录与 URL 定义层

- `src/content/navigation.ts`
  - 保持定义校验与 `getDirectoryText()` 的中文使用；若英文字段仅为历史数据，迁移阶段先登记再决定是否从校验 contract 移除。
  - 保留归档 `path` 的中文筛选语义，为 `NavigationSection` 增加中文目录逻辑路径（如 `directoryPath: /knowledge/<root-id>/`），中文页面入口使用它。
  - 删除英文公开入口投影和英文 locale 分支；不新增 `getTopSections(locale)`，也不保留为英文页面服务的导航接口。
  - 稳定 root ID/category 仍用于文章过滤；不得因目录路径或中文 label 引入新的英文 locale 分支。
- `src/utils/url-utils.ts`
  - 复核现有 `getRelativeLocaleUrl()` 对中文 locale、带 slash 的目录 ID、查询串和 `BASE_PATH` 的行为。
  - 若至少三个中文消费点需要构造同一目录路径，增加语义明确的 `getDirectoryUrl(directoryId)`（内部固定调用 `getRelativeLocaleUrl("zh-cn", `/knowledge/${directoryId}/`)`）；若核对后只有新页面使用，则直接在消费组件调用现有 helper，避免为一行转发逻辑新建抽象。

#### 2. 内容树统计层

- `src/utils/content-tree.ts`
  - 保持 `validatePublicDirectories()`、`getContentTree()` 的公开过滤语义，固定构建 `getContentTree("zh-cn")`。
  - 在 `DirectoryTreeContext` 中增加目录页面所需的子树聚合结果，建议形状如下：

    ```ts
    type DirectorySummary = {
      allArticles: readonly ArticleTreeArticle[];
      articleCount: number;
      recentArticles: readonly ArticleTreeArticle[];
      lastUpdated?: Date;
    };

    type DirectoryTreeContext = {
      directory: DirectoryNode;
      ancestors: readonly DirectoryNode[];
      path: readonly DirectoryNode[];
      childDirectories: readonly DirectoryNode[];
      articles: readonly ArticleTreeArticle[]; // 保持现有语义：直属文章
      summary: DirectorySummary; // 当前目录及所有后代目录的公开文章
    };
    ```

  - `allArticles` 包含当前目录直属文章及所有后代目录文章，每个逻辑文章 ID 在中文树中只出现一次；`articleCount` 等于其长度。
  - `allArticles` 的完整列表沿用树中现有的 `pinTop` 优先、中文 `pubDate` 降序排序，保证文章区与现有知识树排序一致；`recentArticles` 按中文 `pubDate` 降序、文章 ID 稳定兜底，取最多 5 篇。
  - `lastUpdated` 取中文公开文章 `pubDate` 的最大值；空集合为 `undefined`。日期应复用不可变数据约定，页面只读格式化，不修改日期对象。
  - 统计逻辑只读取已构建的中文 `DirectoryNode` 子目录和直属文章，不重新调用 Content Collection，不加入草稿开关或英文回退逻辑。
  - 未知 `directoryId` 继续返回 `undefined`；不为错误 ID 创建统计对象。

#### 3. 静态页面层

- 新增 `src/pages/[...locale]/knowledge/[...directory].astro`
  - 只为 `i18n!.defaultLocale`（收敛后为 `zh-cn`）生成所有 `directoryDefinitions` 的静态路径，参数中的 `locale` 为 `undefined`；不生成任何英文 locale 页面。
  - 只调用 `getContentTree("zh-cn")`，再为每个目录调用 `getDirectoryTreeContext("zh-cn", definition.id)`，将 context 作为 props 传入；公开目录数据无效时在生产构建阶段失败，而不是生成部分页面。
  - 页面渲染使用 `MainPageLayout.astro`，title 和 description 使用中文目录文案；全站已删除语言切换，不增加页面级开关。
  - 不在页面中拼 `/en`、`BASE_PATH` 或绝对域名；所有中文祖先、子目录、文章和返回首页的内部链接固定经过中文 locale URL helper。
  - `Astro.params.directory` 不作为自由输入接受；静态路径只来自已验证定义。context 缺失时抛出带目录 ID 的构建错误或走现有中文 404 语义，不渲染“未分类”。

- 新增 `src/components/knowledge/DirectoryPage.astro`
  - Props 至少包含中文 `DirectoryTreeContext` 和 `lang="zh-cn"`。
  - 使用语义结构：`nav` 面包屑、`header` 标题/说明、统计区、子目录列表、最近更新列表、全部文章列表。
  - 子目录链接使用稳定 `id`，显示 `DirectoryNode.label`/`description`；父目录页面显示直属子目录，不把孙目录重复平铺。
  - 统计区显示文章总数和最后更新时间；可同时显示子目录数量，但不替代必需的文章统计。空日期显示本地化 `noUpdates`。
  - 最近更新最多显示 5 篇，全部来自 `summary.recentArticles`；文章列表显示 `summary.allArticles` 全部中文公开文章，不显示英文内容标记。
  - 目录页面最外层内容区域添加 `data-pagefind-ignore`，覆盖标题、说明、统计、子目录、最近更新和完整文章列表；目录页不产生 Pagefind 文档，展示的文章标题/说明不进入搜索。
  - 不使用 Svelte，不引入客户端折叠、筛选或分页；文章数量增长时仍保持静态页面语义，分页另行规划。
  - 样式只使用现有 `variables.css`/全局变量和组件局部样式，沿用边框、间距、颜色、响应式断点；不引入新的 CSS 框架或设计系统。

#### 4. 全站中文页面与目录入口消费者

- `src/components/knowledge/SectionOverview.astro`
  - section 链接使用新增中文目录路径。
  - `section.children` 从当前的 `<div>`/`<span>` 说明改为中文目录链接，并使用 child ID 生成目标 URL。
  - 中文页面涉及的“查看全部”“最近更新”“暂无公开文章”等固定可见文案接入 i18n；首页的最近文章仍使用中文 `getBlogEntrySort()` 的公开列表，不在本次页面功能中复制统计逻辑。
- `src/components/Header.astro`、`src/components/knowledge/KnowledgeTree.astro`
  - 顶级目录入口使用 `directoryPath`。
  - 删除 Header 右上角中英文切换键及其相关计算、链接和接口；不新增页面级语言开关 prop。
  - KnowledgeTree 只保留中文入口、空状态和文章平铺内容，不再维护英文侧栏或英文 locale 分支。
  - 如静态核对发现知识树仍有目录链接硬编码为归档分类，只做最小替换为目录 URL；不在本 feat 重写侧栏为另一套递归树。
- `src/components/PostCard.astro`、`src/pages/[...locale]/blog/[...id].astro`、`src/pages/[...locale]/archives.astro`、`src/components/ArchivePanel.svelte`、`src/pages/rss.xml.ts`
  - 作为中文公开消费者使用中文文章列表、分类/文章 URL 和 RSS；移除英文 locale 分支及英文 fallback，不改变中文功能语义。
  - 文章页的“查看分类”和卡片分类标签可以继续指向归档 category 筛选，因为它们表达的是分类筛选，不应无依据改为直属目录页；若产品决定统一成目录入口，则单独记录为决策点，不在默认实现中混淆两种语义。

#### 5. 中文文案与内容迁移层

- `src/i18n/key.ts`：保留/新增中文目录页字段，至少包含 `articles`、`lastUpdated`、`recentUpdates`、`subdirectories`、`allArticles`、`noArticles`、`noUpdates`、面包屑/首页等中文界面文案；删除仅服务英文公开入口的 contract。
- `src/i18n/language/zh-cn.ts`：提供中文博客和目录页全部公开界面文案。
- `src/i18n/language/en.ts`：不再作为公开 locale 文案来源；实施阶段先盘点引用，迁移必要信息后删除或移出公开构建，不能静默删除。
- 目录名称和说明继续由 `getDirectoryText(definition, "zh-cn")` 提供；英文目录字段是否保留在源 JSON 仅作为迁移/校验风险处理，不得使其重新成为公开入口。
- `src/content/blog/**/en.md`、`src/content/spec/**/en.md`：实施阶段逐项盘点；可公开使用的信息先迁移到中文文件或登记为归档/删除，公开站点不再读取或生成英文内容。

### Data Flow

1. `directory-tree.json` 定义目录 ID、`parentId`、目录文案；`navigation.ts` 验证拓扑，并保留中文归档 `path`，另投影中文目录 `directoryPath`。
2. Astro Content Collection 读取 blog；`getPublicBlogEntryGroups()` 先过滤 `draft !== true`，按逻辑文章 ID 分组，只保留公开版本。
3. `getContentTree("zh-cn")` 复用公开分组，只选择中文公开版本；英文公开版本不进入公开站点、目录统计或搜索。
4. `getDirectoryTreeContext("zh-cn", directoryId)` 从缓存树取得当前目录、祖先和直属子目录，并沿 `DirectoryNode.directories` 深度优先递归收集当前目录及后代目录的中文公开文章，计算 `articleCount`、`recentArticles`、`lastUpdated`；不新增数据源或持久化缓存，依赖现有中文树缓存。
5. 目录页的 `getStaticPaths()` 仅为每个有效目录生成中文 path 和 context props；未知 ID 没有 path，公开数据错误在构建时中止。
6. `DirectoryPage.astro` 只负责把中文 context 和 i18n 文案渲染为静态 HTML；目录、文章、面包屑链接由中文 `getRelativeLocaleUrl()`/目录 URL helper 生成，并在页面内容根节点设置 `data-pagefind-ignore`。
7. `pnpm build` 只生成中文首页、目录、文章、归档、RSS 和 404 输出，并写入带 `BASE_PATH` 的静态路径；Pagefind 排除目录页面，目录页不接入 CMS 或运行时服务。

### Configuration Changes

- 必须修改 `astro.config.mjs` 的公开 i18n 配置：只保留 `zh-cn` 为 `locales` 和 `defaultLocale`，保持中文无前缀路由，停止 `/en/` 页面生成；保留现有 `base`/`BASE_PATH` 处理和 Markdown 管线。具体 `routing`/`prefixDefaultLocale` 取值以当前 Astro 7 配置可接受形式核对后落位，不能仅删除页面 paths 而留下可生成的英文 locale。
- 所有 `src/pages/[...locale]/**` 的 `getStaticPaths()`、locale 分支和页面文案必须收敛为中文；新增目录路由只生成中文路径。
- 不修改 blog/spec schema；`directory` 已存在且公开内容完整性已由 `content-tree.ts` 校验。
- `navigation.ts` 保留中文 `topSections.path` 的归档分类逻辑，新增中文 `directoryPath: /knowledge/<root-id>/`；移除英文公开入口依赖。
- i18n Translation contract 只保留中文公开页面所需字段；英文 i18n 文件的删除/迁移按内容清单和引用审计执行。
- 不新增依赖、测试框架、运行时 API、数据文件或分页配置；Pagefind 排除通过页面标记完成，不改变构建工具配置。

### Pagefind Policy（已确认排除策略）

目录页不进入 Pagefind，搜索功能只搜索中文文章详情页。由于目录页会渲染子树内的文章标题/说明，必须在目录页面内容的最外层设置 `data-pagefind-ignore`，覆盖目录标题、说明、统计、子目录、最近更新和完整文章列表，避免这些文本被 Pagefind 当作搜索文档或造成祖先目录重复命中；首页、归档、关于、友链和 404 等非文章页面也应使用同一排除标记，不产生搜索文档。

验证方式：完成 `pnpm build` 后检查 `dist/pagefind/` 生成的索引数据只包含中文文章详情 URL，不包含中文 `/knowledge/` 目录页或其他非文章页面；使用 `pnpm preview` 搜索中文文章标题/说明，结果只出现对应中文文章详情 URL，不出现目录页 URL，也不因祖先目录聚合产生重复文章结果。在 `BASE_PATH` 下额外确认中文文章返回 URL 保留部署前缀，且目录页面文本未进入索引。

影响：目录页仍可通过首页、中文顶级入口、子目录、面包屑和文章列表发现，但不会作为搜索结果直接出现；Pagefind 只承担文章搜索，不需要新增页面类型、结果去重或双索引。若 `data-pagefind-ignore` 的实际产物验证不能覆盖整页，应调整页面标记位置/包装范围，但不得改为让目录页或其他非文章页面参与搜索。

### API/Interface Definitions

这是构建期模块接口，不是公开 HTTP API。建议以最小扩展为准：

```ts
export type DirectorySummary = {
  readonly allArticles: readonly ArticleTreeArticle[];
  readonly articleCount: number;
  readonly recentArticles: readonly ArticleTreeArticle[];
  readonly lastUpdated?: Date;
};

export type DirectoryTreeContext = {
  readonly directory: DirectoryNode;
  readonly ancestors: readonly DirectoryNode[];
  readonly path: readonly DirectoryNode[];
  readonly childDirectories: readonly DirectoryNode[];
  readonly articles: readonly ArticleTreeArticle[]; // unchanged: direct articles
  readonly summary: DirectorySummary;
};

export async function getDirectoryTreeContext(
  locale: "zh-cn",
  directoryId: DirectoryId,
): Promise<DirectoryTreeContext | undefined>;
```

统计口径固定为：`summary.allArticles` 是当前目录及所有后代目录的中文公开逻辑文章；`articleCount === allArticles.length`；`lastUpdated === max(allArticles[].data.pubDate)`；`recentArticles` 是按中文 `pubDate` 降序并以稳定文章 ID 兜底后的前 5 篇。`articles` 保持现有直属文章语义，防止现有/未来调用方把直属内容和递归内容混淆。

导航投影继续使用现有 `topSections`；新增中文 `directoryPath` 仅供中文目录入口使用，不能通过本地化 label 反向匹配文章的中文 `category`，也不能重新引入英文公开目录入口。

目录 URL 的逻辑拼接固定为：

```ts
getRelativeLocaleUrl("zh-cn", `/knowledge/${directoryId}/`)
```

最终示例：

| locale | 逻辑目录 ID | 根路径下 URL | `BASE_PATH=/blob_website` 时 |
| --- | --- | --- | --- |
| `zh-cn` | `deep-learning` | `/knowledge/deep-learning/` | `/blob_website/knowledge/deep-learning/` |
| `zh-cn` | `deep-learning/paper-reading` | `/knowledge/deep-learning/paper-reading/` | `/blob_website/knowledge/deep-learning/paper-reading/` |

## 实施策略

### Implementation Phases

1. **基线确认、中文化迁移与路由方案落位**
   - 记录当前工作区状态，不覆盖已有 `.ai_docs/plan/current/multilevel_content_tree.md`、`note-site-directory-style.md` 及其他无关改动。
   - 盘点 `en.md`、`src/content/spec/**/en.md`、`src/i18n/language/en.ts` 及所有英文 locale 引用，建立迁移/归档/删除清单；任何源文件处理都不得静默丢失内容。
  - 核对所有 `topSections.path`/`directoryPath` 消费者和 Astro catch-all 路由优先级，确认新增 `knowledge/[...directory].astro` 不与现有中文页面产生错误匹配。
   - 核对 `astro.config.mjs` 的 `locales`、`defaultLocale`、`routing`、`prefixDefaultLocale` 和 `base`，将公开构建收敛为 `zh-cn`，保留 `BASE_PATH`。
   - 按已确认的 Pagefind 排除策略核对 `data-pagefind-ignore` 的覆盖范围；目录页和非文章页排除，搜索只保留中文文章详情页。
   - 核对当前全部目录定义和中文公开文章树；本计划阶段不修改内容文件。

2. **英文源内容迁移与公开输入清理**
   - 按清单处理 `src/content/blog/**/en.md`、`src/content/spec/**/en.md`、`src/i18n/language/en.ts`：公开构建停止读取英文内容。
   - 对仍有价值的英文文章/spec/文案先迁移为中文；不能迁移的内容登记归档或删除去向，完成记录后才从公开输入移除，禁止静默丢失。
   - 审计所有英文 fallback、英文 locale 分支和英文页面文案引用，删除公开路径生成；旧 `/en/` 链接的中文 404/重定向策略依据当前代码能力落地并记录风险。

3. **内容树递归统计**
   - 在 `content-tree.ts` 保持现有公开快照和直属文章语义，增加 `DirectorySummary` 和子树聚合计算。
   - 明确使用 `DirectoryNode.directories` 深度优先递归：收集当前节点 `articles`，再按目录注册顺序遍历每个子目录；中文每个目录 context 在静态路径生成阶段计算一次并作为 props 复用，不新增独立缓存/数据源。
   - 统一定义中文文章列表、最近更新和最后更新时间的排序/空集合规则；对数组和统计结果保持只读，日期固定使用中文公开版本 `pubDate`。
   - 手工用现有单篇中文公开文章和多个空目录验证：根目录可统计后代、叶目录为空、未知 ID 返回 `undefined`。

4. **中文目录页静态路由与展示组件**
   - 新增 `src/pages/[...locale]/knowledge/[...directory].astro`，仅为每个有效目录生成中文默认路由静态路径。
   - 新增 `src/components/knowledge/DirectoryPage.astro`，实现面包屑、目录标题/说明、统计区、子目录、最近更新和全部公开文章。
   - 复用 `MainPageLayout.astro`、`formatFullDate`、`formatMonthDay`、现有 URL helper 和 CSS 变量；不引入 Svelte hydration。

5. **入口升级、中文化配置与 i18n 收敛**
   - 保留 `navigation.ts` 的中文归档 `path`，新增中文 `directoryPath`；同步更新首页、Header、KnowledgeTree 的中文入口。
   - 更新 `SectionOverview.astro` 的中文子目录链接；直接删除 Header 右上角中英文切换键及 Layout/Header 相关接口。
   - 将 `astro.config.mjs` 和所有 `[...locale]` 页面静态路径收敛为中文；清理英文页面文案入口和英文 fallback。
   - 更新中文 i18n contract；英文 i18n 文件只按迁移清单处理，不再作为公开入口。

6. **全站中文消费者与文档回归**
   - 视项目文档约定更新 `README.md`，说明中文博客路由、目录页面逻辑路由、递归统计、草稿过滤、英文源内容迁移边界和 `BASE_PATH`；不修改 `.ai_docs` 中其他已有计划正文。
   - 全面核对 Header、404、所有 `[...locale]` 页面、blog 路由、归档、RSS、Search/Pagefind、spec 内容和英文源文件处理结果，不为目录页引入运行时依赖。

7. **验证与交付记录**
   - 运行项目规则要求的 `pnpm exec astro check` 和 `pnpm build`。
  - 构建成功后使用 `pnpm preview` 做中文页面、BASE_PATH、页面链接、草稿和搜索手工验证；同时记录旧英文链接按中文 404/重定向策略的实际结果。
   - 本 feat 不创建分支、不提交、不推送；实施者若后续获授权，按计划分支名 `feat/directory_pages` 操作。

### File Structure Changes

| 文件 | 动作 | 目的 |
| --- | --- | --- |
| `src/pages/[...locale]/knowledge/[...directory].astro` | 新增 | 仅为每个有效目录生成中文静态页面。 |
| `src/components/knowledge/DirectoryPage.astro` | 新增 | 渲染目录标题/说明、统计、子目录、最近更新和全部公开文章。 |
| `src/utils/content-tree.ts` | 修改 | 在既有目录上下文中提供当前目录子树的公开文章聚合和统计。 |
| `src/content/navigation.ts` | 修改 | 保留中文顶级目录归档 `path`，新增中文 `/knowledge/<id>/` 逻辑路径，移除英文公开入口依赖。 |
| `src/utils/url-utils.ts` | 按需最小修改 | 中文目录路径重复使用时才增加固定中文 `getDirectoryUrl()`；否则复用现有 `getRelativeLocaleUrl()`；核对 BASE_PATH 边界。 |
| `src/components/knowledge/SectionOverview.astro` | 修改 | 将首页直属子目录由文本升级为可访问链接。 |
| `src/components/Header.astro` | 修改 | 顶级目录入口进入中文目录页；直接删除右上角中英文切换键及相关接口。 |
| `src/components/knowledge/KnowledgeTree.astro` | 修改/最小适配 | 顶级目录链接进入中文目录页，移除英文侧栏/locale 分支，保留中文文章平铺机制。 |
| `src/i18n/key.ts` | 修改 | 增加目录页 UI 文案类型。 |
| `src/i18n/language/zh-cn.ts` | 修改 | 增加中文目录页 UI 文案。 |
| `src/i18n/language/en.ts` | 迁移/清理 | 盘点并迁移仍有价值的文案后移出公开构建或删除；不得静默丢失内容。 |
| `src/components/misc/Search.astro` | 修改/审计 | 搜索只返回中文文章详情页；移除英文 locale 过滤/结果分支，验证目录页及其他非文章页面未进入 Pagefind，且 BASE_PATH 下中文 URL 正确。 |
| `pagefind.yml` | 审计，不修改 | 确认现有 `[data-pagefind-ignore]` 选择器可复用；排除范围通过目录页及其他非文章页面的页面标记完成，使最终索引只保留文章详情页。 |
| `src/pages/404.astro` | 修改/审计 | 收敛为中文 404，移除 locale 判断和英文文案入口，覆盖未知目录语义。 |
| `README.md` | 视实施范围修改 | 记录全站中文博客、目录页面、递归统计、内容迁移和 URL/BASE_PATH 规则。 |
| `src/content/directory-tree.json` | 迁移/必要时修改 | 以中文目录字段作为公开来源；英文字段的保留、迁移或删除须先完成影响盘点。 |
| `src/content.config.ts` | 审计/必要时最小修改 | 确认中文文章 schema 和公开字段足够；不为英文公开内容保留新的读取 contract。 |
| `astro.config.mjs` | 修改 | 将公开 `locales`/`defaultLocale`/`routing` 收敛为中文，停止英文 locale 生成，同时保留 `BASE_PATH`。 |
| `src/pages/[...locale]/[...page].astro` | 修改/审计 | 收敛首页为中文静态路径，并为非文章页面补充 Pagefind 排除标记。 |
| `src/layouts/MainPageLayout.astro` | 修改 | 删除 Header 语言切换相关接口，保持中文页面外壳和文章详情页结构。 |
| `src/pages/[...locale]/archives.astro`、`src/pages/[...locale]/about.astro`、`src/pages/[...locale]/friends.astro`、`src/pages/[...locale]/blog/[...id].astro`、`src/components/PostCard.astro`、`src/components/ArchivePanel.svelte`、`src/pages/404.astro`、`src/pages/rss.xml.ts` | 修改/审计 | 全面收敛为中文页面、中文文章和中文 RSS；非文章页面排除 Pagefind，文章详情页保留中文文章索引。 |
| `src/content/blog/**/en.md` | 迁移/清理 | 逐篇迁移有价值内容至中文或登记归档/删除；公开构建不再读取英文文章源文件。 |
| `src/content/spec/**/en.md` | 迁移/清理 | 迁移关于页/友链等固定内容后移出公开输入；不得静默丢失。 |
| `src/content/spec/**/zh-cn.md` | 审计/保留 | 作为中文关于页、友链等固定内容的公开来源，确认 schema 和页面引用完整。 |
| `.ai_docs/plan/current/multilevel_content_tree.md`、`.ai_docs/plan/current/note-site-directory-style.md` | 不覆盖、不改写 | 既有用户计划文档保留；本 feat 仅引用其边界。 |

### Code Locations

- `src/utils/content-tree.ts:getDirectoryTreeContext("zh-cn", ...)`：当前已有目录 context 查询，是增加中文递归统计的唯一数据接口位置。
- `src/utils/content-tree.ts:buildContentTree()`：树改为只按中文公开文章建立，统计不可重新扫描 collection 或英文源文件。
- `src/utils/content-utils.ts:getPublicBlogEntryGroups()` / `selectPublicBlogEntry()`：草稿过滤和中文公开版本选择来源；目录页不得直接复制，也不请求英文版本。
- `src/content/navigation.ts:topSections`：当前 Header、首页和 KnowledgeTree 的顶级入口投影；中文路径迁移需核对全部消费者。
- `src/pages/[...locale]/[...page].astro`：当前首页入口和 catch-all；需与新增中文目录页面及全站中文 locale 配置一并核对路由排序。
- `src/components/knowledge/SectionOverview.astro`：当前子目录只渲染 `<div>`/`<span>`，是必须升级为链接的直接位置。
- `src/components/Header.astro`：当前顶级导航和语言切换；需删除右上角中英文切换键及相关英文 URL 计算。
- `src/utils/url-utils.ts:getRelativeLocaleUrl()` / `baseUrl()`：所有新内部链接的 URL 边界。
- `src/i18n/key.ts`、`src/i18n/language/zh-cn.ts` 与英文语言文件：中文公开文案 contract 及英文文案迁移/清理边界。

### Integration Points

- **Astro static generation**：只遍历中文默认 locale 的全部 `directoryDefinitions` 生成目录页面，并只生成中文首页、文章、归档、RSS 和 404；目录树构建失败会阻止构建，未知中文目录不会被静态生成。
- **Content visibility**：全站公开查询只消费 `getContentTree("zh-cn")`，因此 draft、英文文件、英文译文和仅英文文章均不进入公开构建、目录聚合、RSS 或搜索。
- **Locale boundary**：astro 配置和所有页面路径收敛为 `zh-cn`；删除语言切换和英文公开 locale 入口，不保留英文 fallback。英文源文件的迁移/清理按内容清单执行。
- **URL/base path**：目录、面包屑、子目录、文章和首页链接均通过中文 URL helper；不能在组件中手写 locale 前缀或部署前缀。
- **Existing navigation**：新增中文 `directoryPath`，Header/SectionOverview/KnowledgeTree 进入中文目录页；归档 category 查询仍是独立筛选语义。
- **Search/RSS**：RSS 只输出中文公开文章，不新增目录 feed。目录页及其他非文章页面使用 `data-pagefind-ignore`，目录页及其文章标题/说明不进入 Pagefind；搜索只返回中文文章详情页。
- **Pagefind + BASE_PATH**：生产预览中检查 `dist/pagefind/` 没有目录页面或英文页面，同时确认 BASE_PATH 下中文文章搜索 URL 正确。
- **CMS**：不改 CMS API、写入边界或生产运行时；CMS 仍只负责中文文章文件写入，英文源文件迁移不通过公开运行时完成，目录页面在 Astro 构建期读取中文内容。

### Assumptions and Boundaries

- 目录总数按“当前目录 + 全部后代目录”的中文公开逻辑文章集合计算；这是父目录作为探索入口最有用且与“所含文章”一致的口径。最后更新时间也使用这同一集合的中文 `pubDate`。
- “最近更新内容”默认最多 5 篇，按中文 `pubDate` 降序；若产品要求其他数量，只需调整页面展示上限，不改变数据模型。
- 完整文章列表默认不分页，展示所有公开文章；项目规则明确未重新接入分页，本 feat 不改变该边界。
- 空目录页面是有效产品页面，不因为零文章而省略；但无效/未知目录不生成目录页面。
- 当前目录注册表可能仍包含英文 label/description；公开站点只使用中文目录元数据，英文字段是否从源数据移除需先完成影响盘点。
- 当前唯一公开文章位于 `deep-learning` 根目录，其他已注册节点主要用于验证空目录和未来内容；实施时不得为了演示而提交临时业务文章或修改用户内容。
- 实施阶段必须处理已有 `en.md`、`src/content/spec/**/en.md` 和英文 i18n 文案：默认先迁移有价值内容为中文或登记归档，再从公开输入中移除；不得静默删除或丢失。该迁移可能改变英文 URL/内容可见性，是本计划的明确风险和实施边界。
- 本计划不修改中文文章 frontmatter、不迁移 `category`、不改变 `slugId`、不实现 CMS 目录页面、不新增 API、不删除遗留分页代码；英文公开 locale 机制按配置收敛处理。
- 本计划不覆盖现有 dirty worktree 改动；目标计划文件不存在，允许新增该计划文件。

## 测试计划

默认只写手工验证方案，不新增测试模块、测试框架或自动化 fixture。实施时所有结果必须记录实际命令和结果。

### Test Scenarios

1. **静态类型与构建**
   - 运行 `pnpm exec astro check`，确认新页面、组件、i18n contract、内容树统计和 rest 参数类型无诊断。
   - 运行 `pnpm build`，确认配置收敛后只生成中文首页、每个有效目录、中文文章、归档、RSS 和 404，英文公开页面/locale 路由不生成，Pagefind 后处理成功；确认无效公开目录数据仍会以明确错误阻止构建。

2. **目录路由覆盖**
   - 访问中文根目录 `/knowledge/deep-learning/`。
   - 访问多级目录 `/knowledge/deep-learning/paper-reading/transformer/`；验证地址、中文标题、标签和说明正确。
   - 检查当前 JSON 中叶目录、空目录和父目录都存在独立静态页面；未知路径不显示空目录页面而进入 404。

3. **统计口径**
   - 用当前公开文章验证 `deep-learning` 根目录计数为 1，`deep-learning` 的最后更新时间为该文章 `pubDate`。
   - 对空叶目录验证文章总数为 0、最后更新时间为空状态、最近更新/文章列表为空状态。
   - 使用包含直属文章和后代文章的目录数据验证父目录统计覆盖子树，文章不重复计数；最近更新按日期而非 `pinTop` 排序。
   - 若验证需要临时内容，只在未提交的受控工作区中创建并在测试后恢复，不能将测试文章、目录或构建产物留在工作区。

4. **草稿和中文公开聚合**
   - 将现有/临时文章标记为 `draft: true` 后重新构建，确认其不出现在目录文章列表、文章总数、最近更新、最后更新时间、首页、归档、详情静态路由、RSS 或 Pagefind。
   - 恢复公开状态后确认统计恢复；不得通过目录页专用查询绕过现有公开过滤。

5. **英文源内容迁移与中文公开边界**
   - 盘点每个 `src/content/blog/**/en.md`：公开构建不再读取英文版本；有价值内容必须迁移为中文或登记归档/删除去向。
   - 盘点 `src/content/spec/**/en.md` 和 `src/i18n/language/en.ts`：关于页、友链及界面文案先完成引用审计和迁移，再移出公开构建；不得静默丢失。
   - 仅英文文章：不进入中文目录、中文统计、中文归档、中文 RSS 或中文 Pagefind；迁移清单必须记录处理结果。
   - 英文 fallback：中文缺失时不使用英文补齐；清理后不会生成英文文章路由或英文页面。

6. **探索链接与 URL**
   - 从首页 section 标题、首页直属子目录、Header 顶级目录、文章页 KnowledgeTree 顶级目录进入对应目录页。
   - 从目录面包屑进入每个祖先目录，从目录子目录进入子页面，从文章列表进入 `/blog/<article-id>/`。
   - 确认 Header 不渲染右上角中英文切换键；在中文默认路由和设置 `BASE_PATH=/blob_website` 的构建/预览中检查所有中文链接，确认无缺失 base path、错误编码 slash 或根路径硬编码。

7. **既有功能回归**
   - 检查中文归档页的 `category` 筛选仍按原有分类工作；中文文章页、上下篇、RSS、Pagefind 和 404 无非预期变化。
   - 验证已确认的 Pagefind 排除策略：目录页及其他非文章页面 URL 不出现在 `dist/pagefind/` 索引；搜索目录中展示的文章标题/说明时，只返回文章详情 URL，不返回任何 `/knowledge/` URL，且同一文章不因祖先目录聚合重复出现。
   - 生产构建后运行 `pnpm preview`，验证中文目录页可访问、中文搜索可加载；同时记录 Pagefind 返回文章 URL 是否含 `BASE_PATH`，确认目录页文本未被索引；开发服务器不作为 Pagefind 通过依据。

8. **中文日期口径**
   - 使用当前中文公开文章验证 `lastUpdated` 和最近更新均读取中文版本 `pubDate`；不读取英文版本日期。

9. **中文 404 边界**
   - 访问 `/knowledge/unknown/`，确认没有静态目录页并按现有中文 404 语义展示；英文 `/en/` 路由不生成，不另设英文 404 验收。

10. **响应式与可访问性**
   - 手工检查桌面端、移动端、浅色/深色主题：标题、统计区、子目录列表、最近更新和大量文章列表不溢出。
   - 使用键盘检查面包屑、子目录和文章链接的焦点顺序、可见焦点与语义链接；确认 Header 不存在语言切换键，空状态仍有清晰标题/说明。

11. **异常边界**
   - 临时将公开文章 `directory` 改为空、未知 ID 或跨语言不一致，运行构建并确认沿用内容树的明确错误；恢复后重新构建。
   - 临时破坏目录父节点/循环或缺失中文文案，确认 `navigation.ts` 在构建早期报错；恢复用户文件，不留下无效配置。

### Test Data and Expected Results

| 测试数据/页面 | 预期结果 |
| --- | --- |
| 当前 `deep-learning` 根目录 + 1 篇公开中文文章 | 中文根目录页生成；文章总数为 1；最后更新时间为 `2026-08-28`；文章可进入详情。 |
| `deep-learning/paper-reading/transformer` 等无文章叶目录 | 页面生成；名称/说明正确；统计为 0；显示无更新和无文章状态。 |
| 父目录含直属文章及后代目录文章 | 统计覆盖全部后代公开文章，每个逻辑文章只计一次；子目录仍单独列出。 |
| 中文公开文章 | 中文页面只显示中文版本并计数一次；英文版本不参与公开构建。 |
| 仅英文文章 | 不出现在中文目录、中文统计、中文归档、中文 RSS 或中文 Pagefind；迁移清单记录其去向。 |
| 英文 spec/i18n 源文件 | 不作为公开页面文案来源；迁移完成后移出公开构建，不能静默丢失。 |
| 草稿 | 不出现在中文目录页面或中文统计；文章公开机制保持现有行为。 |
| 未知中文目录 URL | 没有静态页面，按现有中文 404 语义处理；不显示“未分类”或空白伪页面。 |
| `BASE_PATH=/blob_website` | 链接形如 `/blob_website/knowledge/<id>/`，中文文章/面包屑/返回首页链接均保留前缀；不生成英文 locale 路由。 |

## 验收标准

### Success Metrics

- [ ] `src/content/directory-tree.json` 中每个通过校验的目录都存在中文静态页面；页面集合由目录定义自动生成，无手工文章映射；全站不生成英文公开 locale 路由。
- [ ] 页面展示目录名称和说明、直属子目录、公开文章、最近更新、文章总数和最后更新时间；有效空目录有明确空状态。
- [ ] 文章总数、最近更新和最后更新时间严格来自中文公开文章子树；父目录包含后代目录，日期字段只使用中文公开版本的 `pubDate`，英文内容不纳入统计。
- [ ] 任何 `draft: true` 文章/译文都不会出现在目录内容或统计中；目录页面没有绕过 `getPublicBlogEntryGroups()` / `getContentTree()` 的查询。
- [ ] 中文目录页只显示中文目录标签/说明和中文公开文章；仅英文公开文章和英文草稿不会进入公开构建、目录内容或统计。
- [ ] 首页子目录、顶级导航、KnowledgeTree 顶级入口、面包屑和目录子目录均能进入正确目录页；文章链接仍进入现有文章详情路由。
- [ ] 中文目录页内部链接均通过中文 URL helper 生成，兼容非根 `BASE_PATH`；Header 不存在中英文切换键。
- [ ] Pagefind 采用已确认的排除策略：目录页及其他非文章页面均被排除，索引和搜索结果只包含中文文章详情页；生产预览确认无目录页搜索结果且无重复文章结果。
- [ ] 中文归档、中文文章详情、中文 RSS、中文 404、主题和移动端结构没有非预期回归；英文公开页面/locale 路由不生成。
- [ ] 不新增依赖、测试框架、运行时 API、CMS 服务或分页；页面使用静态 Astro 生成和现有布局/CSS 体系。
- [ ] 实际运行并记录 `pnpm exec astro check`、`pnpm build`，并在生产构建后用 `pnpm preview` 完成必要手工验证；未运行的检查不得写成通过。

### User Acceptance

维护者可以从中文首页或中文目录入口进入任意有效目录，看到中文名称/说明、直属子目录和所有后代中文公开文章，知道文章总数及最后更新时间，并从最近更新列表快速进入文章。空目录不会变成死链，未知中文路径不会被伪装成有效目录。非根路径部署下中文目录/文章链接正确；草稿和英文源内容不会泄露到中文公开站点或目录聚合中。Header 不显示语言切换，站点只生成中文首页、目录、文章、归档、RSS 和 404。

## 关键决策与假设

### 已采用的关键决策

1. **目录路由**：采用 `knowledge/<directoryId>`，而不是把目录继续映射到 `archives?category=`；原因是 feat 的目标是独立可访问内容入口，且稳定目录 ID 已存在。目录 ID 的 slash 由 rest 参数承载。
2. **统计范围**：父目录统计递归包含所有后代目录的公开逻辑文章；直属文章仍在 context 中保持单独字段，避免语义混淆。
3. **文章计数**：按中文公开逻辑文章计数，不按语言文件计数；每篇中文文章只算一次。
4. **日期字段**：只使用中文公开文章的 `pubDate`，不使用文件系统时间、构建时间或英文源文件时间。
5. **最近更新**：默认最多 5 篇，按中文 `pubDate` 降序并用稳定 ID 兜底；不会用 `pinTop` 改写“最近”的日期含义。
6. **空/未知目录**：有效空目录生成页面，未知目录不生成静态路径；不引入“未分类”兼容页。
7. **展示边界**：新增一个静态 Astro 展示组件；不把目录页做成 Svelte 应用，不接入运行时筛选、分页或 CMS。

### 用户决策（已确认）

1. **Pagefind 排除策略**：目录页及其他非文章页面使用 `data-pagefind-ignore` 排除，搜索只搜索中文文章详情页；不实现目录页去重或搜索结果页面类型。
2. **全站中文公开输出**：只生成中文首页、目录、文章、归档、RSS 和 404；删除 Header 中英文切换，停止英文公开页面和 `/en/` locale 路由生成。
3. **中文统计日期**：目录统计、最近更新和最后更新时间只读取中文公开文章版本的 `pubDate`；英文内容不进入公开构建或统计。
4. **旧英文链接**：不生成英文公开路由；现有旧 `/en/` 链接按中文 404 或重定向策略记录，实施时依据当前代码能力落地，不新增独立 locale 决策。

### Assumptions

- 用户未指定最近更新列表条数，默认 5 篇是最小且足够可读的短列表；如维护者要求其他上限，只调整展示上限。
- “所含公开文章”固定按当前目录及全部后代目录的中文公开文章子树理解；直属文章仍保留为 context 的独立字段，不能在实现中隐式改为仅统计直属文章。
- 当前代码的 `getRelativeLocaleUrl()` 已通过 `baseUrl()` 处理 `BASE_PATH`，优先直接复用该 helper；只有代码审查证明多处需要相同固定路径时才增加最小中文目录 helper，不重复实现 URL 拼接。Pagefind 返回文章 URL 的 base path 形态须以生产预览证据确认。
- 现有 `directory-tree.json` 的拓扑规则继续有效；中文名称/说明是公开来源，英文字段是否迁移或清理须纳入内容清单。
- 现有 `.ai_docs/plan/current/multilevel_content_tree.md` 的目录树数据能力视为已存在基线；若实施时发现其实现未合并，应先完成该能力或将本 feat 标记为前置依赖，不在目录页面中另建并行数据模型。
- 英文源文件的删除、迁移或归档必须先登记内容去向；中文目录只使用中文公开版本日期，不读取英文版本。

### Scope Boundaries

- 不修改业务源码、内容文件、CMS、文章 schema、文章路由 ID、`slugId`、RSS feed 结构或 Pagefind 配置作为本计划阶段动作。
- 不重做整站视觉、不恢复分页、不删除遗留组件、不实现 CMS 预览、不新增目录编辑后台。
- 不创建分支、提交、推送或 PR；`feat/directory_pages` 只作为后续实施记录。

## Step 3 挑战合并记录

### 合并后状态

计划已根据 subagent2 的 8 条 challenge 完成逐条决策，并已吸收此前用户决策及本轮“全站中文博客”范围收敛：原 challenge 状态为 4 条 `accept`、1 条 `reject`、3 条 `escalate`；其中 3 条 `escalate` 已由用户明确选择解决。此前涉及英文页面保留的内容均已被本轮全站中文决策 supersede，最终状态见文末记录。

### 已合并建议列表

1. **Challenge 1 — accept（高，后被全站中文范围 supersede）**：原建议要求语言切换保留当前 directory ID；本轮用户决定直接删除 Header 语言切换并停止英文公开路由，因此改为核对中文目录 URL/`BASE_PATH`，不生成英文目标；影响 Header、中文路由和部署前缀。
2. **Challenge 3 — accept（中，后按全站中文范围重写）**：保留 `BASE_PATH` 下 Pagefind 文章 URL 的生产构建/预览验证，但移除英文 locale 过滤目标；以实际返回 URL 确认中文文章 URL 保留部署前缀。理由是源码中的 `en/` 判断不能证明子路径部署正确；影响 Search、Pagefind 和部署前缀回归。
3. **Challenge 4 — accept（中，后被全站中文范围 supersede）**：接受导航文案/入口需要有明确边界的问题；本轮不再保留英文公开入口，保留中文归档筛选语义并为中文增加 `directoryPath`，不实施英文导航投影或英文页面文案维护。影响 navigation、首页、Header、KnowledgeTree 和中文 i18n contract。
4. **Challenge 8 — accept（低）**：明确沿 `DirectoryNode.directories` 深度优先收集当前目录及后代中文公开文章，复用中文 `getContentTree` 缓存，不新增数据源或独立持久缓存。理由是当前 context 只有直属字段，计划需要可执行的递归边界；影响 `content-tree.ts`、统计接口和目录页构建性能。

### 已拒绝建议列表

1. **Challenge 7 — reject（低）**：拒绝在本 feat 中新增 slash-separated ASCII 的目录 ID 正则校验。理由是当前注册表 ID 已是安全的 ASCII 多级路径，challenge 只证明“当前没有校验”，没有给出本 feat 范围内会失败的现有数据或新增 ID 场景；新增 schema/拓扑门禁会扩大 contract 和维护成本，不符合 KISS 与“不为假设的未来需求增加复杂度”。影响范围限制为：本 feat 明确只覆盖当前注册表安全 ID；未来若允许特殊字符，另行设计 route encoding/校验和迁移策略。

### 用户决策与不再适用建议

#### 用户已采纳决策

1. **全站中文公开输出**：只生成中文首页、目录、文章、归档、RSS 和 404；删除 Header 中英文切换，停止英文公开页面和 `/en/` locale 路由生成。
2. **英文源内容迁移边界**：`en.md`、英文 spec 和英文 i18n 只作为迁移、归档或删除风险处理；公开构建不读取英文内容，任何删除前须登记内容去向。
3. **Pagefind 仅搜索中文文章**：目录页及其他非文章页面使用 `data-pagefind-ignore`，不进入 Pagefind；搜索只保留中文文章详情页，并已写明排除范围、重复风险、生产索引检查和预览验证。
4. **目录统计和 URL**：每个有效目录生成中文页面，统计只读取中文公开文章 `pubDate`，中文 URL helper 继续兼容 `BASE_PATH`。
5. **旧英文链接**：不生成公开 `/en/` 路由；旧英文链接按中文 404 或重定向策略记录，实施时依据当前代码能力落地。

#### 因范围收敛而不再适用的旧建议

- Challenge 1 原建议的“目录页语言切换到同目录英文目标”不再适用，已改为删除 Header 语言切换并只核对中文目录 URL/`BASE_PATH`。
- Challenge 2 中允许目录页参与索引并通过去重解决重复结果的路径不再适用，已采用整页排除且搜索只保留文章详情页。
- Challenge 4 的完整双语导航投影、英文目录页和英文 fallback 不再适用；只保留中文导航和中文目录入口。
- Challenge 5 的 locale-aware 404 方案不再适用；只验收中文未知目录的 404，并记录旧 `/en/` 链接的中文 404/重定向策略。
- Challenge 6 的双语 `pubDate` 一致性/选择方案不再适用；中文统计固定读取中文公开版本日期。

**当前状态：已完成合并；无剩余待用户决策**
