# 顶层知识分类导航 Mega Menu 实施计划

> 计划状态：用户已批准方案 A；已完成挑战合并并统一为窄化 `MegaMenuSection` 数据流。
>
> 本文件仅描述实现方案；本轮不修改 `src/`、`cms/`、配置、依赖或内容文件。

## 概述

### Feature Description

为当前博客 Header 的顶层知识分类导航增加桌面端 Mega Menu。用户鼠标悬停或键盘聚焦“深度学习”“代码算法”“工具使用”“随想记录”等顶级分类时，在 Header 下方打开宽幅预览面板。面板静态展示当前分类的简介、直属子目录和该根目录子树中最近发布的中文公开文章及日期；顶层分类文字继续作为普通链接，点击后进入完整知识目录页。

桌面端支持 hover、focus、鼠标移入面板保持打开、多分类切换、Escape 关闭和点击外部关闭；移动端不使用 hover，继续使用现有的移动端抽屉导航。

### User Benefits

- 用户可以在不离开当前页面的情况下预览一个知识分类的内容范围。
- 分类简介、直属目录和最近文章集中展示，降低进入目录页的试错成本。
- 顶层分类、目录和文章仍然使用现有静态路由，导航语义不发生变化。
- 键盘用户可通过焦点访问分类预览，移动端继续使用已存在的抽屉导航。

### Project Alignment

- 继续使用 `Astro 7` 的构建期数据准备，不增加客户端请求、运行时 API 或新依赖。
- 目录来源仍是 `src/content/directory-tree.json` 经 `src/content/navigation.ts` 投影出的 `topSections`。
- 最近文章由 `content-tree.ts` 在已有内容树边界内生成窄化的 Mega Menu view model，不在 Header 中重新查询 Markdown、按 `category` 过滤或自行处理草稿。
- 目录和文章 URL 继续统一使用 `getRelativeLocaleUrl()`，兼容中文默认 locale 与 `BASE_PATH`。
- 只修改公共 Header 及其布局数据传递；不改变文章内容、CMS、路由定义、RSS、Pagefind 或目录树数据模型。
- Mega Menu 文章标题属于站点公共 Header，必须标记 `data-pagefind-ignore`，避免污染文章详情页的 Pagefind 索引；Pagefind 仍只索引中文文章详情页。
- 截图只作为交互和视觉参考，不复制其中的品牌、域名、文章标题或其他内容资产。

### 计划分支名称

`feat/navigation_mega_menu`（仅记录，不创建或切换分支）

## 需求分析

### Functional Requirements

1. 桌面端显示全部顶级知识分类；当前 Header 中的 `topSections.slice(0, 3)` 需要调整为覆盖 `topSections` 的四个根目录。
2. 每个顶级分类文字仍使用 `<a>`，链接目标仍为 `/knowledge/<root-id>/` 的 locale/base-path 安全 URL，点击行为不改为仅展开菜单。
3. 鼠标进入顶级分类触发项时打开对应 Mega Menu；同一时刻最多显示一个分类面板。
4. 鼠标从触发项移动到面板时面板保持打开；鼠标离开 Header 与面板整体后关闭。
5. 鼠标进入另一个顶级分类时直接切换到该分类面板，不需要先关闭再重新打开。
6. 键盘焦点进入顶级分类链接时打开对应面板；焦点离开触发项、面板和其他 Mega Menu 控件后关闭。
7. 在面板或触发项中按 `Escape` 关闭面板；若关闭时焦点在面板内，应将焦点返回对应顶级分类链接，避免键盘焦点丢失。
8. 点击 Header/面板之外的区域关闭面板；点击顶级分类或面板中的目录、文章链接仍执行正常页面导航。
9. 面板第一列展示根分类标签、简介和进入完整目录页的链接。
10. 面板第二列展示当前根目录的直属子目录；每项展示中文名称和说明，并链接到对应目录页。直属子目录只使用 `MegaMenuSection.childDirectories`，不在下拉框中递归展开全部深层目录。
11. 面板第三列展示当前根目录子树的最近中文公开文章及日期；使用 `MegaMenuSection.recentArticles` 的现有 5 篇上限和 `pubDate` 排序。没有文章时展示“暂无公开文章”。
12. 面板所有标题、目录、文章、日期和状态文案均使用中文；不新增英文页面、英文内容或英文路由。
13. 移动端在 `max-width: 1023px` 下不显示桌面 Mega Menu 和 hover 逻辑，保留当前 `mobile-menu-container` 抽屉、按钮、遮罩和移动端顶级分类链接。
14. 面板打开状态通过 `aria-expanded`、`aria-controls`、`aria-hidden`/隐藏状态表达，隐藏面板中的链接不得进入键盘 Tab 顺序。
15. Header 在 Astro `ClientRouter` 页面切换后仍能重新绑定交互，不因 `astro:page-load` 重复绑定导致一次操作触发多次状态更新。
16. Mega Menu 容器及其子树标记 `data-pagefind-ignore`；构建后确认文章详情页的 Pagefind 索引不会把 Header 预览文章标题作为页面正文命中来源。

### Non-Functional Requirements

- 静态生成：面板 HTML 在构建期生成，浏览器脚本只负责显示状态和事件，不发起网络请求或读取 CMS。
- 数据一致性：最近文章必须沿用 `content-utils.ts` 的公开文章分组、中文选择和草稿过滤语义；Header 不得直接调用 `getCollection()`。
- 路由安全：目录和文章链接统一经过 `getRelativeLocaleUrl(lang, path)`；不得手写 locale 前缀、部署前缀或绝对本地路径。
- 视觉一致：复用 `variables.css` 中的 `--bg-color`、`--text-color`、`--text-color-70`、`--link-color`、`--accent-color`、`--button-hover-color`、`--button-border-color` 和 `--shadow-color`。
- 主题兼容：浅色和深色主题下，面板背景、分隔线、辅助文字、链接和焦点轮廓都具备足够对比度。
- 响应式：桌面面板不推动正文布局；在现有移动断点下不挤占 Header，不影响抽屉菜单。
- 可访问性：保留全局 `:focus-visible`，补充明确的焦点、展开状态和面板控制关系；不把普通链接伪装成无法导航的按钮。
- 性能：不新增依赖、不新增页面扫描；复用 `MainPageLayout` 已触发的构建期内容树缓存。四个根目录的窄化预览数据只发生在静态构建/渲染阶段。
- 数据边界：Header 只接收分类标签/说明、直属目录窄记录和最多 5 篇文章窄记录，不接收 `DirectoryTreeContext`、完整目录节点、`allArticles` 或完整 `ContentTree`。
- 搜索隔离：Mega Menu 文章标题、日期和目录文案不进入 Pagefind；不得用全局 `pagefindIgnore` 误排除文章正文。
- 动效：若增加淡入/位移动画，应在 `prefers-reduced-motion: reduce` 下关闭或降级；动效不是功能依赖。

### Edge Cases

- 某个根目录没有公开文章：仍显示分类简介和直属子目录，最近文章列显示“暂无公开文章”。
- 某个根目录没有直属子目录：保留目录列标题并显示空状态，不递归把孙目录冒充直属目录。
- 草稿文章、非中文公开版本或只有英文版本的文章：不得出现在最近文章列表；不在 Header 里新增过滤分支。
- 文章存在 `updatedDate`：Mega Menu 的“最近发布”仍按现有 `recentArticles` 的 `pubDate` 语义展示，不能把“最近修改”与“最近发布”混用。
- `BASE_PATH` 非 `/` 或未来启用默认 locale 前缀：所有面板链接仍应由 URL helper 生成。
- Header 出现在 404、关于、归档、文章、目录等所有 `MainPageLayout` 页面：面板数据和交互必须在这些页面一致可用。
- 页面使用 Astro `ClientRouter` 切换后，旧面板不能残留可见状态，旧事件监听器不能累积。
- 视口接近桌面断点或宽度较窄时：三列内容允许压缩/换行，不能造成页面横向溢出；移动断点仍由现有 `1023px` 规则控制。
- 用户在触发项和面板之间快速移动：不能因为短暂的 DOM 间隙或隐藏切换造成闪烁或误关闭。
- 用户使用键盘直接聚焦 Header 中非 Mega Menu 链接：已经打开的面板应关闭，避免遮挡无关导航或正文。
- 视口从桌面切换到移动断点：面板应立即关闭，所有触发项恢复 `aria-expanded="false"`，若焦点位于面板内应先移回触发项再隐藏。
- 四个根目录中任一 ID 不存在：必须在构建期抛出包含 root ID 的错误，不得静默过滤后生成不完整 Header。

### Dependencies

- `src/content/navigation.ts`：提供 `topSections` 及根分类标签、说明和目录 ID；不修改其目录定义语义。
- `src/utils/content-tree.ts`：在现有内容树边界新增窄化的 `MegaMenuSection` 查询；其构建依赖 `getPublicBlogEntryGroups()` 和 `selectPublicBlogEntry()`。
- `src/utils/content-utils.ts`：间接提供中文公开文章、草稿过滤、locale 选择和日期排序语义；本 Feature 不绕过它。
- `src/utils/url-utils.ts`：提供 `getRelativeLocaleUrl()`；面板不能自行拼接部署路径。
- `src/utils/time.ts`：复用 `formatBlogMonthDay()` 展示日期，与目录页/已有 SectionOverview 的日期格式保持一致。
- `src/components/Header.astro`：唯一的 Header 视图和现有移动菜单脚本所在位置。
- `src/layouts/MainPageLayout.astro`：全站 Header 的调用方，也是已有 `getContentTree(lang)` 缓存建立位置。
- `src/styles/variables.css`、`src/styles/global.css`：主题颜色、焦点轮廓、字体与基础布局约定。
- 不新增 npm/pnpm 依赖，不修改 `cms/`、内容 schema、目录注册表、页面路由或 Markdown 管线。

## 技术设计

### Architecture Overview

采用“内容树边界生成窄化 view model + 布局层传递数据 + Header 构建期渲染静态面板 + Header 内原生脚本切换状态”的最小方案：

```text
directory-tree.json
        ↓
navigation.ts -> topSections
        +
content-tree.getMegaMenuSections(lang, rootIds)
        ↓
MegaMenuSection[]（窄化记录）
        ↓ 作为 Header props
Header.astro
  ├─ 普通顶级分类链接（全部四个根目录）
  ├─ 构建期渲染四个静态面板
  └─ data-* + 原生脚本处理 hover/focus/Escape/外部点击
        ↓
静态 HTML：分类简介 / 直属目录 / 子树最近文章
```

每个根目录的 Mega Menu 数据由 `content-tree.ts` 的专用查询生成：最近文章沿用内容树的公开文章集合和 `pubDate` 排序，但只投影 `id/title/pubDate`；直属目录只投影 `id/label/description`。Header 不再接收 `DirectoryTreeContext`，也不自行基于 `category` 或 Markdown 文件路径计算文章归属。

### 方案比较与取舍

#### 方案 A：内容树生成窄 view model，四个面板静态预渲染，脚本只切换显示状态（推荐）

- `content-tree.ts` 在已有缓存的内容树上执行专用根目录查询，只构造 `MegaMenuSection` 所需的分类、直属目录和最多 5 篇最近文章字段。
- `MainPageLayout.astro` 针对 `topSections` 调用该查询，并把窄 view model 传给 `Header`。
- `Header.astro` 在构建时为四个根分类生成完整面板；浏览器脚本只切换 `hidden`、`aria-expanded` 和活动状态。
- 优点：复用内容树公开过滤和缓存；不把 `DirectoryTreeContext`、完整节点或 `allArticles` 传入 Header；不需要序列化文章数据；无运行时请求；交互状态简单；静态 HTML 直接可检查。
- 代价：需要在已有 `content-tree.ts` 边界增加一个窄查询及类型；所有根分类的预览 HTML 会同时进入页面，增加少量初始 HTML。
- 取舍：四个根目录和每个最多 5 篇文章的规模固定，窄 view model 同时解决数据边界和静态可访问性问题。

#### 方案 B：布局传递完整 `DirectoryTreeContext[]`

- `MainPageLayout.astro` 针对四个根目录调用现有 `getDirectoryTreeContext()`，把完整上下文数组传给 Header，再由 Header 读取 `childDirectories` 和 `summary.recentArticles`。
- 优点：无需新增 content-tree 查询接口；可以直接复用已有目录页上下文字段。
- 代价：Header 接口暴露完整目录节点、`allArticles`、语言状态和不需要的统计；每个上下文都会执行 `getDirectorySummary()`，并且 Header 与内容树内部类型过度耦合。
- 结论：不采用。内容树已明确区分目录上下文和视图消费者，Mega Menu 的窄需求不应把过宽接口继续向上层传播。

#### 方案 C：只渲染一个共享面板，浏览器根据内嵌 JSON 或 `data-*` 数据动态替换内容

- 页面只保留一个面板，脚本根据当前分类切换标题、目录和文章列表。
- 优点：HTML 重复较少，可在分类数量大时降低 DOM 体积。
- 代价：需要新增序列化数据格式、日期/URL 转换和客户端渲染逻辑；面板内容更依赖 JavaScript；容易引入 XSS/转义、焦点和隐藏内容同步问题；与当前静态站点的最小交互原则不符。
- 结论：不采用。当前只有四个根目录，静态预渲染的复杂度和风险更低。

#### 方案 D：Header 直接调用专用 Mega Menu 查询

- Header 自己调用 `getMegaMenuSections(lang, rootIds)`，布局不增加数据 props。
- 优点：调用方改动较少，查询接口仍然是窄的。
- 代价：Header 同时承担内容查询与导航呈现；布局已有内容树准备却不能明确表达全站 Header 的数据依赖；测试和未来复用边界较弱。
- 结论：不采用。将查询放在 `MainPageLayout` 可以保持“布局准备静态数据、Header 负责展示和交互”的方向。

#### 交互实现决策

- 纯 CSS `:hover`/`:focus-within` 可以覆盖基本展示，但不能可靠处理 Escape、外部点击、跨分类单面板状态、焦点返回和 Astro 页面切换生命周期。
- 采用现有 Header 原生脚本模式，加上 data 属性和一套小型状态机；不引入 Svelte 或菜单依赖。
- CSS 只负责布局、视觉、响应式和过渡；脚本负责 `closed`/`open(sectionId)`/`switch(sectionId)` 状态、关闭原因和焦点恢复。
- 关闭使用可取消的短延迟；触发项/面板重新进入时取消关闭计时器。`relatedTarget` 用于判断焦点是否仍在交互区域内，避免在触发项与面板切换时闪烁。

### Component Breakdown

#### 布局与数据准备层：`MainPageLayout.astro`

- 保留已有 `const tree = await getContentTree(lang)`，继续为 `KnowledgeTree` 提供整棵内容树。
- 新增调用 `getMegaMenuSections(lang, topSections.map(section => section.id))`，为 Header 准备窄 view model。
- 不过滤缺失结果；专用查询遇到未知 root ID 必须抛出包含 root ID 的构建错误。不要添加 fallback 目录、未分类节点或静默降级。
- 将窄数组传给 `<Header lang={lang} megaMenuSections={...} />`。

#### 内容树查询层：`content-tree.ts`

- 增加只读类型 `MegaMenuDirectory`、`MegaMenuArticle`、`MegaMenuSection`，字段分别限制为目录 `id/label/description`、文章 `id/title/pubDate` 和根分类 `id/label/description/childDirectories/recentArticles`。
- 增加 `getMegaMenuSections(locale, rootIds)`：复用 `getContentTree(locale)` 的构建缓存；按调用方给出的 root ID 顺序返回窄记录。
- 对每个 root 只遍历其子树文章并按现有 `compareArticleDateDescending` 取前 5 篇；不要调用会额外构造 `allArticles`、`lastUpdated` 的完整 `getDirectorySummary()`。
- 发现 root ID 不存在时立即抛出包含 locale 和 root ID 的错误，不能返回 `undefined` 或缩短数组。
- 返回的数组、子数组、记录和日期应保持只读/不可变语义，不把完整 `DirectoryNode` 或 `ArticleTreeArticle` 暴露给 Header。

#### 导航与静态视图层：`Header.astro`

- 增加最小 `Props`：`lang` 与 `readonly MegaMenuSection[]`，并用 `lang` 作为所有 Header URL/日期格式的统一输入；Header 不再接收 `DirectoryTreeContext`。
- 将桌面分类链接从前三项改为全部 `topSections`；移动抽屉继续使用全部 `topSections`。
- 保留首页、归档、关于、搜索、主题和移动菜单现有结构与行为。
- 增加桌面 Mega Menu 的触发项/面板结构。每个面板包含：分类概览、直属目录列表、最近发布列表。
- 使用 `getRelativeLocaleUrl(lang, section.directoryPath)`、`getRelativeLocaleUrl(lang, "/knowledge/<id>/")`、`getRelativeLocaleUrl(lang, "/blog/<id>/")` 生成链接。
- 使用 `formatBlogMonthDay(article.pubDate, lang)` 和 ISO `datetime`，与现有目录/区块组件保持日期语义。
- 使用唯一的 section ID 派生 `aria-controls` 和 panel ID；面板之间不共享重复 ID。
- 对 Mega Menu 外层容器增加 `data-pagefind-ignore`，只隔离 Header 预览内容，不把该属性提升到文章页的 `.site-shell` 或正文。
- 触发项与其面板在同一 `.site-nav__category` 交互区域中相邻；面板通过全宽绝对定位视觉脱离导航行，但保持 DOM 邻接和键盘 Tab 顺序。

#### 交互层：`Header.astro` 内现有脚本

- 在现有 `initHeader()` 中统一初始化移动抽屉和 Mega Menu，不新增第二套全局初始化入口。
- 用当前 Header/root `data-bound` 防止同一 DOM 重复初始化；仅依赖该标记不能代替监听器清理。
- 为本次 Header 初始化创建一个 `AbortController`，移动菜单、Mega Menu、document 级 Escape/外部点击、matchMedia 监听均使用同一 signal；在 `astro:before-swap` 中 abort，并在下一次 `astro:page-load` 为新 Header 建立新 controller。
- 明确维护 `closed`/`open(sectionId)`/`switch(sectionId)` 状态和可取消的短关闭计时器；触发项、面板重新进入时取消计时器。
- 对桌面 hover 使用 `pointerenter`/`pointerleave`，对键盘使用 `focusin`/`focusout`，使用 `relatedTarget` 判断焦点是否仍在 Mega Menu 交互区域内；Header 外部点击通过 document 级监听关闭。
- 关闭或切换前检查当前 `activeElement`：若其位于即将隐藏的面板内，先聚焦该面板所属的触发链接，再设置 hidden，避免焦点落入 hidden DOM。
- 关闭时同步所有触发项 `aria-expanded=false`、面板 `aria-hidden=true/hidden` 和容器活动状态；打开时只解除当前面板的 hidden/aria-hidden。
- 监听 `matchMedia("(min-width: 1024px)")` 的变化；断点切换时统一关闭 Mega Menu 与移动抽屉、恢复 `body` 滚动锁定状态，并将焦点转移到当前可见的安全目标。
- 移动菜单原有关闭行为必须保持，包括 Escape、遮罩、关闭按钮、链接关闭和 body overflow 恢复。

#### 样式层：优先 `Header.astro` 局部样式

- Mega Menu 作为 Header 的绝对定位子层，位于 Header 底部，不参与正文布局；使用现有 Header `z-index` 层级和颜色变量。
- 为避免 1024px 附近品牌、导航和工具重叠，将桌面 `.site-nav` 改为 Header 内的全宽定位/居中交互层，实际链接和面板保留 `pointer-events: auto`，空白区域不遮挡品牌与工具；使用 `gap: clamp(...)` 和必要的字号下限。
- 内容区使用三列网格：分类概览、直属目录、最近发布；列宽和间距使用 `minmax()`/`clamp()` 允许窄桌面换行。
- 链接、分隔线、空状态、面板阴影和活动触发项沿用现有 Header/站点变量，不在 `variables.css` 增加新颜色。
- `@media (max-width: 1023px)` 隐藏桌面导航和 Mega Menu；不改变移动抽屉宽度、遮罩或滚动锁定规则。
- 对 `prefers-reduced-motion: reduce` 关闭面板淡入/位移过渡。

#### 保持不变的层

- `src/content/navigation.ts` 与 `src/content/directory-tree.json`：目录定义已经覆盖所需四个根节点。
- `src/utils/content-utils.ts`：现有公开过滤、locale 选择和缓存接口保持不变；`content-tree.ts` 仅增加窄化查询，不改变现有目录页上下文接口。
- `src/components/knowledge/SectionOverview.astro`：它当前接收扁平 `CollectionEntry[]` 并按 `category` 取 3 篇文章，不适合作为子树最近文章查询；本 Feature 不改变首页区块语义。
- `src/utils/url-utils.ts`、`src/styles/variables.css`、`src/styles/global.css`：仅复用现有接口和变量，不为 Mega Menu 增加新的全局 URL/主题抽象。
- `cms/`、文章 Markdown、schema、路由、RSS、Pagefind 配置和 package manifest。

### Data Flow

```text
MainPageLayout(lang)
  ├─ getContentTree(lang) -> KnowledgeTree
  └─ getMegaMenuSections(lang, topSections.map(rootId => rootId))
       ├─ section -> 根分类展示信息
       ├─ section.childDirectories -> 直属目录窄记录
       └─ section.recentArticles -> 子树最近 5 篇中文公开文章

Header(lang, megaMenuSections)
  ├─ topSections -> 顶层触发链接和顺序
  ├─ getRelativeLocaleUrl -> 根目录/子目录/文章链接
  ├─ formatBlogMonthDay -> 日期文本
  └─ native events -> open(sectionId) / close() / switch(sectionId)
```

内容树内部仍然执行 `getPublicBlogEntryGroups()` 的公开/草稿过滤与 `selectPublicBlogEntry()` 的 locale 选择；Mega Menu 只消费结果，不重复实现这些规则。

### Configuration Changes

- 无配置文件变化。
- 不新增环境变量、站点配置项、目录字段、frontmatter 字段或 feature flag。
- 保持 `astro.config.mjs` 的中文-only locale、`BASE_PATH`、ClientRouter 和静态构建配置不变。
- 不新增依赖、脚本或测试框架。

### API/Interface Definitions

#### Header 内部 Astro props

建议使用以下窄接口（不直接暴露已有 `DirectoryTreeContext`）：

```ts
interface Props {
  lang: string;
  megaMenuSections: readonly MegaMenuSection[];
}
```

`Header.astro` 只消费已准备好的窄 view model；不把 `ContentTree`、Map 或文章集合序列化到浏览器。

#### 静态 DOM contract

每个顶级触发链接和面板使用稳定 ID，例如：

```html
<a
  data-mega-menu-trigger="deep-learning"
  aria-controls="mega-menu-panel-deep-learning"
  aria-expanded="false"
>
  深度学习
</a>
<section
  id="mega-menu-panel-deep-learning"
  data-mega-menu-panel="deep-learning"
  aria-hidden="true"
  hidden
>
  ...
</section>
```

触发项仍是导航链接，不添加阻止默认导航的点击处理。`hidden` 由脚本和服务端初始状态共同保证面板链接不可聚焦。

#### 不新增运行时 API

浏览器端没有 fetch、CMS API、Pagefind 查询或其他网络接口。所有面板文本和链接在 Astro 构建时已进入静态 HTML。

## 实施策略

### Implementation Phases

#### 阶段 1：确认当前契约与数据准备

1. 在 `content-tree.ts` 中增加 `MegaMenuSection` 窄类型和 `getMegaMenuSections()`，复用已有内容树缓存及公开文章排序语义。
2. 在 `MainPageLayout.astro` 中导入 `topSections` 与 `getMegaMenuSections`，使用当前 `lang` 获取四个根目录的窄预览数据，并保留 `getContentTree(lang)` 给 `KnowledgeTree` 的现有调用。
3. 将窄化只读数组传给 Header；确认所有调用 Header 的路径都经过 `MainPageLayout`，不产生遗漏调用方。
4. 不修改 `content-utils.ts` 的查询和排序接口，不改变现有目录页上下文接口。

#### 阶段 2：扩展 Header 的静态结构

1. 为 `Header.astro` 增加 props 类型并以传入 `lang` 统一替代仅依赖 `Astro.currentLocale` 的 URL/日期输入。
2. 移除桌面分类的 `slice(0, 3)`，渲染四个根分类触发项；检查 Header 中心区域在桌面最小宽度下不横向溢出。
3. 在现有导航附近增加静态 Mega Menu 面板，按 `topSections` 顺序与上下文 Map 对齐。
4. 实现分类概览、直属子目录、最近文章、日期、空状态和全部 URL；保留现有首页/归档/关于/搜索/主题/移动菜单。
5. 设置面板的语义属性、稳定 ID、初始 hidden 状态和活动状态样式。

#### 阶段 3：实现桌面交互并兼容页面切换

1. 在现有 `initHeader()` 内增加打开、切换、关闭函数，不引入 Svelte 或额外包。
2. 绑定触发项的指针进入、焦点进入、必要的键盘关闭事件，以及 Header 外部点击和 Header 外部焦点关闭。
3. 保证指针从触发项移动到面板时 Header 仍属于活动区域；离开整体后关闭。
4. 对每次打开同步触发项 `aria-expanded`、面板 `hidden`/`aria-hidden` 和活动 root ID。
5. 在 `astro:page-load` 下验证新页面 Header 可以工作；通过清理或委托方式避免旧文档级监听器重复。
6. 确认移动菜单的 Escape、遮罩、关闭按钮、链接关闭和 body overflow 行为没有回归。

#### 阶段 4：响应式、主题和动效收口

1. 使用 Header 局部样式完成宽幅三列面板、边框、阴影、间距、链接 hover/focus 和空状态。
2. 在现有 `1023px` 断点关闭桌面 Mega Menu，确保移动端只显示抽屉入口。
3. 检查 1024px 附近、常用桌面宽度和窄桌面宽度的换行与横向溢出。
4. 对浅色、深色和 `prefers-reduced-motion` 分别验证。

#### 阶段 5：验证与交付前检查

1. 执行 `pnpm exec astro check`。
2. 执行 `pnpm build`，检查四个根目录的静态 HTML 中是否存在正确的中文面板内容，且无草稿/英文路由。
3. 按“测试计划”进行生产预览和浏览器手工测试，包含 ClientRouter 页面切换。
4. 检查 `git diff`/`git status`，确认只包含本 Feature 的业务实现文件；不得提交 `dist/`、`.astro/` 或无关改动。

### File Structure Changes

#### 预计修改

- `src/layouts/MainPageLayout.astro`
  - 调用 `getMegaMenuSections()` 获取四个根目录的窄化预览数据。
  - 向 Header 传递 `lang` 和 `megaMenuSections`。
- `src/components/Header.astro`
  - 增加 Header props。
  - 桌面顶级分类从前三项扩展为全部四项。
  - 增加静态 Mega Menu markup、局部样式、ARIA 属性和交互脚本。

- `src/utils/content-tree.ts`
  - 增加 `MegaMenuSection` 相关只读类型和窄化查询。

#### 预计不新增

- 不新增 `MegaMenu.astro` 或单独工具文件；当前功能只服务于 Header，拆出一个仅转发 props 的组件会增加文件和样式边界而不带来复用收益。
- 不修改 `src/content/navigation.ts`、`src/utils/content-utils.ts`、`src/utils/url-utils.ts`、`src/components/knowledge/SectionOverview.astro`、`src/styles/variables.css`、`src/styles/global.css`；`content-tree.ts` 仅增加本 Feature 所需窄化查询，不改变既有接口。
- 不修改 `src/content/`、`cms/`、`package.json`、`astro.config.mjs` 或页面路由。

### Code Locations

- Header 数据与链接：`src/components/Header.astro` frontmatter，现有 `topSections`、`currentLang`、`getRelativeLocaleUrl` 附近。
- 桌面导航触发项：`src/components/Header.astro` 的 `.site-nav`，现有 `topSections.slice(0, 3)` 所在位置。
- Mega Menu HTML：`src/components/Header.astro` 的 Header 内、移动菜单之前或之后的桌面专用区域。
- Mega Menu 样式：`src/components/Header.astro` 现有 `<style>`，与 `.site-header`/`.site-nav`/移动断点样式同处维护。
- 交互：`src/components/Header.astro` 现有 `initHeader()`，与移动抽屉事件绑定统一处理。
- Header 数据调用方：`src/layouts/MainPageLayout.astro` 的 `getContentTree(lang)` 和 `<Header />` 所在位置。

### Integration Points

- `MainPageLayout` 的所有消费者自动获得该 Header：首页、归档、文章、目录、关于、友链和 404。
- `getDirectoryTreeContext` 继续依赖内容树缓存，不能在 Header 中重新扫描集合。
- `KnowledgeTree` 与 Mega Menu 可以同时存在；Mega Menu 不修改左侧树的展开状态。
- Search、ThemeIcon、移动抽屉和 Footer 的 DOM/脚本不应被面板覆盖或改变。
- 页面链接触发 Astro `ClientRouter`；面板关闭和监听器生命周期必须与 `astro:page-load`/swap 兼容。

## 测试计划

本 Feature 默认不新增自动化测试模块，按项目规则采用类型检查、生产构建和浏览器手工验证。以下命令是实现阶段应执行的验证，不代表本计划阶段已执行。

### Test scenarios

#### 构建与静态数据

1. 执行 `pnpm exec astro check`：预期 Astro/TypeScript 无新增错误。
2. 执行 `pnpm build`：预期构建和 Pagefind 生成成功；不出现 CMS/API 请求依赖。
3. 在生产构建输出或预览中检查四个根目录：预期均有顶级触发项和对应 panel ID。
4. 检查当前空文章根目录：预期面板保留分类/目录结构，最近文章显示“暂无公开文章”。
5. 检查有文章的根目录：预期最近文章标题、链接和日期正确，最多 5 篇，按 `pubDate` 倒序。
6. 检查已知草稿或非中文内容（若仓库存在）：预期不出现在面板。

#### 桌面鼠标交互

1. 在约 1440px 宽度悬停每个顶级分类：对应面板在 Header 下方打开，内容与分类匹配。
2. 鼠标从触发项移动到面板：预期面板不关闭。
3. 在面板内移动并悬停另一个顶级分类：预期面板切换为新分类，不残留旧内容。
4. 鼠标离开 Header 和面板整体：预期面板关闭，正文布局不发生位移。
5. 点击外部正文、侧栏或 Footer：预期面板关闭。
6. 点击顶级分类文字、直属目录和文章：预期分别进入现有目录/文章 URL。

#### 键盘与可访问性

1. 仅使用 Tab 聚焦顶级分类：预期聚焦项展开对应面板，保留明显 `:focus-visible` 轮廓。
2. 检查 `aria-expanded`、`aria-controls`、panel `id`/隐藏状态：预期每个触发项只控制对应面板。
3. 面板关闭时连续 Tab：预期隐藏面板链接不进入焦点顺序。
4. 通过面板内链接获得焦点后按 Escape：预期面板关闭且焦点返回触发项。
5. 聚焦到 Header 中的首页/归档/关于或搜索按钮：预期无关 Mega Menu 关闭，不遮挡后续操作。
6. 按 Escape 或点击外部后再次聚焦/悬停：预期可以重新打开，不需要刷新页面。

#### 响应式与主题

1. 在 1023px、768px、375px 等宽度检查：预期桌面 nav/Mega Menu 不显示，移动按钮和现有抽屉可用。
2. 在移动抽屉中点击顶级分类：预期正常进入目录页，不出现桌面预览面板。
3. 在浅色和深色主题下分别检查面板背景、边框、阴影、辅助文字、hover/focus 和日期可读性。
4. 开启系统减少动效：预期没有必要的位移/淡入动画，交互状态仍正常。
5. 检查窄桌面宽度：预期三列内容换行但无横向滚动，面板高度超出视口时可滚动。

#### 路由与页面切换

1. 在根路径部署预览：预期所有面板链接路径正确。
2. 使用非根 `BASE_PATH` 构建/预览（例如 `/blob_website`）：预期目录和文章链接包含部署前缀且不重复。
3. 从 Mega Menu 进入首页、目录、文章、归档、关于后返回或继续悬停：预期每个新页面的 Header 交互只绑定一次。
4. 打开面板后使用 Astro `ClientRouter` 导航：预期旧面板不残留，新的页面可以再次正常打开。

### Test data and expected results

| 数据/场景 | 来源 | 预期 |
| --- | --- | --- |
| 四个根分类 | `topSections`/`directory-tree.json` | 全部显示，顺序与目录注册表一致 |
| 直属子目录 | `MegaMenuSection.childDirectories` | 只显示当前根节点的直接 children，链接到对应知识目录 |
| 最近文章 | `MegaMenuSection.recentArticles` | 只显示中文公开文章，最多 5 篇，按 `pubDate` 倒序 |
| 空根目录 | 当前无公开文章的根目录 | 展示结构和空状态，不显示伪造文章 |
| 草稿 | `draft: true` 文章（如存在） | 不进入面板、静态页面或搜索；本 Feature 不改变既有过滤 |
| 深色主题 | `data-theme="dark"` | 颜色来自现有主题变量且文本可读 |
| 非根部署 | `BASE_PATH=/blob_website` | 所有内部链接正确包含部署前缀 |

## 验收标准

### Success Metrics

- [ ] 桌面端四个顶级知识分类均可通过鼠标悬停打开对应 Mega Menu。
- [ ] Mega Menu 显示分类简介、直属子目录、子树最近中文公开文章和日期。
- [ ] 顶级分类、直属目录、最近文章和完整目录入口均可点击并保持既有路由语义。
- [ ] 鼠标可从触发项移动到面板，面板不会因间隙立即关闭；离开整体、点击外部或按 Escape 可关闭。
- [ ] 进入另一个顶级分类时面板正确切换，不混合旧分类内容。
- [ ] 键盘焦点可打开面板，ARIA 状态正确，隐藏面板链接不进入 Tab 顺序，Escape 后焦点可恢复。
- [ ] 移动端不出现 hover Mega Menu，现有抽屉导航的打开、关闭和链接行为不回归。
- [ ] 浅色、深色、减少动效、窄桌面和常见移动宽度下无明显布局/可读性问题。
- [ ] 中文默认路由、`BASE_PATH` 非根部署和 Astro ClientRouter 页面切换均可用。
- [ ] `pnpm exec astro check` 与 `pnpm build` 在实现阶段通过；无新增依赖、运行时 API、CMS 改动或业务内容改动。

### User Acceptance

用户在桌面 Header 上悬停或用键盘聚焦任一顶级知识分类，即可看到一个稳定、清晰、符合当前主题的宽幅内容预览，并能直接进入目录或文章；在移动端仍通过现有抽屉完成导航。该功能不改变任何既有路由、文章内容和 CMS 工作流。

### 关键决策点

1. 顶级分类范围：按 Feature 明确要求显示全部四个根目录，移除现有桌面 `slice(0, 3)`；不保留“只显示前三个”的旧行为。
2. 数据准备位置：由 `MainPageLayout.astro` 传入根目录上下文，Header 只负责静态呈现和交互；不让 Header 自行扫描内容集合。
3. 面板数据策略：四个面板静态预渲染，脚本仅控制状态；不引入共享 JSON 面板和客户端渲染。
4. 组件拆分：暂不新增 `MegaMenu.astro` 或工具文件，避免在只被 Header 使用的结构上增加转发层；若实现过程中 Header 的局部结构确实超过可维护边界，再单独提出范围变更，不在本计划中预设。

### 假设

- “顶层知识分类”指 `topSections` 中的所有根节点，即当前注册表的四项，而不是继续沿用 Header 旧的前三项展示限制。
- 当前桌面/移动断点 `1023px` 保持不变；需求没有授权改变整体响应式断点。
- “最近”沿用 `content-tree.ts` 现有 `recentArticles` 语义，即按 `pubDate` 倒序取最多 5 篇，而不是按 `updatedDate` 重新定义。
- 目录说明直接使用构建期目录上下文的中文字段；不新增 Header 专用文案配置。
- 顶级分类文字必须保持普通导航链接，因此不采用需要按钮才能展开的 menu button 模型，也不为点击增加 preventDefault。
- 计划中的 CSS 动效只作为视觉增强；若浏览器或减少动效设置不支持动画，面板仍必须完整可用。
- `MainPageLayout.astro` 是当前所有 Header 调用方；若后续代码检查发现存在未搜索到的独立 Header 调用方，应在实施前补齐其 props，而不改变数据模型。
