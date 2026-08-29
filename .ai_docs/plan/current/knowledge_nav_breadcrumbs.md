# 升级博客左侧导航并加入文章面包屑实施计划

## 概述

### Feature Description
升级博客文章页左侧知识导航，使其消费现有 `ContentTree` 的真实目录层级：目录节点按层级横向探索，目录本身可进入对应目录页，当前文章高亮，当前文章所在目录及祖先目录自动展开。同时在文章正文顶部增加文章面包屑，展示从首页、目录祖先、当前目录到文章的完整路径，除当前文章外每级均可返回。

本计划只描述实现方案，不创建分支、不修改业务代码。根据用户确认，本项目公开站点唯一语言为 `zh-cn`；本 feat 不生成英文页面、英文内容、英文导航/面包屑或 `/en/` 路由。

### User Benefits
- 用户能沿目录层级浏览知识树，直接进入任意已注册目录页。
- 当前文章与祖先目录一目了然，面包屑可逐级返回。
- 桌面稳定、移动端不挤压正文，链接兼容中文路由与 `BASE_PATH`。

### Project Alignment
- 复用 `src/utils/content-tree.ts` 的目录节点、祖先链、文章路径和缓存，不重复扫描 collection。
- 复用 `getRelativeLocaleUrl()`；保持 Astro 静态生成、草稿过滤和既有 `slugId` 语义。

### 计划分支名称
`feat/knowledge_nav_breadcrumbs`（仅记录，不创建或切换分支）。

## 需求分析

### Functional Requirements
1. 左侧导航使用 `ContentTree` 目录层级，不再按 `topSections` 平铺文章。
2. 展示任意深度目录及直属文章；目录链接进入 `/knowledge/<directoryId>/`，文章链接进入 `/blog/<id>/`。
3. 当前文章按 route/content `id` 高亮并设置 `aria-current="page"`。
4. 当前目录及全部祖先自动展开，非祖先分支默认不展开，避免侧栏过长。
5. 目录和文章文本可换行，不能造成横向溢出。
6. 文章面包屑顺序为首页 -> 根目录及祖先 -> 当前目录 -> 当前文章；除当前文章外每级可点击。
7. 面包屑直接消费 `ArticleTreeContext.path`，不重复实现目录查询。
8. 所有站内 URL 经 `getRelativeLocaleUrl()`，兼容中文路由和 `BASE_PATH`，不生成 `/en/` 链接。
9. 桌面端左导航、正文、右侧本页目录稳定；窄桌面不挤压正文。
10. 移动端侧栏不占正文宽度，面包屑可换行；本 feat 不新增移动端抽屉交互。
11. 保持中文-only 目录生成边界：不修改 `astro.config.mjs` 的 `locales: ['zh-cn']`，不生成任何 `/en/...` 路由。

### Non-Functional Requirements
- 构建阶段静态计算，无 CMS/API/运行时目录依赖，不新增依赖或测试框架。
- 保持语义 HTML、键盘焦点、`aria-current`、主题变量和可读对比度。
- 不改变公开文章、草稿、排序、目录统计、RSS 或 Pagefind 行为；不新增任何 locale fallback。

### Edge Cases
- 根目录、叶目录、深层目录、无直属文章但有子目录、空目录均正常。
- 长标题/长目录名可换行，不产生 viewport 横向滚动。
- 不设计英文文章或英文 fallback；公开站点只渲染中文文章。
- `BASE_PATH=/` 与非根路径均不能丢失或重复前缀。
- 无效目录、父节点循环、公开文章目录不一致继续由现有构建校验失败。

### Dependencies
- `src/content.config.ts` 的 blog `directory` 字段和公开内容。
- `src/content/navigation.ts`、`src/content/directory-tree.json` 的校验目录树与中文文案。
- `src/utils/content-utils.ts` 的公开过滤与分组。
- `src/utils/content-tree.ts` 的 `ContentTree`、`ArticleTreeContext.path`、祖先和索引。
- `src/utils/url-utils.ts` 的 `getRelativeLocaleUrl()`。
- `src/pages/[...locale]/knowledge/[...directory].astro` 当前中文-only 静态目录页及 `DirectoryPage.astro` 的面包屑样式参照。
- `astro.config.mjs` 当前只注册 `zh-cn`，不得因本 feat 扩大 locale。

## 技术设计

### Architecture Overview
数据层继续由 `content-tree.ts` 负责；文章 `getStaticPaths()` 准备 `ArticleTreeContext`；组件只渲染静态语义 HTML。`KnowledgeTree` 递归消费树根和当前文章上下文，文章页用同一 `treeContext.path` 渲染面包屑，目录定义只保留一份来源。

### Component Breakdown
- **内容树**：优先直接使用现有 `roots`、`DirectoryNode.children`、`directories`、`articles`、`ancestors` 和 `ArticleTreeContext.path`；如接口不足，只在 `content-tree.ts` 增加最小只读字段。
- **KnowledgeTree**：props 改为接收只读树数据、当前文章 ID/祖先、`lang`；递归渲染目录和直属文章。目录链接到 `/knowledge/${id}/`，文章链接到 `/blog/${id}/`。只展开当前祖先链，保留 sticky、最大高度滚动和主题变量。
- **ArticleBreadcrumbs**：建议新增 `src/components/knowledge/ArticleBreadcrumbs.astro`，接收 `path` 与 `lang`，按节点 `kind` 生成目录链接和当前文章文本；若实现仅十余行可内联，但不得重复路径逻辑。
- **文章页**：从既有 `tree`/`treeContext` 传入 roots 和 active 信息，在 header 合适位置接入面包屑；不另扫 collection。
- **响应式**：保留约 `1023px` 隐藏侧栏策略，必要时调整 grid 列宽/断点；移动端正文为单列，面包屑 `flex-wrap`。

### Data Flow
`Markdown -> content-utils 公开分组/locale 选择 -> content-tree ContentTree/ArticleTreeContext -> blog getStaticPaths props -> KnowledgeTree/ArticleBreadcrumbs -> getRelativeLocaleUrl -> 带 BASE_PATH 的静态 HTML`。

递归规则：目录始终渲染自身链接；只有根节点或当前祖先链目录渲染 children；直属文章随父目录展开，当前文章按 id 高亮。面包屑遍历 `treeContext.path`，目录可点击，当前文章为文本。

### Configuration Changes
- 默认不修改 `astro.config.mjs`、目录 JSON 或目录页路由。
- 不新增展开深度配置；展开集合由当前文章祖先确定。
- 若新增可见文案，只同步 `src/i18n/key.ts` 与 `src/i18n/language/zh-cn.ts`。

### API/Interface Definitions
```ts
interface KnowledgeTreeProps {
  roots: readonly DirectoryNode[];
  activeId: string;
  activeAncestors: readonly string[];
  lang: string;
}

interface ArticleBreadcrumbsProps {
  path: readonly (DirectoryNode | ArticleTreeArticle)[];
  lang: string;
}
```
实现可传 `treeContext` 代替拆分字段，但必须只读消费；节点以 `kind` 区分目录和文章，URL 使用对应 ID。

## 实施策略

### Implementation Phases
1. 核对 `getStaticPaths()` 的实际 locale、树 context、目录路由和 BASE_PATH；记录中文-only 边界并保护现有工作区改动。
2. 在文章页接线 `tree.roots`、当前文章 ID 和 `treeContext`；仅在确有需要时最小扩展 `content-tree.ts`。
3. 重写 `KnowledgeTree.astro` 为递归树，完成目录链接、祖先展开、当前高亮和可访问性。
4. 新增/内联 `ArticleBreadcrumbs.astro`，消费 `treeContext.path`，接入文章 header。
5. 调整 desktop/mobile CSS，检查长文本换行、overflow、主题和焦点。
6. 运行类型检查和生产构建，完成手工场景与结构审查；不生成英文页面或英文路由。

### File Structure Changes
| 文件 | 计划变更 |
| --- | --- |
| `src/utils/content-tree.ts` | 视接口需要最小只读扩展；优先不改 |
| `src/components/knowledge/KnowledgeTree.astro` | 改为递归 ContentTree 导航 |
| `src/components/knowledge/ArticleBreadcrumbs.astro` | 可能新增，渲染文章路径 |
| `src/pages/[...locale]/blog/[...id].astro` | 接入树 props、面包屑和响应式布局 |
| `src/utils/url-utils.ts` | 默认不改；仅验证发现 helper 缺陷时最小修正 |
| `src/content/navigation.ts`、`src/content/directory-tree.json` | 不改，保持唯一目录定义 |
| `src/pages/[...locale]/knowledge/[...directory].astro` | 默认不改，保持中文-only 生成 |
| `astro.config.mjs` | 不改，不新增英文 locale |
| `src/i18n/*` | 仅新增文案确有需要时修改 |

不得修改文章内容、schema、草稿规则、CMS 边界或 `slugId`。

### Code Locations
- 文章页：`getStaticPaths()`、`tree`/`treeContext` 解构、`<KnowledgeTree>` 和 `.article-layout` CSS。
- 树 API：`ContentTree`、`ArticleTreeContext`、`getArticleTreeContext()`。
- URL：`getRelativeLocaleUrl()`/`baseUrl()`。
- 生成边界：`knowledge/[...directory].astro` 与 `astro.config.mjs`。

### Integration Points
- 当前 `KnowledgeTree` 调用方为文章页；改 props 前用 `rg` 核对全部调用方。
- `topSections` 仍供 Header、首页等使用，不删除其投影，不把说明性 `children` 当真实树。
- 目录页现有面包屑与新组件共享 URL 规则，但不强行改变目录页实现。
- 文章排序、RSS 和 Pagefind 继续走现有公共查询链；不新增英文 fallback。

### Assumptions and Decision Points
#### Assumptions
- “横向探索”按静态多级树、目录可点击、祖先自动展开理解，不默认增加 JS 折叠/抽屉。
- 非祖先分支默认收起/不展开；移动端延续隐藏侧栏策略。
- 目录目标使用现有 `/knowledge/<id>/`；实际只生成 `zh-cn`。
- 目录标签只使用中文 labels；不新增英文目录标签或英文翻译文件。
- 只写计划文档，不创建分支、不提交、不推送、不创建 PR。

#### Decision Points
1. **英文相关范围**：用户已确认排除英文页面、内容、fallback 与 `/en/` 链接；本 feat 只验收中文链路。
2. **非祖先状态**：A 仅展开当前祖先链（短、定位清晰，推荐）；B 全树展开（探索直接但侧栏过长）。
3. **交互形式**：A 静态递归树（无 JS、简单，推荐）；B Svelte/客户端折叠（交互强但增加状态、焦点和移动测试成本）。
4. **面包屑位置**：A 小型独立 Astro 组件（职责清晰，推荐）；B 内联文章页（文件少但耦合更高）。

#### 备选方案
- 继续 category 平铺：无法表达任意深度和祖先展开，排除。
- 组件内重新 `getCollection()`：绕过公开/fallback/缓存边界，排除。
- 直接修改 Astro i18n 生成英文目录：扩大路由和内容范围，排除在本 feat 外。

## 测试计划

默认只写手工验证与既有命令，不新增测试模块。

### Test Scenarios
1. 运行 `pnpm exec astro check`，确认 props、联合节点和 readonly 类型通过。
2. 运行 `pnpm build`，确认中文目录页、文章页和 Pagefind 正常生成，草稿不进入导航。
3. 桌面打开深层中文文章，确认根目录至当前目录全部展开、文章唯一高亮、目录可点击。
4. 从侧栏进入根/一级/深层目录，再由目录页文章返回，确认路径正确。
5. 检查面包屑首页、每级祖先、当前目录、当前文章顺序；当前文章 `aria-current`，其他级别可点。
6. 不创建英文文章、fallback 或英文路由；只检查中文目录、文章和面包屑链路。
7. 以 `BASE_PATH=/blob_website` 和 `/` 验证所有 href 前缀不丢失、不重复。
8. 在 375px、640px、1024px、1100px 和大桌面检查不横向溢出、侧栏不挤压正文、右侧目录不重叠。
9. 浅色/深色主题及键盘 Tab/Enter 检查 active、hover、focus、语义和对比度。
10. 检查叶目录、空目录、无直属文章但有子目录、长标题和单路径等边界。
11. 完成后 `git status --short` 确认仅计划文档变更，不产生业务代码、构建产物或临时内容。

### Test Data and Expected Results
| 场景 | 预期 |
| --- | --- |
| 深层中文文章 | 祖先全展开，当前文章高亮，面包屑完整 |
| 根/叶/空目录 | 目录链接和路径不漏级、不重复，空状态正确 |
| 英文文章/fallback | 不属于本项目公开功能范围，测试中不创建 |
| `BASE_PATH=/blob_website` | href 带一次部署前缀 |
| 移动端 | 侧栏不占正文列，面包屑换行，无横向滚动 |
| 主题/键盘 | active/focus 可见，链接可操作 |

## 验收标准

### Success Metrics
- [ ] 左侧导航由 `ContentTree` 渲染真实多级目录，不再以 category 平铺实现多级导航。
- [ ] 目录节点进入对应中文目录页，文章节点进入现有文章详情页。
- [ ] 当前文章高亮并有 `aria-current="page"`；当前目录及祖先自动展开。
- [ ] 文章面包屑从首页到当前文章完整，每级目录可返回，当前文章为当前页语义。
- [ ] 链接通过 URL helper 兼容根路径与 BASE_PATH，且不生成英文路由。
- [ ] 桌面布局稳定，正文不被侧栏压缩；移动端不挤压正文且无横向溢出。
- [ ] 浅色、深色、hover、focus 和键盘访问可用。
- [ ] `astro.config.mjs` 未因本 feat 生成英文目录路由。
- [ ] 公开过滤、校验、排序、RSS、Pagefind、`slugId` 无回归，且未新增英文 fallback。
- [ ] 实现阶段实际运行并记录 `pnpm exec astro check` 与 `pnpm build`；计划阶段不运行代码实现。
- [ ] 工作区除本计划文档外无业务代码变更。

### User Acceptance
- 桌面文章页可从左侧沿多级目录探索，当前文章和祖先目录清晰可见。
- 面包屑可逐级返回首页或任意祖先目录。
- 移动端正文保持可读，面包屑仍可读可操作。
- 中文-only 目录生成边界在实现、测试和交付说明中保持一致；英文内容与路由均不属于项目范围。

## 挑战合并记录

本节记录 Step 2 的逐条挑战及 Step 3 的处理结论。`accept` 表示已将建议落实到本计划；`reject` 表示基于当前代码/范围拒绝；`escalate` 表示存在范围或产品偏好取舍，必须由主 agent/用户确认后才能进入实现。

### 结论摘要

- `accept`：CH-01、CH-02、CH-03、CH-04、CH-05、CH-06、CH-07、CH-08、CH-09。
- `reject`：无。
- `escalate`：无（用户已选择中文-only 方案）。

### 逐条评估

#### CH-01 高：英文能力与验收范围未闭合 — `accept`

- **理由**：代码证据确认 `astro.config.mjs` 只注册 `zh-cn`，文章静态路径和公开内容收集也以默认中文边界为主；但原计划仍把英文文章/fallback 与英文目录链接放在同一测试叙述中。该问题是功能范围选择，不是仅靠计划文字可以安全决定的实现细节。
- **已更新**：将中文-only 写成项目级硬边界；验收只包含中文页面、内容、导航和面包屑，不保留英文文章/fallback 或英文目录链接检查。完整英文能力被移出项目范围。
- **用户决策**：选择 A，并确认项目级限制为中文博客；英文页面、英文内容、英文 fallback、英文目录链接和 `/en/` 路由均排除在项目范围外。

#### CH-02 高：`getStaticPaths` 与渲染 locale/context 不一致 — `accept`

- **理由**：文章页静态路径使用默认 locale 构建 `treeContext`，渲染阶段又使用 `Astro.currentLocale` 获取 `tree`；若未来启用多 locale，文章、树和面包屑可能混用语言。当前配置不足以替用户决定未来 locale 设计。
- **已更新**：实施阶段第一步增加“确认 locale 不变量”；接口设计规定导航和面包屑必须消费同一 locale 构建的 tree/context，不允许以 `currentLang` 和默认 locale 混用作为新行为。
- **用户决策**：选择 A。全链路固定当前唯一公开 locale `zh-cn`，不扩展静态路径或 i18n 配置；文章、树和面包屑必须使用同一中文上下文。

#### CH-03 高：`activeAncestors` 不足以实现当前目录自动展开 — `accept`

- **理由**：`ArticleTreeArticle.ancestors` 只包含父目录；当前目录单独位于 `ArticleTreeContext.directory`，若只传 ancestors，当前目录的直属文章不会被渲染。
- **计划更新**：接口改为优先传递完整 `treeContext`，或显式传递 `activeAncestors` 与 `activeDirectoryId`；展开集合定义为 `new Set([...article.ancestors, directory.id])`。新增根/叶/深层目录验收，确保当前目录直属文章可见且当前文章可高亮。

#### CH-04 中：递归渲染方式和唯一数据源未明确 — `accept`

- **理由**：`DirectoryNode` 同时提供 `children`、`directories`、`articles`，而 `children` 已在 `content-tree.ts` 中按目录再文章合并；同时遍历会重复渲染。
- **计划更新**：唯一渲染源定为 `DirectoryNode.children`，递归实现按节点 `kind` 分支；禁止同时遍历 `children` 与 `directories/articles`。若实现需要独立职责，可使用小型递归 Astro 子组件，但不新增第二套排序或树数据。

#### CH-05 高：桌面布局已有溢出风险 — `accept`

- **理由**：当前三栏理论宽度约为 205 + 720 + 205 加间距，接近或超过 `page-shell` 1180px；“必要时调整”不足以形成可执行的布局门槛。
- **计划更新**：采用方案 A：在窄桌面断点优先隐藏右侧 `OnThisPage`，保留左侧导航和正文两栏；在更窄断点隐藏左侧导航并让正文单列。实现时明确检查约 1200px、1100px、1024px 和 640px，禁止通过增大全站容器宽度解决本页面问题。若现有右侧组件不能单独隐藏，则在文章页以布局断点控制其占位，不改变全站配置。
- **验收更新**：桌面验收新增“约 1200px 及 1100px 不出现三栏挤压；右侧目录隐藏后正文宽度保持可读；1024px 以下左侧不占列”。

#### CH-06 中：URL 验收未覆盖 query/trailing slash — `accept`

- **理由**：`url-utils.ts` 明确处理 query/hash/trailing slash，文章页已有带 query 的归档链接，已有计划只验证了前缀。
- **计划更新**：URL 手工测试增加目录/文章末尾斜杠、归档 `?category=` 编码、带 hash 的路径、根路径与 `BASE_PATH` 前缀不重复断言；不新增 URL 单测框架。

#### CH-07 中：可访问性语义边界未明确 — `accept`

- **理由**：静态导航不需要伪造 ARIA tree；若加入 role=tree、折叠按钮和 `aria-expanded`，会引入不完整键盘交互。
- **计划更新**：采用普通 `nav`/`ul`/`li`（外层保留 `aside`）和原生链接语义，不使用不完整的 `role=tree`。当前项使用 `aria-current="page"`，装饰分隔符 `aria-hidden`；若以后加入折叠交互，必须另行设计完整键盘与 ARIA 状态。
- **验收更新**：增加 Tab 顺序、焦点可见、链接可操作、辅助技术不读装饰分隔符以及不依赖颜色识别当前项的手工检查。

#### CH-08 中：现有数据不足以证明深层/同级/长路径 — `accept`

- **理由**：当前仓库样本不足以覆盖计划中的所有树形场景，单次正常构建不能证明递归和布局边界。
- **计划更新**：实现验证阶段允许使用未提交、可清理的临时本地 fixture，或在已有数据不足时将场景标记为“待 fixture 验证”；fixture 必须遵守现有 schema、公开/草稿规则，测试结束立即删除并用 `git status` 确认无残留。不得把临时内容提交为业务内容。至少覆盖深层目录、同级文章、长目录名/标题和空目录。
- **验收更新**：在没有 fixture 的环境中，不把未实际验证的场景标记为通过；交付说明必须区分已验证与待补充场景。

#### CH-09 低：独立组件与内联未决 — `accept`

- **理由**：当前只有文章页调用面包屑，新增文件可能成为过度抽象；但路径渲染仍应与文章页主体职责分离到可理解程度。
- **计划更新**：默认选择文章页内联一个小型、局部的 breadcrumb 渲染块；只有实现中出现可复用逻辑或 JSX/Astro 模板明显膨胀时，才新增 `ArticleBreadcrumbs.astro`。无论选哪种，接口语义、`path` 单一数据源和 URL helper 规则不变。
- **验收更新**：文件变更清单将独立组件由“可能新增”调整为“默认不新增，必要时新增”，避免无第二调用方时过度抽象。

### 合并后的实施/接口/测试/验收修订

- **实施顺序**：中文-only 范围已确认；实现时先统一文章页面的 `zh-cn` locale/context 不变量，再接线树数据、实现递归导航、加入面包屑，最后处理明确的四档响应式布局。
- **接口**：`KnowledgeTree` 不再只接收 `activeAncestors`；优先接收 `treeContext` 与 `roots`，或至少同时接收 `activeDirectoryId`。递归只消费 `children`，当前展开集合必须包含当前目录 ID。
- **布局**：约 1200px/1100px 断点隐藏右侧本页目录，约 1024px 以下隐藏左侧导航并切单列，640px 以下进一步收紧间距；实现阶段以实际 `page-shell`/`--reading-width` 测量为准，不扩大全站容器。
- **URL**：手工验证 query 编码、hash、末尾斜杠、根路径和非根 `BASE_PATH`，并断言前缀只出现一次。
- **测试数据**：不足场景使用临时、可清理 fixture；不把未验证场景伪称通过。
- **无障碍**：采用普通 `nav`/`ul`/`li`/链接，不引入不完整 ARIA tree；面包屑和导航均验证键盘焦点与当前项语义。
