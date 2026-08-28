# 笔记站目录型样式改版计划

状态：已通过，待实施。

## 目标

当前项目本身就是笔记站。本次只将当前笔记站改造成接近 [参考笔记站](https://note.rainerseventeen.cn/) 的目录型笔记站样式，不涉及参考仓库未来的个人主站、Project、Lab、多域名或多包架构。

参考内容目录页的整体结构，包括站点说明、统计信息、最近更新、顶级分类表格和层级目录展示；保留当前项目的粉色主题，只参考布局、排版、间距、边框和交互方式。

不复制参考站点的品牌、文章内容或插画资源。

## 已确认约束

- 保留当前粉色主题，不改为参考站点的默认配色。
- 不增加外部站点入口、站点切换器或多站点配置。
- 保留中文/英文路由、Markdown 内容模型、草稿过滤、搜索、RSS、文章详情页和深色模式。
- 允许新增目录统计和目录树构建工具函数。
- 不新增第三方依赖。
- 未被当前主流程使用的遗留代码，完成引用审计后允许删除。

## 实施步骤

### 1. 设计基础与页面外壳

调整以下文件的共享视觉变量和页面容器：

- `src/styles/variables.css`
- `src/styles/global.css`
- `src/styles/markdown.css`
- `src/layouts/Layout.astro`
- `src/layouts/MainPageLayout.astro`
- `src/components/Header.astro`
- `src/components/Footer.astro`

统一页面宽度、阅读宽度、标题层级、字体、行高、分隔线、hover 状态和响应式断点，同时保留现有主题初始化、键盘焦点、SEO、RSS 和 URL 构建逻辑。

顶部导航只保留笔记站自身的首页、归档、分类、关于、搜索、主题和语言功能，不加入参考项目的其他站点导航。

### 2. 重构笔记站根目录页

重点调整：

- `src/pages/[...locale]/[...page].astro`
- `src/components/knowledge/SectionOverview.astro`
- `src/content/navigation.ts`
- `src/utils/content-utils.ts`

根目录页按参考目录页组织为：

1. 目录说明；
2. 可选的本地原创插画区域；
3. 子目录数量、文章总数、最后更新时间；
4. 最近更新文章列表；
5. 顶级分类表格，展示分类、子目录数、文章数和最后更新时间；
6. 分类和文章的层级目录展示。

目录统计和层级关系优先从现有公开文章数据及文章目录路径推导，复用现有 `getBlogEntrySort` 的 draft 过滤和 locale 逻辑；如需新增数据结构，优先增加纯工具函数，不改变文章 frontmatter schema。

### 3. 对齐文章详情页的目录型布局

调整以下现有组件，使文章页与根目录页的视觉系统一致：

- `src/pages/[...locale]/blog/[...id].astro`
- `src/components/knowledge/KnowledgeTree.astro`
- `src/components/knowledge/OnThisPage.astro`
- `src/components/control/FabMenu.astro`
- `src/components/control/BlogNavi.astro`

保留文章页左侧知识树、中央正文和右侧本页目录的现有职责；仅优化层级、间距、激活状态、滚动体验和移动端收缩方式。保留文章内容渲染、KaTeX、提示块、图片查看、评论开关和上下篇导航。

### 4. 对齐归档和辅助页面

调整：

- `src/pages/[...locale]/archives.astro`
- `src/components/ArchivePanel.svelte`
- 关于页、友链页和 404 页的页面容器与标题样式

归档页保留现有年份分组、分类筛选、URL 参数和前进后退行为，只统一为目录型视觉。其他页面复用共享外壳，不引入新的站点架构。

### 5. 清理未使用遗留代码

在实现前后通过静态引用和构建结果确认以下候选项没有动态使用或脚本依赖，确认后允许删除：

- `src/components/TOC.svelte`
- `src/components/PostPage.astro`
- `src/components/control/Navi.astro`
- `siteConfig.pageSize` 及其类型字段

以下当前主流程使用的组件不得因清理而删除：

- `src/components/knowledge/SectionOverview.astro`
- `src/components/knowledge/KnowledgeTree.astro`
- `src/components/knowledge/OnThisPage.astro`
- `src/components/ArchivePanel.svelte`

### 6. 验证

执行：

```bash
pnpm exec astro check
pnpm build
```

手工检查：

- 中文和英文根目录页；
- 根目录统计、最近更新和分类表格；
- 分类层级与文章链接；
- 文章详情页的知识树和本页目录；
- 归档筛选与年份分组；
- 桌面端和移动端布局；
- 粉色主题的浅色/深色模式；
- 搜索、RSS、草稿过滤、locale fallback 和 Pagefind；
- 键盘焦点与基本语义可访问性。

记录实际执行的命令和结果，不把未执行的检查写成通过。

## 不在本次范围内

- 参考项目未来的个人主站；
- Project、Lab 或其他外部站点；
- 多包仓库改造；
- 外部站点导航和多域名配置；
- 新增内容管理系统；
- 重新接入分页功能。
