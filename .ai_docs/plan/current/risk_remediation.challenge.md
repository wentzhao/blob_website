# risk_remediation 计划独立挑战清单

审查对象：`.ai_docs/plan/current/risk_remediation.md`

审查范围：README、项目上下文与规则文档，以及当前 Astro 页面、Content Collections、URL 工具、Pagefind、RSS、CLI 脚手架、CMS 和工作区状态。

结论：计划覆盖面完整，但目前仍有若干不可直接实施的分支决策和边界缺口。尤其是 draft 开发预览、base path、工作区保护和 CLI/CMS 双写入契约，需要在实施前收紧；否则容易出现“检查通过但公开路由、搜索或 CMS 行为不一致”。

## Challenges

### C1：draft 的开发预览策略缺少 Astro 静态生成边界

- 优先级：高
- 计划位置或相关文件/符号：计划“草稿可见性”、Phase 2；`src/utils/content-utils.ts:getBlogEntrySort`；`src/pages/[...locale]/blog/[...id].astro:getStaticPaths`
- 代码证据：`getBlogEntrySort` 直接使用 `getCollection('blog', filter || defaultFilter)`，默认过滤 `data.draft !== true`；文章页的 `getStaticPaths` 对每个 locale 调用该函数，未传入环境策略；文章模板仍有 `entry.data.draft` 提示（`src/pages/[...locale]/blog/[...id].astro:66`）。
- 理由：计划把“开发环境生成 draft 详情”和“生产构建完全排除”同时作为推荐行为，但没有定义环境判断位于查询层、页面层还是 `getStaticPaths` 层，也没有区分 `pnpm dev` 与 `pnpm preview`。Astro 静态路由必须在 `getStaticPaths` 返回 draft 路径时才可访问；而 `pnpm preview` 服务的是已构建的生产产物，不能被当作开发 draft 预览。仅增加 `includeDraft` 参数仍可能让 RSS、首页或其他调用方误用。
- 影响范围：draft 详情路由、首页、归档、KnowledgeTree、上下篇、RSS、Pagefind 以及 README 对“预览”的描述；错误时可能把 draft 生成到生产 `dist`，或使 draft 提示仍不可达。
- 替代方案及代价比较：
  - 方案 A：仅在 `import.meta.env.DEV` 下允许 draft，查询层使用明确的 visibility policy，生产 `getStaticPaths`、RSS 均强制公开集合。收益是保留作者预览；代价是必须明确 `dev`/`preview` 差异并覆盖所有调用点。
  - 方案 B：所有环境均排除 draft，移除或改写 draft 提示。收益是实现和安全边界最简单；代价是失去站内开发预览，需要 CMS 或其他预览路径承担预览职责。
- 建议 action：把环境矩阵和唯一可见性接口写入计划，明确 `pnpm dev` 可选、`pnpm build`/`pnpm preview` 必须排除，并增加“生产构建产物不存在 draft HTML”作为硬验收；若无法在静态模式下可靠保证，采用方案 B。

### C2：`getBlogEntrySort` 的新查询接口仍可能让调用方绕过 draft 保护

- 优先级：高
- 计划位置或相关文件/符号：计划“查询接口设计”、Phase 2；`src/utils/content-utils.ts:getBlogEntrySort`
- 代码证据：现有签名为 `(lang, filter?, sort?)`，实现使用 `filter || defaultFilter`；计划示例新增 `includeDraft`、`filter`、`sort`，但仍保留了可传任意 filter 的设计。
- 理由：如果公开调用方传入 `filter`，现有实现会整体替换默认 draft 过滤；如果新接口继续保留同等自由度，后续维护者很容易无意中传入 `() => true`。计划只说“组合默认 draft 条件”，没有规定类型和组合顺序，也没有说明哪些调用点允许 `includeDraft`。
- 影响范围：首页、归档、详情静态路径、RSS、任何未来列表页；直接影响公开泄露风险和 Pagefind 输入集合。
- 替代方案及代价比较：
  - 方案 A：将公开查询与开发查询拆成两个窄接口，公开接口不接受 `includeDraft`，自定义 filter 只作为附加条件。收益是安全默认明确；代价是接口数量略增。
  - 方案 B：保留单接口，使用 `visibility: 'public' | 'development'`，并把任意业务过滤器与 visibility 条件强制 AND。收益是调用点统一；代价是需要一次性迁移所有调用点。
  - 方案 C：继续保留当前位置参数并只修复 `filter && defaultFilter`。收益是改动最小；代价是调用意图不清，未来仍可能绕过保护。
- 建议 action：选择 A 或 B，并在验收中加入一个“调用方附加过滤器返回 draft 仍不可见”的回归样例；不要把“最终接口以实施时决定”留作实现阶段临时决策。

### C3：locale fallback 与语言切换仍没有形成单一、可验证的路由政策

- 优先级：高
- 计划位置或相关文件/符号：计划“locale 路由与回退”、Phase 2、locale 测试矩阵；`src/utils/content-utils.ts:getBlogEntrySort`；`src/components/Header.astro:18,45-46`；`src/pages/[...locale]/blog/[...id].astro:getStaticPaths`
- 代码证据：`getBlogEntrySort('en')` 在缺少英文版本时选择中文并设置 `isFallback`，但默认 locale 分支只选择 `translations[defaultLanguage]`；Header 的 `languagePath` 只返回 `/` 或 `/${locale}/`，不保留当前文章或页面路径。
- 理由：计划同时提出“英文 fallback”“只有英文文章不进入中文列表”“语言切换尽量保留当前页面”“目标不存在时回首页”，但未定义这些规则的优先级和对应关系。特别是只有英文文章从 `/en/blog/id` 切到中文时，必须决定是首页、404 还是仍显示英文；双语文章从文章页切换应保留逻辑文章 ID；spec 页面则应保持 `/about`/`/en/about`。仅在测试项中写“按最终策略”不足以指导实现。
- 影响范围：静态路由数量、Header 语言菜单、文章 fallback 提示、文章上下篇、SEO canonical/hreflang（若存在）、首页/归档文章集合。
- 替代方案及代价比较：
  - 方案 A：建立“逻辑文章 ID -> 可用 locale URL”的纯函数，目标 locale 有对应版本就保留文章路径，否则回到目标 locale 首页；默认中文列表不展示仅英文文章。收益是不会生成已知 404，规则可测试；代价是 Header 需要拿到当前页面语义和可用条目。
  - 方案 B：任何语言切换都只去对应 locale 首页。收益是实现简单、绝不生成错链；代价是丢失文章上下文，双语切换体验较差。
  - 方案 C：默认 locale 也展示仅英文文章并标记语言。收益是内容发现完整；代价是中文列表出现跨语言内容，必须同步翻译和可访问性文案。
- 建议 action：在计划中固定 A/B/C 之一，并为“仅中文、仅英文、双语、英文 fallback”分别写出 URL 与期望内容；把 Header 的语言切换从当前全局路径替换为该政策的实现点。

### C4：base path 修复范围与现有 URL 工具不匹配

- 优先级：高
- 计划位置或相关文件/符号：计划“locale/base URL 不一致”、RSS、Phase 2；`src/utils/url-utils.ts:5-13,42-49`；`astro.config.mjs:25-34`；`src/pages/[...locale]/[...page].astro:31`；`src/components/Footer.astro:8`；`src/components/Header.astro:18`；`src/components/control/BlogNavi.astro:17-20`
- 代码证据：`getRelativeLocaleUrl` 只拼接 `/`、locale 和 path，不使用 `import.meta.env.BASE_URL`；`baseUrl` 才读取 `BASE_URL`。首页直接使用 `href="/archives/"`，Footer 使用 `href="/rss.xml"`，Header 语言切换手工拼接根路径，BlogNavi 手工拼接 `/blog`。Astro 配置没有显式 `base`。
- 理由：计划声称统一现有 URL 工具并验证非根 base path，但现有工具本身不是 base-aware，且计划没有明确修改 `astro.config.mjs` 或定义 base path 的来源。只修部分硬编码链接会留下“页面链接可用、RSS/脚本/静态资源不可用”的半修复状态。
- 影响范围：部署到子路径时的全部内部链接、Pagefind 脚本加载、favicon、RSS、canonical、语言切换以及文章导航；可能影响根路径部署下的回归。
- 替代方案及代价比较：
  - 方案 A：明确支持 Astro `base`，由单一 URL helper 处理 `BASE_URL + locale + path`，所有页面与 RSS 使用它，并同步配置/测试。收益是边界完整；代价是需要核对 Astro `site`、`base`、Pagefind 资源路径的组合。
  - 方案 B：明确项目只支持域名根路径，停止声称非根 base path 已覆盖，修复当前根路径硬编码并在文档写出限制。收益是范围小、风险可控；代价是放弃子路径部署能力。
- 建议 action：实施前选择 A 或 B；若选 A，必须把 `astro.config.mjs`、`baseUrl`、`getRelativeLocaleUrl`、RSS `link` 和 Header Pagefind URL 放入同一验收场景，不能只做手工根路径检查。

### C5：Pagefind “按当前 locale 过滤”方案缺少索引集合和结果 URL 规范化定义

- 优先级：高
- 计划位置或相关文件/符号：计划“搜索与 Pagefind”、Search 数据流、Phase 4；`src/components/Header.astro:128-150`；`src/components/misc/Search.astro:178-202,237`；`pagefind.yml`
- 代码证据：Header 的 `loadPagefind` 在完成动态 import 后只设置 `window.pagefind`，不返回或保存可等待的 Promise；Search 查询前直接对 `window.pagefind` 执行 `destroy()`/`init()`，否则把未加载状态显示为开发环境提示；结果只读取 `data.url`，没有 locale 归一化或过滤。
- 理由：计划要求“等待 loader”“单例生命周期”“当前 locale URL 过滤”，但没有定义 Header 与 Search 谁拥有 loader、加载失败如何传播、Astro transitions 后如何复用，以及 URL 是否含 base path、前导斜杠和 trailing slash。若结果过滤后为空，还要区分“全站无结果”和“当前语言无结果”。
- 影响范围：首次点击立即输入、重复打开、页面 transition、生产/开发提示、双语言重复结果、子路径部署和搜索错误显示。
- 替代方案及代价比较：
  - 方案 A：建立一个共享的 `pagefindLoadingPromise`/状态机，Search 只等待并查询，不执行 destroy/init；按 URL 解析 locale 过滤。收益是生命周期清晰；代价是需要在 inline script 与 Astro transition 生命周期间保持全局状态。
  - 方案 B：构建两个按语言隔离的 Pagefind 索引。收益是查询时不需客户端过滤；代价是改变构建命令/产物结构，增加配置和维护成本，本项目当前没有现成支持。
  - 方案 C：保留跨 locale 搜索，显示语言标签并去重。收益是实现改动小且内容发现完整；代价是需要设计排序、去重和语言提示。
- 建议 action：至少补充 URL 规范化函数、loader 状态转移和“当前 locale 无结果”的验收；若继续使用单索引，明确采用 A 或 C，不能只在 Search 中增加一个字符串前缀判断。

### C6：搜索结果使用 `innerHTML` 的安全风险未被计划完整纳入

- 优先级：高
- 计划位置或相关文件/符号：计划“搜索与 Pagefind”第 7 项、Phase 4；`src/components/misc/Search.astro:226-240`
- 代码证据：`displayResults` 将 `result.meta.title`、`result.excerpt` 和 `result.url` 直接插入模板字符串后赋给 `searchResults.innerHTML`；这些值来自被索引的 Markdown/frontmatter，当前 schema 只约束类型，不清洗 HTML。
- 理由：计划提到“采用安全的 DOM 文本/受控标记渲染方式”，但没有把它列为独立风险、没有规定 Pagefind excerpt 中高亮标记如何保留，也没有测试恶意标题、摘要或 URL。文章作者可控制 title/description/body，故这不是理论上的外部输入问题。
- 影响范围：搜索弹窗 DOM、标题/摘要显示、结果跳转；修复不当还可能破坏 Pagefind 的 `<mark>` 高亮或转义行为。
- 替代方案及代价比较：
  - 方案 A：使用 `createElement`/`textContent` 创建标题和摘要，URL 只允许 `URL` 解析后的站内路径；若需高亮，使用 Pagefind 提供的安全结果节点或受控 token 渲染。收益是边界最清楚；代价是代码略多。
  - 方案 B：对所有 HTML 字段统一 DOMPurify。收益是可复用；代价是已有依赖虽存在但会引入清洗配置与客户端包体，且不能替代 URL allowlist。
  - 方案 C：仅 `escapeHtml` 后继续字符串模板。收益是改动小；代价是 URL 校验和高亮处理仍需另外实现，容易遗漏。
- 建议 action：把安全 DOM/URL 约束写入实施步骤和验收，至少加入 `<script>`、`<img onerror>`、引号和外部 URL 的搜索数据样本；不接受“手工看起来正常”作为验证。

### C7：newpost 的路径安全修复必须在任何文件系统操作前完成，且 `slugId` 语义未定

- 优先级：高
- 计划位置或相关文件/符号：计划“新文章脚手架”、Phase 1；`script/newpost.js:26-40,43-70`；`src/content/blog/tech/getting-started/zh-cn.md:8`；`cms/server/store.mjs:107-150,158-179`
- 代码证据：CLI 用 `join(basePath, folderPath)` 后立即 `mkdir(fullPath, { recursive: true })`，只有之后才检查目标语言文件是否存在；没有对 `..`、绝对路径、Windows 驱动器、空片段或保留语言文件名做校验。CLI 模板当前生成 `date`/`slug`，而现有文章和 schema使用 `pubDate`/`slugId`。CMS 新建文章则把 `slugId` 设为完整相对路径，且 CMS 文档说明 slugId 与文件夹位置存在解耦规则。
- 理由：计划把路径防护写成“评估并补充”“如纳入本次范围”，但这是已确认的越界写入风险，不能作为可选项。另一个未决问题是 `slugId` 应写完整 `folderPath`、basename，还是保持外部评论标识；直接照搬 `folderPath` 可能改变评论 ID/CMS 移动规则，照搬现有文章又会使 CLI 与 CMS 语义继续分裂。
- 影响范围：文件系统安全、内容集合构建、评论 postSlug、CMS 编辑/移动、文章唯一标识和新文章体验。
- 替代方案及代价比较：
  - 方案 A：先用 `resolve(basePath, folderPath)` + `relative(basePath, resolved)` 验证结果仍在 blog 根下，再验证路径片段和语言文件名；模板使用完整相对路径作为 `slugId`。收益是与 CMS 新建规则一致；代价是可能改变新文章评论标识约定。
  - 方案 B：路径与 `slugId` 明确分离，CLI 生成稳定业务 ID（例如 basename/显式参数），CMS 继续按自身契约处理。收益是保留外部标识独立性；代价是需要文档化并测试重复 ID/评论隔离。
  - 方案 C：只改 frontmatter 字段，不做路径安全和 ID 统一。收益是最小改动；代价是保留已知越界风险，不可接受。
- 建议 action：把路径校验改为强制前置步骤，非法参数在 `mkdir` 前失败；同时在计划决策表中明确 `slugId` 与目录 ID 的关系，并把 CLI 与 CMS 各自的创建/保存/移动行为纳入验收。

### C8：spec schema 的“最小 schema”与 frontmatter 兼容性验证不够精确

- 优先级：中
- 计划位置或相关文件/符号：计划“内容集合”、Phase 1、验收标准；`src/content.config.ts:19-23`；`src/content/spec/about/*.md`；`src/content/spec/friends/*.md`
- 代码证据：spec 当前只有 glob loader；四个现有 spec 文件都含 `title`。计划拟增加 `z.object({ title: z.string() })`，但没有说明未知字段是保留、剥离还是拒绝，也没有说明 `getSpec` 返回类型变化如何影响 `render`。
- 理由：当前文件与 `title: string` 兼容，但“schema 与 frontmatter 一致”不等于“未来 spec frontmatter 行为明确”。Astro/Zod object 默认对未知键的处理可能与维护者直觉不同；如果 CMS 或文档未来给 spec 加字段，构建失败/静默剥离都可能成为漂移来源。
- 影响范围：about/friends 构建、`getSpec`、Markdown 渲染、未来 spec 元数据和文档规则。
- 替代方案及代价比较：
  - 方案 A：保持最小 schema，明确未知字段策略并只验证现有四个文件。收益是范围最小；代价是 spec 扩展字段仍需后续设计。
  - 方案 B：为 spec 定义完整、可扩展的 frontmatter schema。收益是接口更明确；代价是把本次风险修复扩大到 spec 内容模型。
  - 方案 C：不加 schema，仅在 overview 中说明 spec 无约束。收益是避免迁移；代价是继续保留构建期类型保护缺口。
- 建议 action：默认采用 A，并在计划中明确“本次只校验 title，不承诺未知字段契约”；增加 `astro check` 与四个 spec 页面构建验收，避免把未验证的未来字段兼容性写成已解决。

### C9：二级导航 `topicId` 方案没有定义数据完整性和未归类语义

- 优先级：中
- 计划位置或相关文件/符号：计划“导航子目录”、Navigation child query、Phase 3；`src/content/navigation.ts:1-20,24-70`；`src/components/knowledge/SectionOverview.astro:31-36`；`src/components/knowledge/KnowledgeTree.astro:20-31`；`src/components/ArchivePanel.svelte:15-66`
- 代码证据：当前每个 child 的 `path` 都只包含顶级 `category`，`NavigationChild.id` 没有内容字段对应；`validateNavigation` 只检查顶级 section ID，未检查 child ID、child path 或 section-child 关系；ArchivePanel 只读取 `category`，没有 `topicId` 状态。
- 理由：可选 `topicId` 只解决“字段存在”，不解决未知 topic、重复 topic、section label 改名、缺失 topic、无 category 文章和跨 section 同名 topic 的行为。计划同时要求缺失 topic 的文章仍在顶级分类可见，又要求 child 链接只显示对应文章，但未规定 topic query 与 category query 的 AND/OR 和空结果文案。
- 影响范围：首页目录链接、KnowledgeTree、归档筛选 URL、文章分类回链、frontmatter schema、导航配置维护成本。
- 替代方案及代价比较：
  - 方案 A：增加 `topicId`，以 `section.id`/`child.id` 作为稳定键，构建期校验 child 唯一性与文章 topic 是否属于对应 section。收益是导航成为真实内容模型；代价是新增校验和迁移规则。
  - 方案 B：children 仅作说明项，不渲染 `<a>`，只保留顶级 category 筛选。收益是简单且不会伪造结果；代价是目录不能深入筛选。
  - 方案 C：使用目录路径自动推导 topic，不增加 frontmatter。收益是减少字段；代价是文件夹结构与展示导航强耦合，且现有文章路径未必表达 topic。
- 建议 action：若采用 A，明确未知 topic 是构建失败还是落入“未指定主题”，并为跨 section ID、category 缺失和 child 空结果添加验收；若采用 B，计划必须明确 `SectionOverview` 会从链接改为说明元素，而不是只更新 path。

### C10：分页遗留清理与当前未提交工作区存在直接删除冲突

- 优先级：高
- 计划位置或相关文件/符号：计划“分页遗留”、Phase 3、文件结构变化；`src/config.ts:15`；`src/types/config.ts:7`；`src/components/PostPage.astro`；`src/components/control/Navi.astro`；`git status --short`
- 代码证据：当前工作区已有 `M src/config.ts`、`M src/components/PostPage.astro`，并有大量其他已修改/删除/未跟踪文件；计划默认方案包含删除 `pageSize`、`PostPage.astro`、`Navi.astro`，同时只笼统要求保留未提交改动。
- 理由：在 dirty worktree 中删除已被用户修改的 `PostPage.astro` 或修改同样已变更的 `src/config.ts`，即使这些文件当前未被主页面导入，也可能覆盖用户正在迁移的工作。`rg` 只能证明当前引用关系，不能证明文件没有用户意图或被脚本/文档/未来 CMS 使用。
- 影响范围：用户未提交改动、配置类型、旧页面的潜在手工入口、后续合并和回滚；属于不可逆或高恢复成本的工作区变更。
- 替代方案及代价比较：
  - 方案 A：本次只移除有效调用链中的无效配置引用，保留未接入组件文件，另开清理任务。收益是安全、范围清晰；代价是仓库仍有少量死代码。
  - 方案 B：在实施前导出并逐文件审计 `git diff`，仅删除未被用户修改且有明确无调用方证据的文件。收益是可完成清理；代价是流程和人工核对成本较高。
  - 方案 C：重新接入分页。收益是保留现有文件价值；代价是明显扩大产品范围，需重做信息架构和 SEO。
- 建议 action：将“不得删除已修改/未跟踪文件”提升为实施门禁；默认采用 A。若坚持删除，必须先逐文件对比工作区 diff、确认用户授权，并把删除结果列入变更预览，而不能只依赖计划中的“保留已有改动”表述。

### C11：计划把 CMS 视为非修改边界，但它是实际 frontmatter 写入方

- 优先级：高
- 计划位置或相关文件/符号：计划“明确不修改”、Phase 1/5、CMS 边界说明；`cms/server/store.mjs:40-46,107-179`；`cms/server/articles.mjs:18-42`；`cms/src/pages/new-article.ts:27-56`；`cms/AGENT.md`
- 代码证据：CMS 的 `createArticle` 会生成 `pubDate`、`slugId`、`draft`、`category`、`pinTop`；`saveArticle` 会归一化并写回任意 payload.data，且存在按 `slugId` 触发目录移动的规则；CMS API 自己实现 `safeRel` 和语言校验。计划只修改 `script/newpost.js`，并将 CMS 列为除非直接阻塞否则不修改。
- 理由：博客内容有两个写入入口，CLI 与 CMS 生成/保存规则不完全相同。只修 CLI 不能证明“维护者可以按 README 创建文章并直接构建”，因为维护者也可能通过 CMS 创建或修改文章。引入 `topicId`、收紧 spec/blog schema、统一 `slugId` 语义后，CMS 的类型、表单、归一化和移动行为至少需要契约验证。
- 影响范围：CMS 新建文章、编辑保存、slugId 修改、draft 筛选、topic 字段、构建失败、内容目录安全。
- 替代方案及代价比较：
  - 方案 A：不修改 CMS，但把它列为外部写入契约，增加 `cms/smoke.mjs`/API 手工验证和文档限制。收益是本次业务改动边界稳定；代价是两套写入逻辑继续存在。
  - 方案 B：抽取共享 frontmatter 规则供 CLI/CMS 使用。收益是一致性最高；代价是跨根目录运行时共享模块，改动和打包边界明显扩大。
  - 方案 C：本次同步修复 CMS 的模板/字段/路径校验。收益是直接闭合风险；代价是会扩大本次实现文件范围，需要新增 CMS 回归验证。
- 建议 action：至少采用 A，把 CMS 创建、保存、移动和 draft 行为加入测试矩阵；若 `topicId` 或 `slugId` 政策依赖 CMS 表单，则升级为 C，不应继续以“除非阻塞”模糊处理。

### C12：RSS 的默认 locale 与 base path 修复仍有链接生成缺口

- 优先级：高
- 计划位置或相关文件/符号：计划“RSS”、Phase 4、RSS 验收；`src/pages/rss.xml.ts:7-20`；`src/layouts/Layout.astro:47-50`
- 代码证据：RSS 使用 `getBlogEntrySort(i18n!.defaultLocale)`，这一点能排除 draft，但 item link 硬编码为 `/blog/${post.id}/`；Layout 的 alternate RSS 使用 `new URL("rss.xml", Astro.site)`；Astro config 只有 `site`，没有 `base`。
- 理由：计划要求 RSS 链接可在非根 base path 下工作，却只说“使用 URL 工具或等价的绝对 URL”。如果 URL 工具仍不处理 base，RSS 会在子路径部署时指向域名根；如果直接把带 locale 的相对路径交给 RSS，又要核对 `@astrojs/rss` 的解析基准和 trailing slash。另一个边界是 `Astro.site` 未配置时 fallback `example.com` 会生成看似合法但错误的绝对 feed 链接。
- 影响范围：订阅客户端文章链接、feed alternate、canonical、部署域名与 base path。
- 替代方案及代价比较：
  - 方案 A：先确定 base policy，再由 `context.site` 加上经过统一 helper 生成的公开文章路径，显式测试 trailing slash。收益是可证明链接正确；代价是需同时处理 Astro site/base 配置。
  - 方案 B：明确只支持根路径，RSS 仅修复默认 locale 公开集合并在文档注明 `PUBLIC_SITE_URL` 必须是根域名。收益是简单；代价是放弃非根部署。
- 建议 action：把“RSS item link、alternate link、Pagefind script URL”放进同一个 base-path 验收组；若未支持非根部署，不要在计划中声称已解决该风险。

### C13：Pagefind 是否索引 spec 仍是待决策，但 Phase 0 和验收没有冻结它

- 优先级：中
- 计划位置或相关文件/符号：计划“搜索与 Pagefind”第 7 项、Phase 0、Phase 4、设计决策第 6 项；`src/components/misc/Markdown.astro:12`；`pagefind.yml`；`src/pages/[...locale]/about.astro:30-35`；`src/pages/[...locale]/friends.astro:29-35`
- 代码证据：Markdown 组件对 blog 和 spec 都输出 `data-pagefind-body`；`pagefind.yml` 没有排除 about/friends 页面或 spec body；计划自身承认 spec 当前可能进入搜索，但 Phase 0 要确认的决策列表只列二级导航、draft、搜索 locale，没有列 spec 搜索范围。
- 理由：计划一方面把 spec 搜索写成“待确认”，另一方面又把“本次保持现状”作为推荐，却没有在验收中要求证明 spec 是否被索引。实施者可以在不知情的情况下通过修改页面边界或 `pagefind.yml` 改变搜索结果集合。
- 影响范围：搜索结果数量、关于/友链内容发现、locale 过滤后的结果、Pagefind 配置和文档描述。
- 替代方案及代价比较：
  - 方案 A：冻结“spec 继续可搜索”，在构建后用 About/Friends 关键词验证索引。收益是保持现状；代价是搜索包含非文章页面。
  - 方案 B：冻结“只搜索 blog”，给 spec 页面/容器增加明确 ignore 并验证。收益是搜索语义更纯粹；代价是增加页面边界改动，可能影响页面内部 Pagefind 标记。
- 建议 action：把该项提升为 Phase 0 的独立决策；无论选 A/B，都要有构建后可观察的索引验收，不要用“保持现状”替代证据。

### C14：`pinTop` 的内容契约在前台与 CMS 之间仍不一致

- 优先级：中
- 计划位置或相关文件/符号：计划显式假设“pinTop 当前没有在有效页面链路中发挥作用”；`src/content.config.ts:14`；`src/utils/content-utils.ts:27-31,70-75`；`cms/server/articles.mjs:30-34`；`cms/server/store.mjs:237-243`
- 代码证据：前台 `defaultSort` 只按 `pubDate` 降序，首页/归档/详情/RSS 使用该排序；CMS 列表和 recent 统计则先按 `pinTop` 再按日期排序。
- 理由：计划保留 `pinTop` schema 但把它定义为无有效页面行为，会让同一文章在 CMS 中显示为置顶、在网站上却不置顶。若这是有意的 CMS-only 管理字段，应明确命名/文档边界；若用户期待置顶，则属于未修复的内容模型风险。
- 影响范围：作者对文章排序的预期、首页最近文章、归档、上下篇、RSS、CMS 与站点展示一致性。
- 替代方案及代价比较：
  - 方案 A：明确 `pinTop` 仅 CMS 管理/统计字段，README 不宣称其影响前台，加入“不改变前台排序”的回归。收益是本次范围稳定；代价是保留潜在误解。
  - 方案 B：将 `pinTop` 纳入共享排序函数，并定义首页/归档/RSS/上下篇是否都受影响。收益是一致；代价是改变现有公开排序。
  - 方案 C：移除字段和 CMS 相关行为。收益是契约最小；代价是删除已有编辑能力。
- 建议 action：在设计决策中明确 A/B/C；默认采用 A，但必须把 CMS 与前台排序差异写进文档和验收，不要只靠“当前未调用”结束分析。

### C15：测试计划缺少安全的基线、可重复证据和未提交工作区保护

- 优先级：高
- 计划位置或相关文件/符号：计划 Phase 0、Phase 5、Test scenarios、验收标准；README 开发命令；`.ai_docs/rules/testing_rules.md`；当前 `git status --short`
- 代码证据：项目没有自动化测试脚本；`pnpm build` 会直接生成/覆盖 `dist` 并运行 Pagefind；`pnpm newpost` 固定写入 `src/content/blog`；当前工作区已有大量 modified/deleted/untracked 文件，包括 `README.md`、页面、内容和 `.ai_docs/`。
- 理由：计划要求通过临时文章、newpost、draft/topic 样本和 preview 验证，但没有规定如何避免与现有未提交内容重名、如何记录基线、如何保证清理失败时不删除用户文件，也没有给出检查 `dist` 的可重复命令。只写“保留当前改动”不足以防止实现或测试覆盖同一文件；而测试规则明确要求记录真实命令和结果。
- 影响范围：用户工作区内容、构建产物、临时内容、测试可信度、最终审查 diff。
- 替代方案及代价比较：
  - 方案 A：先记录 `git status`/相关 diff，使用唯一临时目录和显式清单，测试结束只删除本次创建的文件；构建后用脚本/命令检查 dist 路由、RSS 和 Pagefind 文本。收益是可审计、可恢复；代价是准备工作略多。
  - 方案 B：只运行 `astro check`、`pnpm build` 和手工浏览。收益是最省时；代价是无法稳定证明 draft、仅英文、Pagefind locale 和 newpost 路径安全边界。
  - 方案 C：新增自动化测试框架。收益是长期回归能力更强；代价是违反当前“无新框架”的默认范围，需单独批准和维护成本评估。
- 建议 action：采用 A；在计划中补充“不得对已有 dirty 文件做测试样本”“测试样本清单/清理结果”“构建产物检查命令”和失败时的恢复策略。若无法建立安全样本，缩减验收承诺，不要把未执行的场景标记为通过。

## Decision points surfaced by challenge

以下问题不能仅由当前源码或项目规则自动决定，建议在实施前显式拍板：

1. draft 是否仅在 `pnpm dev` 可见，还是所有环境隐藏？
   - 选项 A：仅开发环境可见，生产构建和 preview 完全隐藏。收益是作者体验好；代价是需维护环境感知的静态路径策略。
   - 选项 B：所有环境隐藏并移除 draft note。收益是最简单、安全边界最强；代价是失去站内预览。
   - 默认建议：B，除非维护者明确需要 `pnpm dev` 站内预览并接受额外验证。

2. 项目是否正式支持非根 base path？
   - 选项 A：支持，统一处理 Astro `base`、页面 URL、RSS、Pagefind 资源和语言切换。收益是部署边界完整；代价是修改范围更大。
   - 选项 B：不支持，修复根路径硬编码并在 README 明确限制。收益是实现简单；代价是子路径部署不可用。
   - 默认建议：若没有真实子路径部署需求，选 B；不要以未执行的“假设测试”替代决策。

3. `slugId` 是目录路径标识，还是独立的评论/外部业务标识？
   - 选项 A：与 CMS 新建规则一致，使用完整相对目录路径。收益是 CLI/CMS 一致；代价是可能改变评论 ID。
   - 选项 B：与目录解耦，CLI 生成/要求独立稳定 ID。收益是外部引用稳定；代价是需要唯一性和迁移规则。
   - 默认建议：B，除非确认当前评论与 CMS 迁移没有外部依赖。

4. 二级导航是否进入 blog 内容模型？
   - 选项 A：增加 `topicId` 并做构建期/运行期一致性校验。收益是真实筛选；代价是 frontmatter、CMS、归档和导航一起变化。
   - 选项 B：children 仅说明，不可点击。收益是范围小；代价是没有二级筛选。
   - 默认建议：B，除非近期确实要按二级主题管理文章。

5. Pagefind 是否索引 spec 页面？
   - 选项 A：继续索引并将其作为公开搜索范围。收益是保持现状；代价是搜索结果含关于/友链页面。
   - 选项 B：只索引 blog。收益是文章搜索语义清晰；代价是需调整页面标记或排除规则。
   - 默认建议：A，并把它加入构建后的可观察验收。

6. `pinTop` 是否影响前台排序？
   - 选项 A：仅 CMS 字段，明确文档边界。收益是本次不改变现有公开顺序；代价是作者可能继续误解。
   - 选项 B：纳入前台共享排序。收益是 CMS 与网站一致；代价是改变首页、归档、上下篇和 RSS 顺序。
   - 默认建议：A，除非已有明确的置顶产品需求。

## Suggested plan-level changes

1. 在 Phase 0 增加工作区安全基线、draft 环境矩阵、base path 政策、slugId 政策和 spec 搜索范围决策。
2. 将 newpost 路径校验从“评估/如纳入”改为强制前置验收，并明确 CLI 与 CMS 的双写入契约。
3. 将 URL、Pagefind loader、RSS link 视为一个部署边界一起设计和测试，避免局部修复。
4. 默认不要删除 dirty worktree 中已修改的遗留文件；死代码清理拆成独立变更，或先完成逐文件 diff 审计。
5. 将搜索 DOM 安全、Pagefind locale 过滤、draft 产物排除和临时测试数据清理写成可观察的验收证据，而不只保留手工场景描述。

