# 多级目录数据模型与构建期内容树实施计划

## 概述

### Feature Description

为 Astro 双语知识库博客建立一个由**声明式目录定义**和**文章目录归属**共同驱动的构建期内容树。目录能够嵌套（例如“深度学习 > 论文精读 > Transformer”），每篇公开逻辑文章可在指定 locale 下解析出：直属目录、祖先目录、同级文章、子目录与子文章、根到当前节点的完整位置，以及双语可用性和回退来源。

文章文件夹继续只表达一篇逻辑文章的稳定路由 ID 和同目录语言版本；目录归属不从文件系统层级猜测。为避免破坏现有路由和评论标识，URL 仍由文章目录 ID 决定，`slugId` 仍只承担同目录语言版本共享的外部稳定标识。

### User Benefits

- 内容、页面和后续导航功能使用同一棵经过校验的知识树，不再分别按顶级 `category` 或文件夹名称推断关系。
- 给任意公开文章提供稳定的目录上下文，可直接用于面包屑、树形导航、目录页和相关内容等后续步骤。
- 目录配置拥有稳定 ID 和双语展示文案；文章译文缺失时能明确显示“请求语言、实际源语言、可用语言与是否回退”。
- 公开树仅基于公开文章构建，继续保证草稿不会进入静态路由、RSS、Pagefind 或后续树消费方。
- CMS 和 `newpost` 写入路径能写入/继承同一个目录归属，避免同一逻辑文章的语言版本漂移。

### Project Alignment

计划遵循现有 `Astro Content Collections -> getBlogEntrySort() -> 静态页面` 链路；不引入运行时 API、客户端状态、新依赖、分页或新的部署单元。内部链接继续由 `getRelativeLocaleUrl()` 生成，部署前缀仍只由 `baseUrl()`/`BASE_PATH` 管理。目录树是在构建时从 Content Collection 公开文章与目录定义生成的纯数据，CMS 仅通过 `cms/server/store.mjs` 读写文章文件。外部参考仓库仅提供已确认的目录信息架构与命名；不复制其 Starlight、多包架构、同步脚本或路由实现，因为本项目的 Astro Content Collections、双语回退和静态构建边界不同。

### 计划分支名称

`feat/multilevel_content_tree`（仅记录，不创建或切换分支）

## 需求分析

### Functional Requirements

1. 定义一个唯一的、可嵌套的目录注册表；每个节点具有稳定机器 ID、父子关系、各 locale 的展示文案和可选说明。目标结构、顶级顺序和目录命名以已确认的参考笔记站导航树为准，不能再把现有 `children` 当作仅展示的平铺数据。
2. 扩展 `blog` frontmatter，使用一个稳定目录 ID 字段（暂定 `directory`）声明文章的直属目录；`category` 暂保留为现有归档和展示的兼容字段，但只由服务端根据目录根节点派生持久化，不能再承担深层归属或成为第二个作者可编辑真相。
3. 对每个公开逻辑文章（同一文章目录下的 `zh-cn.md` / `en.md`）在构建时生成统一的文章记录：文章 ID、各公开语言版本、请求 locale、实际选用语言、`isFallback`、直属目录和排序元数据。
4. 对每个请求 locale 构建一棵目录树：目录节点包含祖先链、直属子目录、直属文章和从根到该节点的路径；文章节点包含父目录、祖先目录、同级文章、子节点（为空）和语言状态。
5. 提供稳定的纯服务端查询接口，至少覆盖：按 locale 获取含根节点的整树、按文章路由 ID 获取文章上下文、按目录 ID 获取 `DirectoryTreeContext`（目录、祖先、完整路径、直属子目录和直属文章）。未知文章/目录返回可区分的 `undefined`，不静默归入“未分类”。
6. 对公开文章执行构建期完整性校验：目录字段缺失、未知 ID、目录配置重复/循环、根分类不一致、同一逻辑文章不同语言版本目录不一致时，构建失败并给出文章路径和修复提示。
7. 继续采用当前 locale 选择规则：默认中文只选中文公开版本；非默认语言优先选同语言公开版本，缺失时选中文公开版本并标为回退；仅英文公开的文章不进入默认中文树。语言状态必须基于公开版本，不能泄露草稿译文的存在。
8. 将现有文章逐篇审计并迁移到已声明目录；不按旧 `category` 字符串批量推断。`newpost` 首次创建文章时必须显式提供目录 ID，创建译文时继承兄弟文件的目录字段；CMS 表单与服务端保存路径支持并校验该字段，仍通过 `store.mjs` 写入。
9. 本阶段不增加新的公开目录路由或要求明显的视觉改版；只将需要验证树构建的现有静态入口接入数据构建，并保留现有首页、归档、文章 URL、RSS、Pagefind、评论和语言切换行为。

### Non-Functional Requirements

- 目录构建只在 Astro 构建/静态渲染中运行；不增加浏览器端树计算、网络请求或第三方依赖。
- 目录 ID 不依赖中文标题、文章标题或物理文件夹；改展示文案或移动文章目录时不自动改变目录身份。
- `content-utils.ts` 中应有唯一的、按构建进程缓存的公开逻辑文章分组原语；列表接口与树构建均复用它，缓存键至少区分内容快照/构建进程和请求 locale，避免 `KnowledgeTree`、详情页和静态路径分别扫描集合。
- 所有生成站内文章链接和未来目录链接必须使用 `getRelativeLocaleUrl()`；不得手写 `/en/` 或 `BASE_PATH`。
- 保留 `getBlogEntrySort()` 作为公开文章列表、草稿过滤、排序和 locale 回退的唯一入口；树构建复用其底层公开逻辑或由它提供结构化的语言状态，不能另建绕过草稿的 collection 查询。
- 不创建测试框架或自动化测试模块；按项目规则执行类型检查、生产构建和有针对性的手工验证。

### Edge Cases

- 公开中文文章没有英文译文：英文树中显示同一文章一次，`sourceLocale: "zh-cn"`、`isFallback: true`；默认中文树显示中文原文。
- 只有英文的公开文章：只进入英文树；默认中文树不出现该文章。
- 译文为草稿：草稿版本不作为可用语言，也不阻断从公开中文版本回退；若默认中文版本为草稿而英文公开，则同上仅进入英文树。
- 同一文章目录中两种公开语言写了不同 `directory`：不猜测谁为准，构建报错；一旦文章已有两个语言版本，CMS 禁止修改其 directory，目录调整只能经受控迁移操作，不能留下此状态。
- 目录配置只存单向 `parentId`，由其派生 children；启动树构建时校验重复 ID、根节点规则、缺失父节点、自指和循环，错误指向目录 ID。
- 公开文章缺少目录字段、指向不存在节点、或其 `category` 与目录根映射不符：构建报错，防止“稳定上下文”被虚假成功掩盖。
- 目录暂时没有公开文章：保留为目录节点和其声明子目录；语言状态为无直属可用文章，不以“语言缺失”冒充回退。
- 文章目录移动：路由变化是现有约定；只要 frontmatter `directory` 不变，目录上下文保持不变，`slugId` 也不变。
- `category` 为空的旧稿件可以继续作为草稿保存；一旦公开，必须提供有效 `directory`，并由服务端写入对应根分类。
- 旧顶级 `category`（如“技术笔记”“项目实践”）不再是假定可直接保留的根映射；迁移后由新根目录标签（“深度学习”“代码算法”“工具使用”“随想记录”）生成。实施前须逐篇审计现有内容，避免把历史归档查询或外链悄然导向错误分类。

### Dependencies

- `src/content.config.ts` 是 blog frontmatter schema 的唯一来源，目录字段由它定义。
- `src/content/navigation.ts` 目前是顶级分类唯一来源，需演进为由同一目录注册表派生顶级导航数据的入口，避免出现两份层级定义。
- `src/utils/content-utils.ts` 当前负责草稿过滤、按逻辑文章分组和 locale 回退；内容树必须依赖其公开选择语义。
- `src/pages/[...locale]/blog/[...id].astro`、`KnowledgeTree.astro`、首页 `SectionOverview.astro`、归档、Header 和 RSS 是已有 `category`/公开列表消费者，需要逐一核对，而不是隐式改动所有 UI。
- `script/newpost.js`、`cms/server/store.mjs`、CMS 类型和编辑器共同定义本地内容写入边界；不得让新的 CMS API 绕过 store。
- 当前工作区已有与本功能无关的删除与未跟踪文档（见 `git status --short`），实施时不得覆盖、回滚或混入它们。

## 技术设计

### Architecture Overview

采用“声明式目录注册表 + 显式文章归属 + 构建期索引”三层设计：

```text
目录注册表（稳定 ID / i18n 标签 / parentId / root category）
             +
blog frontmatter（directory + 保留的 category）
             +
getBlogEntrySort 的公开分组与 locale 选择
             |
             v
ContentTreeBuilder（校验、索引、locale 语言状态）
             |
             +--> ContentTree（目录子树 + 文章节点）
             +--> directoryById / articleById 索引
             +--> ArticleTreeContext（所属目录、祖先、同级、子节点、位置）
```

目录注册表的初始语义和顺序已确认如下。ID 使用 ASCII kebab-case；显示中文按括号内容，英文文案由同一节点的 locale 字段提供。原始数据只写 `parentId`，列表缩进仅用于说明派生层级。

```text
deep-learning（深度学习）
├── courses（课程笔记）
│   ├── reinforcement-learning（强化学习）
│   └── large-language-models（大语言模型）
├── basic-concepts（基础概念）
├── paper-reading（论文精读）
│   ├── transformer（Transformer）
│   ├── training-methods（训练方法）
│   └── multimodal（多模态）
└── interview-questions（面试题）
code-algorithm（代码算法）
├── algorithm-practice（算法刷题）
│   ├── leetcode-hot100（LeetCode Hot100）
│   └── code-thinking（代码随想录）
├── api-reference（API 速查）
├── programming-languages（编程语言）
└── frameworks-libraries（框架库）
tools（工具使用）
├── common-tools（常用工具）
├── other-tools（其他工具）
└── workflows（工作流）
minds（随想记录）
├── internship-summary（实习总结）
└── self（自我）
```

参考树中明显的 `cou rces` 拼写不作为本项目 ID 复制；本计划统一使用语义明确的 `courses`。上述结构仅迁移信息架构，不迁移参考仓库的实现方式或其内容。

不从 `src/content/blog/<文章路径>/` 推断目录结构：该路径的末段是逻辑文章路由 ID，文章目录还可能含图片。目录关系只由注册表和 `directory` 字段表达，避免把物理存储布局误作信息架构。

目录注册表应保存稳定 ID（建议使用 slash-separated ASCII ID，如 `tech/web/astro/content-collections`）以及单向 `parentId`，而非把中文标题作为键或同时手写 children。节点标签与说明使用 locale 映射（至少 `zh-cn`、`en`）；未为某目录提供非默认语言文案时，展示层可回退中文，但树结构和 ID 不变。顶级节点保存其 legacy category label 或等价映射，用于派生并维持现有归档筛选。

为避免 CMS 与 Astro 各维护一份目录定义，目录原始数据应抽取为可被 TypeScript 网站层和 Node `.mjs` CMS 层读取的单一静态数据文件（推荐 JSON）；`navigation.ts` 负责对其进行类型化、验证并导出兼容的 `topSections` 投影，CMS 的 store 读取同一原始数据执行目录 ID 校验，`/api/meta` 同时提供只读目录选择数据（稳定 ID、层级顺序、locale 标签）。目录定义加载失败必须返回可见 API 错误，不能让 CMS 回退为自由输入。

### Component Breakdown

#### 内容 schema 与目录定义层

- `src/content.config.ts`：新增 `directory: z.string().optional()`；用 optional 保留新建草稿和历史草稿编辑能力，公开性完整性由树构建跨文件校验保证。不要把目录路径拆成多个 frontmatter 字段，也不要让 `slugId` 承担目录 ID。
- 新增单一目录原始数据文件（建议 `src/content/directory-tree.json`）：仅记录目录节点的 `id`、`parentId`、根分类映射和 `labels/descriptions`，由代码派生 children。它是网站与 CMS 的共同数据源。
- `src/content/navigation.ts`：负责读取并验证目录定义，导出 `DirectoryDefinition`、`directoryDefinitions`、按 ID 的目录索引、双语取文案函数以及由根节点投影的现有 `topSections`。删除/替换只具说明性质的嵌套 `children` 数据，避免两套层级并存。

#### 公开内容与树构建层

- `src/utils/content-utils.ts`：提炼唯一且缓存的公开逻辑文章分组原语与 locale 选择，使 `getBlogEntrySort()` 和 `content-tree.ts` 共用同一公开快照；列表接口继续提供现有语义，并附加结构化的 `requestedLocale`、`sourceLocale`、`availableLocales` 和现有 `isFallback`。这些状态只能从已过滤 `draft !== true` 的集合计算。
- 新增 `src/utils/content-tree.ts`：承担实际的目录关系校验、树生成和 O(1) 索引。它不是转发文件：其唯一职责是将已选公开文章与目录定义组装为不可变的构建期树及文章上下文。
- 目录构建先校验注册表拓扑，再校验公开文章的 `directory`/根分类/跨译文一致性，最后按现有置顶与日期排序策略填充每个目录的直属文章，并固定目录在文章之前的子节点顺序。

#### 静态页面与既有消费者层

- `src/pages/[...locale]/blog/[...id].astro`：在 `getStaticPaths()` 先为每个 locale 建树（并复用缓存）再生成详情路由，以保证所有无效公开目录数据都会在生产构建失败；页面主体取得对应 `ArticleTreeContext`，本阶段不强制把 context 渲染成面包屑。
- `src/components/knowledge/KnowledgeTree.astro`：后续可改接 `ContentTree` 作为唯一树源；本阶段若接入，必须保留当前可见内容与 active 状态语义，不能把目录链接写死或新增客户端计算。
- `src/components/knowledge/SectionOverview.astro`、`Header.astro`、`ArchivePanel.svelte`、`PostCard.astro` 和 RSS：仍可用派生出的 `topSections` 与 `getBlogEntrySort()`；实施时需确认 `category` 映射没有改变现有公开筛选、最近文章、RSS 和导航文字。

#### 内容写入层

- `script/newpost.js`：首次创建文章时要求命令提供有效 directory ID，并由共同目录定义派生 `category`；创建同目录另一语言文件时，从兄弟 frontmatter 读取并复制 `directory`/派生 category（与现有 `slugId` 继承方式一致）。不再产生 `draft: false` 且 `directory: ""` 的矛盾模板。
- `cms/server/store.mjs`：在 `normalizeData` / `saveArticle` / `createArticle` 的既有边界内处理目录字段；保存时由目录 ID 派生 `category`。同一逻辑文章已有两个语言版本时，若保存请求试图变更既有 directory，服务端明确拒绝并提示改用受控迁移操作；继续以共同目录数据源验证 ID，不执行目录移动或原子批量同步。
- `cms/server/meta.mjs`：扩展现有 `/api/meta` 响应，输出按树序的只读目录项（ID、深度、父 ID、当前 CMS locale 标签）；加载/校验目录配置失败返回明确错误。
- `cms/src/types.ts`、`cms/src/api.ts`、`cms/src/pages/new-article.ts`、`cms/src/pages/EditorPage.ts`：前端类型/API/表单改为目录选择；`category` 只读展示服务端派生值且不作为可编辑保存输入，编辑译文时显示共享目录。

### Data Flow

1. 作者通过 CLI/CMS 选择稳定 `directory` ID；`newpost` 与 `store.mjs` 从目录根映射派生并写入 `category`，以保护当前归档/导航契约而不暴露第二可编辑字段。
2. Astro Content Collection 按 `content.config.ts` 读取单语言 Markdown；`content-utils.ts` 的缓存原语先过滤草稿、按逻辑文章路由 ID（content entry ID 去掉语言文件名）分组，再进行 locale 选择，`getBlogEntrySort(locale)` 复用结果。
3. `getContentTree(locale)` 接收同一公开快照和目录注册表，建立含根节点的 `DirectoryNode`/`ArticleNode`、祖先路径与 ID 索引；详情页的 `getStaticPaths()` 对每个 locale 调用它，验证失败立即终止静态构建。
4. `getArticleTreeContext(locale, articleId)`（`articleId` 明确为路由/content ID，不是 `slugId`）从树索引返回文章的直属目录、祖先、同级文章、路径和语言状态；`getDirectoryTreeContext(locale, directoryId)` 返回目录、子目录、直属文章和位置。
5. 静态页或组件只消费上述值生成 HTML；任何链接在消费层经 `getRelativeLocaleUrl(locale, ...)` 构造。
6. CMS 读取相同目录注册表，在 `store.mjs` 内校验和写入；它不参与公开站点运行时，也不会成为构建前提。

### Configuration Changes

- 新增目录定义数据源，按已确认参考树的顺序定义四个顶级节点：`deep-learning`（深度学习）、`code-algorithm`（代码算法）、`tools`（工具使用）、`minds`（随想记录），以及其已确认的全部子目录；原始节点只填写 `parentId`，由代码派生 children。`courses` 使用更正后的语义清晰拼写，不复制参考中的 `cou rces` 错误。
- `navigation.ts` 的对外 `topSections` 维持现有 Header、首页组件所需的 `id`、`label`、`description` 和 `path` 形状；其 path 继续只是 locale-safe 生成前的逻辑路径，生成 URL 的职责不移入配置。
- `src/content.config.ts` 新增 `directory` 字段；不得扩展 `spec` schema 或修改 `astro.config.mjs` 的 Markdown/i18n 流程。
- 这是一次导航/category 分类迁移：保留 `category` 的既有消费者边界，但其值必须由新顶级目录标签派生。逐一审计并迁移全部现有文章（公开、草稿及双语版本）；不可根据旧 category 名称批量映射。
- 将现有公开文章 `src/content/blog/tech/getting-started/zh-cn.md` 作为初始迁移项：显式写入 `directory: deep-learning`，并派生 `category: 深度学习`；不新增“入门”节点。

### API/Interface Definitions

实现时以如下最小类型为准（具体字段名可因既有 Astro 类型调整，但语义不变）：

```ts
type DirectoryId = string;
type LanguageStatus = {
  requestedLocale: string;
  sourceLocale: string;
  availableLocales: string[]; // 仅公开语言版本
  isFallback: boolean;
};

type DirectoryNode = {
  kind: "directory";
  id: DirectoryId;
  parentId?: DirectoryId;
  label: string;
  description: string;
  ancestors: DirectoryId[];
  children: ContentTreeNode[]; // 目录优先，随后为直属文章
  directories: DirectoryNode[];
  articles: ArticleTreeArticle[];
};

type DirectoryTreeContext = {
  directory: DirectoryNode;
  ancestors: DirectoryNode[];
  path: DirectoryNode[]; // 根目录到当前目录，含当前目录
  childDirectories: DirectoryNode[];
  articles: ArticleTreeArticle[];
};

type ArticleTreeArticle = BlogEntryWithLocaleStatus & {
  kind: "article";
  directoryId: DirectoryId;
  ancestors: DirectoryId[];
  language: LanguageStatus;
};

type ArticleTreeContext = {
  article: ArticleTreeArticle;
  directory: DirectoryNode;
  ancestors: DirectoryNode[];
  siblings: ArticleTreeArticle[]; // 同直属目录，排除 article 自身
  childNodes: []; // 文章为叶节点
  path: Array<DirectoryNode | ArticleTreeArticle>;
};

export async function getContentTree(locale: string): Promise<ContentTree>;
export async function getArticleTreeContext(
  locale: string,
  articleId: string, // content/route ID，例如 tech/getting-started；不是 slugId
): Promise<ArticleTreeContext | undefined>;
export async function getDirectoryTreeContext(
  locale: string,
  directoryId: DirectoryId,
): Promise<DirectoryTreeContext | undefined>;
```

`ContentTree` 显式暴露根目录节点列表及其 `directoryById` / `articleById` 索引；不得把隐式“无 parentId 的节点集合”当作调用方需自行推断的根。`availableLocales` 是逻辑文章可公开呈现的语言列表；它不能用“磁盘上是否有文件”替代。`ancestors` 从根到父节点，`path` 从根目录到当前文章，均使用稳定 ID/节点而非翻译后的文本作为身份。

## 实施策略

### Implementation Phases

1. **基线与迁移清单**：在干净的目标分支上检查 `git status`，记录当前无关变更；枚举全部现有文章、语言版本、旧 category 和 CMS 写入字段，形成逐篇 directory/category 迁移清单。已有双语文章改目录已确定为 CMS 禁止、受控迁移处理；`tech/getting-started` 已确认迁移到 `deep-learning`。
2. **目录定义与 schema**：新增共同目录数据源，按确认的参考树顺序迁移 `navigation.ts` 到受校验的目录定义/`topSections` 投影；扩展 blog schema 的 `directory` 字段。先实现目录注册表的重复、根节点、父节点和循环校验，保证错误在内容装配前失败。
3. **公开文章语言状态**：在 `content-utils.ts` 保持现有 `getBlogEntrySort()` 消费者兼容的前提下，提炼唯一缓存的公开逻辑文章分组和 locale 选择，增加来源 locale、可用语言列表等信息；列表和树都只读取此原语。手工核对中文、英文、英文回退和仅英文的现有语义未变化。
4. **树与索引实现**：新增 `content-tree.ts`，将注册表和公开文章映射为树、目录索引、文章索引及三个查询接口。实现目录归属、category 根映射和同逻辑文章跨语言一致性校验；使用明确错误而非回退到未分类节点。
5. **接入静态调用链**：在详情 `getStaticPaths()` 为每个 locale 先构建并缓存 `ContentTree`，再生成路由；页面渲染读取文章上下文，使每次生产构建均执行树完整性校验。仅在不改变文案、布局和交互的条件下，将现有 `KnowledgeTree` 数据源改为树输出；否则保留视觉组件改造到后续阶段，但禁止重新写一套层级过滤。
6. **内容、category 与写入路径迁移**：按逐篇清单为全部现有文章填充目录字段，并由工具从新顶级目录标签派生 `category`；更新 README 写作说明、newpost 的必填参数/翻译继承、CMS `/api/meta`、服务端和前端类型/表单。CMS 写入校验必须保持现有路径、符号链接、`slugId` 一致性和删除防护不被削弱。
7. **消费方审计与验证**：逐一检查 Header、首页、文章页、归档、RSS、Pagefind、语言切换和 CMS；清除过时的 `NavigationChild` 仅展示语义，运行要求的命令与手工场景。只提交本 feature 的相关更改，不包含现有无关文件。

### File Structure Changes

| 文件 | 动作 | 目的 |
| --- | --- | --- |
| `src/content/directory-tree.json`（建议） | 新增 | 网站与 CMS 共用的原始目录注册表。 |
| `src/content/navigation.ts` | 修改 | 校验/类型化目录注册表，导出目录 API 与兼容的顶级导航投影。 |
| `src/content.config.ts` | 修改 | 为 blog schema 增加 `directory`。 |
| `src/utils/content-utils.ts` | 修改 | 公开逻辑文章分组、locale 来源与可用语言状态；保留列表接口。 |
| `src/utils/content-tree.ts` | 新增 | 构建期树、索引、跨文件内容完整性校验和上下文查询。 |
| `src/pages/[...locale]/blog/[...id].astro` | 修改 | 构建/详情阶段获取文章树上下文并触发完整性校验；无强制 UI 改版。 |
| `src/components/knowledge/KnowledgeTree.astro` | 视接入决定修改 | 从树消费层读取层级数据，维持现有布局时不复制推导逻辑。 |
| `src/components/knowledge/SectionOverview.astro` | 按投影适配 | 不再直接假定 `children` 是非语义展示项。 |
| `src/components/Header.astro` | 按投影适配 | 保持顶级导航和 locale/base path URL 生成。 |
| `src/components/ArchivePanel.svelte`、`src/components/PostCard.astro`、`src/pages/[...locale]/archives.astro`、`src/pages/rss.xml.ts` | 审计，必要时最小修改 | 确认继续使用 category 投影与公开列表，未被树改动破坏。 |
| `script/newpost.js` | 修改 | 新模板字段与同目录译文的 directory 继承。 |
| `README.md` | 修改 | 改写“文件夹层级表达主题目录”和 newpost 示例，说明显式 directory、译文继承、草稿与公开校验。 |
| `cms/server/store.mjs`、`cms/server/meta.mjs` | 修改 | 在统一读写边界执行 directory/category 派生、跨译文策略校验，并对 UI 提供目录元数据。 |
| `cms/src/types.ts`、`cms/src/api.ts`、`cms/src/pages/new-article.ts`、`cms/src/pages/EditorPage.ts` | 修改 | CMS 类型/API、目录选择、只读 category 展示和保存请求同步。 |
| `src/content/blog/**/{zh-cn,en}.md` | 修改 | 迁移公开文章的明确目录 ID，保持 `slugId` 和路由目录不变。 |

### Code Locations

- `src/content.config.ts` 的 `blogCollection.schema` 是唯一 frontmatter 合约入口。
- `src/content/navigation.ts` 的 `topSections` 当前被 Header、首页和知识树直接消费；改动必须保留这些调用方的明确迁移路径。
- `src/utils/content-utils.ts:getBlogEntrySort` 当前先用 `getCollection('blog', draft filter)` 过滤，再按文章目录 ID 和语言文件名分组；应从此处提炼可由列表和树共用的缓存原语，树语言状态必须在这个边界后建立。
- `src/pages/[...locale]/blog/[...id].astro:getStaticPaths` 目前按 locale 使用 `getBlogEntrySort` 生成全部公开详情路由；应在此处先取得每个 locale 的缓存树，作为唯一明确的构建期完整性触发点。
- `src/components/knowledge/KnowledgeTree.astro` 目前只按 `entry.data.category === section.label` 平铺文章；不能把该过滤逻辑继续当多级目录实现。
- `script/newpost.js` 和 `cms/server/store.mjs:saveArticle/createArticle` 已有同目录 `slugId` 继承和安全路径检查，目录字段、category 派生和跨译文变更策略应沿该边界扩展而非新建旁路。
- `cms/server/meta.mjs` 当前只返回分类统计；目录选择所需的稳定 ID、树序、深度和 locale 标签必须在此既有只读 API 中提供，不能由 CMS 前端解析网站 TypeScript 文件。

### Integration Points

- **Astro 静态构建**：构建内容树不改变 Content Collections loader、Markdown 插件或 i18n 路由配置；无效公开目录数据必须使 `pnpm build` 失败。
- **locale / URL**：树的身份按稳定 ID 保持，节点显示名称按请求 locale 决定；文章 URL 仍为 `/blog/${entry.id}`，实际链接必须调用 `getRelativeLocaleUrl`，因此兼容默认中文无前缀、英文 `/en/` 和 `BASE_PATH`。
- **public visibility**：树、目录索引、同级文章和语言状态只接收现有公开过滤后的条目；不可通过树查询看到草稿或草稿译文。
- **CMS**：`/api/meta` 只读目录数据让前端可选择有效 ID；服务端是目录字段校验、category 派生和跨译文一致性的最后写入防线，前端选择器不能替代 `store.mjs` 校验。
- **existing style plan**：当前未跟踪的 `.ai_docs/plan/current/note-site-directory-style.md` 已计划后续使用树统计和层级展示。本 feature 只提供其需要的数据接口，不擅自实施该计划的视觉重构或删除遗留组件。

## 测试计划

### Test Scenarios

1. 运行 `pnpm exec astro check`，确认内容 schema、Astro 页面、树类型和 CMS 外部类型不出现 TypeScript/Astro 诊断。
2. 运行 `pnpm build`，确认所有静态路由生成、RSS 和 Pagefind 构建成功；记录实际命令结果。
3. 以已确认结构建立临时公开中文文章，验证 `directory: deep-learning/paper-reading/transformer` 的文章祖先为“深度学习 / 论文精读”，同级文章只包含相同直属目录的其他文章，目录子节点同时包含子目录与直属文章，根到文章 path 顺序正确；同时验证根节点顺序严格为 deep-learning、code-algorithm、tools、minds。
4. 为同一逻辑文章补一份公开英文译文，验证中文与英文树中的文章 ID、`directoryId` 和祖先 ID 一致；不同语言展示标签可不同，但结构一致。
5. 删除或标记英文译文为草稿，生成英文站点：验证中文公开文章只显示一次、`isFallback` 为 true、`sourceLocale` 为 `zh-cn`、`availableLocales` 不包含英文；默认中文页面和树仍只使用中文。
6. 建立仅英文公开文章：验证它出现在英文树，不出现在默认中文列表/树、中文静态路由、RSS 与 Pagefind 中文结果中。
7. 故意给公开文章缺少/填写未知 `directory`、使译文 `directory` 不一致、在目录配置中填写缺失 parent/循环，逐一运行构建并确认失败消息包含文章路径或目录 ID 和具体字段；随后恢复测试数据，不留下测试文章或无效目录。
8. 使用 CLI 首次创建文章时不传 directory、传未知 directory、传有效 directory，验证前两者失败、后者生成由目录派生的 category；补英文译文时验证 directory/category/slugId 从兄弟文件继承。
9. 在 CMS 中创建中文文章、补英文译文、编辑目录并保存；验证 `/api/meta` 提供带稳定 ID 和层级信息的选择项、category 不可编辑且由服务端派生、非法目录被 store 拒绝。对已有双语文章尝试改 directory 时，验证 `store.mjs` 拒绝请求且两个语言文件均不被改写；路径/符号链接防护和删除保护仍按既有行为工作。涉及真实 CRUD 时启动 CMS 后运行 `pnpm --dir cms smoke`，并确认没有遗留文章。
10. 手工检查默认中文、英文、设置 `BASE_PATH` 的生产预览：文章语言切换、首页顶级导航、归档 `category` 查询、文章链接、RSS 链接、Pagefind locale 过滤，以及桌面/移动端知识树的现有可访问性与激活状态均未退化。
11. 审计旧 category 迁移：确认每篇现有文章都有显式 directory，category 均由其新根目录派生；特别确认 `tech/getting-started` 为 `deep-learning` / “深度学习”，且没有新增“入门”目录。

### Test Data and Expected Results

| 测试数据 | 预期结果 |
| --- | --- |
| `deep-learning/paper-reading/transformer` 目录 + 中文公开文章 | 中文文章上下文获得“深度学习 / 论文精读 / Transformer”路径，无 fallback。 |
| 现有 `tech/getting-started` 中文公开文章 | 迁移后 `directory` 为 `deep-learning`、`category` 为“深度学习”，文章直属于根目录。 |
| 同路径中英文均公开且 `directory` 相同 | 两个 locale 的树都选自身语言，`availableLocales` 为 `['zh-cn', 'en']`。 |
| 中文公开、英文缺失或草稿 | 英文树选中文源，`isFallback: true`，公开可用语言只含 `zh-cn`。 |
| 仅英文公开 | 仅英文树包含该文章；默认中文树不含该文章。 |
| 缺失/未知/不一致 directory | `pnpm build` 明确失败，不生成伪造的未分类树节点。 |
| 目录配置缺失父节点或形成循环 | `pnpm build` 指向目录 ID 失败；不会由调用方自行推断根或 children。 |
| 空目录节点 | 节点与其 child directories 仍存在，直属 articles 为空。 |

## 验收标准

### Success Metrics

- [ ] 目录定义以确认的参考树顺序包含 `deep-learning`、`code-algorithm`、`tools`、`minds` 及全部指定子目录，存在唯一稳定 ID、明确父子关系、中文/英文展示文案和顶级 category 映射，且其拓扑在构建时校验。
- [ ] 每个公开逻辑文章都有一个有效直属目录；未知、缺失和跨译文不一致的目录数据会以可定位错误中止构建，且详情 `getStaticPaths()` 是明确、缓存复用的触发点。
- [ ] 给定任意公开文章和 locale，可稳定取得直属目录、祖先路径、同级文章、空子节点、根到文章的位置以及公开语言状态。
- [ ] 给定任意目录和 locale，可稳定取得直属子目录、直属文章、祖先路径和树中的位置。
- [ ] 中文/英文同路径版本被视为一个逻辑文章；英文缺失时仅按现有规则回退中文，且状态明确；草稿版本不会进入语言可用性、树、静态路由、RSS 或 Pagefind。
- [ ] `getBlogEntrySort()` 与内容树复用同一个缓存公开分组原语，仍是公开内容过滤、排序和 locale 选择的唯一语义来源，未出现绕过草稿的第二套查询。
- [ ] 原有文章路由、`slugId`、评论标识、Header、RSS、Pagefind 和 `BASE_PATH`/locale URL 语义没有非预期变化；`category` 是受控的预期迁移，归档筛选、现有导航与 CMS 统计均已审计并改为消费新根标签。
- [ ] `newpost` 首次创建必须有有效 directory，CMS 经 `/api/meta` 选择目录且 category 由服务端派生；所有文章写入仍经过 `cms/server/store.mjs` 的路径和跨译文安全检查。
- [ ] 实际运行 `pnpm exec astro check`、`pnpm build`、`pnpm --dir cms build`，若涉及 CMS CRUD 则运行 `pnpm --dir cms smoke`；只报告实际执行结果。

### User Acceptance

维护者可在不查看文件系统实现细节的条件下，针对一篇公开文章回答“它在什么目录、经过哪些上级目录、同目录还有哪些文章、它本身是否可再展开、在整棵树中位于哪里、当前语言是原文还是回退以及哪些公开语言可用”。维护者也可针对一个目录回答“其直接下级目录和文章是什么”。这些答案在中文/英文静态构建中保持确定性，并且任何无法回答的公开内容数据会在构建时被阻止，而不是在界面中静默退化。

## 已确认决策与假设

### 已确认决策

1. **已有双语逻辑文章改目录时的写入策略：选项 B 已确认。** 一旦同一文章目录已有两个语言版本，CMS 必须禁止修改 directory；目录调整须经受控迁移操作处理。CMS 不实现原子同步更新所有语言文件。
2. **现有公开文章 `tech/getting-started` 的归类方式已确认。** 它直接归属 `deep-learning`（深度学习根目录），不新增“入门”节点，不创建“待整理/迁移”过渡目录。
3. **目录信息架构来源已确认。** 使用参考笔记站的目录语义和排序，并将其明显拼写错误更正为 `courses`；仅迁移目录数据，不复制其 Starlight、多包、同步脚本或路由实现。

### 采用的假设

- 本 feature 获准对 `blog` schema 作一次必要的、范围限定的扩展；不扩展 `spec` schema，不引入运行时服务或依赖。
- 公开文章目录归属是产品的强完整性约束，因此公共内容无目录或目录无效应阻止构建；草稿仍可暂存未填写目录。
- `category` 当前仍被归档、卡片、Header/首页投影和 CMS 统计消费，短期不能直接删除。
- 目录节点自身不必对应可访问的公开路由；后续功能可基于本计划提供的查询接口增加目录页，届时再决定 URL 方案。
- 当前 `.ai_docs/project_overview.md` 与 rules 文件均标为“AI 初稿，待确认”，本计划以根 `AGENTS.md` 和实际代码为优先证据；两者一致处作为参考而非替代强制约束。

## 挑战合并记录

下表保留独立挑战清单到计划处理结论的可追溯关系。`escalate` 不会在未获维护者选择前伪装成已确定实现。

| 挑战编号 | 结论 | 处理 |
| --- | --- | --- |
| C1（双语改目录写入） | accept（维护者确认 B） | store 在已有双语版本时禁止 directory 变更，提示受控迁移；不实现原子同步。 |
| C2（CLI 空目录公开模板） | accept | 首次 `newpost` 改为必须提供有效 directory，译文从兄弟继承，并派生 category。 |
| C3（目录上下文不足） | accept | 增加 `DirectoryTreeContext`、显式根节点列表和 `DirectoryTreeContext.path`。 |
| C4（构建校验触发点） | accept | 详情页 `getStaticPaths()` 为每个 locale 先构建缓存树，再生成全部公开路由。 |
| C5（CMS 目录选择数据） | accept | 扩展现有 `/api/meta` 与 `cms/server/meta.mjs`，提供只读稳定 ID、层级、标签及加载失败错误。 |
| C6（category 第二真相） | accept | 作者只编辑 directory；CLI/store 从目录根映射派生 category，CMS 只读展示。 |
| C7（articleId 歧义） | accept | 接口注释和数据流明确 `articleId` 是 content/route ID，绝非 `slugId`。 |
| C8（现有文章归属无证据） | accept（维护者已确认） | `tech/getting-started` 直接迁移到 `deep-learning`，不新增“入门”或过渡目录。 |
| C9（README 过时说明） | accept | 将 README 纳入文件变更和迁移阶段，改写目录模型与 newpost 写作说明。 |
| C10（重复扫描/缓存边界） | accept | `content-utils.ts` 提供唯一的缓存公开分组原语，列表和树共用，并在接口约束中写明缓存边界。 |
| C11（双向目录模型） | accept | 原始配置只存 `parentId`，children 和顺序由构建器派生；拓扑校验按单向模型执行。 |
