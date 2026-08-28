# 我的笔记项目使用文档

本文面向需要维护、写作、调整页面或发布本站的使用者，说明项目目录、文章写作方式、首页分类、页面布局、国际化、CMS 和发布流程。

本文以当前代码为准。项目架构背景可参考 .ai_docs/project_overview.md，基础项目说明可参考 README.md。

## 1. 项目定位

这是一个使用 Astro 构建的知识库型个人博客：

- 文章以 Markdown 文件保存。
- Astro 在构建时生成静态 HTML。
- 支持中文和英文文章版本。
- 首页按顶级分类展示文章和目录说明。
- 文章详情页使用“左侧知识树 + 中央正文 + 右侧本页目录”的布局。
- 支持 Markdown 扩展、代码高亮、KaTeX、RSS、Pagefind 搜索、深色模式和可选评论。
- 本地 CMS 直接读写 src/content/blog，不使用数据库。

内容的真实来源是工作区中的 Markdown 文件。页面、归档、RSS 和搜索都是从这些文件构建出来的结果。

## 2. 常用目录

~~~text
src/content/blog/                  博客文章和文章图片
src/content/spec/                  关于页、友链页等说明性 Markdown
src/content.config.ts              内容集合和 frontmatter schema
src/content/navigation.ts          首页顶级分类及目录说明
src/config.ts                      站点、主题、评论和许可证配置
src/pages/                         页面入口和路由
src/layouts/                       全站布局
src/components/                    可复用页面组件
src/styles/                        全局样式、主题变量和 Markdown 样式
src/plugins/                       Markdown remark/rehype 插件
src/i18n/                          中文、英文翻译和语言处理
src/utils/                         内容、URL、时间等工具
script/newpost.js                  命令行新文章脚手架
cms/                               本地 CMS
public/                            不经过 Markdown 处理的静态资源
dist/                              生产构建产物
~~~

## 3. 环境准备与常用命令

项目使用 pnpm。首次使用时，在项目根目录执行：

~~~bash
corepack pnpm install
~~~

启动博客开发服务器：

~~~bash
corepack pnpm dev
~~~

执行 Astro 类型和内容检查：

~~~bash
corepack pnpm exec astro check
~~~

构建生产版本：

~~~bash
corepack pnpm build
~~~

预览生产构建：

~~~bash
corepack pnpm preview
~~~

启动本地 CMS：

~~~bash
corepack pnpm cms
~~~

CMS 默认地址为 http://localhost:5188。

### 搜索的特殊说明

pnpm build 会先执行 Astro 构建，再执行 Pagefind，为 dist/ 生成搜索索引。搜索弹窗只会在生产构建或 pnpm preview 中加载 Pagefind。

因此：

1. pnpm dev 可以预览页面和文章。
2. pnpm dev 不代表 Pagefind 搜索索引已经存在。
3. 修改文章后如需验证搜索，重新执行 pnpm build，再执行 pnpm preview。

## 4. 新建和编写文章

### 4.1 文章文件结构

一篇文章对应一个目录，语言版本放在该目录中：

~~~text
src/content/blog/tech/getting-started/zh-cn.md
src/content/blog/tech/getting-started/en.md
~~~

其中：

- tech/getting-started 是文章的 collection ID。
- 文章详情页 URL 为 /blog/tech/getting-started/。
- 英文路由为 /en/blog/tech/getting-started/。
- zh-cn.md 和 en.md 是同一篇文章的不同语言版本。
- 文章目录可以有多级，例如 tools/editor/vscode。

文章路由由目录路径决定，不由 slugId 决定。移动文章目录会改变 URL，但当前系统不会自动修改已有 slugId。

### 4.2 使用命令行脚手架

在根目录执行：

~~~bash
pnpm newpost tech/my-first-note zh-cn
~~~

创建英文版本：

~~~bash
pnpm newpost tech/my-first-note en
~~~

脚手架会：

1. 校验路径位于 src/content/blog 下。
2. 校验语言只能是 zh-cn 或 en。
3. 创建文章目录。
4. 创建对应的语言 Markdown 文件。
5. 写入 frontmatter 模板和示例正文。

脚手架文件是 script/newpost.js。

如果同一目录下已经存在另一语言版本，脚手架会读取其 slugId 并复用；如果不存在，则生成新的 UUID。这样可以保证同一篇文章的语言版本共享外部稳定标识。

脚手架生成的文章默认是公开状态：

~~~yaml
draft: false
~~~

创建后需要手动修改标题、摘要、分类和正文。

### 4.3 使用本地 CMS

启动 CMS：

~~~bash
pnpm cms
~~~

在浏览器打开 http://localhost:5188，然后：

1. 在概览页或文章列表点击“新建文章”。
2. 输入文章路径，例如 tech/my-first-note。
3. 选择 zh-cn 或 en。
4. 可选填写分类。
5. 点击创建，进入编辑器。
6. 编辑 frontmatter 表单和 Markdown 正文。
7. 使用右侧实时预览检查效果。
8. 点击“保存”或使用 Ctrl+S。

文章路径留空时，CMS 会自动生成类似下面的路径：

~~~text
2026/2026-08-28
~~~

CMS 新建文章默认是草稿：

~~~yaml
draft: true
~~~

需要在编辑器中取消草稿状态，文章才会出现在公开博客、归档、RSS 和搜索结果中。

CMS 支持：

- 编辑中文和英文版本。
- 在缺少语言版本时新建另一个语言版本。
- 修改标题、日期、摘要、分类和封面图。
- 设置草稿和置顶状态。
- 上传文章目录内的图片。
- 实时预览 Markdown 扩展语法。
- 删除整篇文章目录及其语言版本。

CMS 的文章写入层是 cms/server/store.mjs。它会尽量保证同一目录下各语言版本使用同一个 slugId，并检查文章路径不能越出 src/content/blog。

### 4.4 直接编辑 Markdown

也可以直接编辑：

~~~text
src/content/blog/<文章路径>/<语言>.md
~~~

直接编辑时需要自行保证 frontmatter 合法。保存后，Astro 开发服务器通常会重新加载内容。

## 5. Frontmatter 规范

推荐使用以下完整格式：

~~~yaml
---
title: 文章标题
pubDate: 2026-08-28
description: 一句话摘要
image: ""
slugId: stable-id
category: 技术笔记
draft: false
pinTop: 0
---
~~~

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| title | 是 | 文章标题 |
| pubDate | 是 | 发布日期，建议使用 YYYY-MM-DD |
| description | 否 | 用于文章摘要、SEO 和列表说明 |
| image | 否 | 封面图，可使用文章目录内的相对路径或外部 URL |
| slugId | 是 | 稳定外部标识，可用于评论等外部关联 |
| category | 否 | 顶级分类名称 |
| draft | 否 | true 表示草稿；默认值为 false |
| pinTop | 否 | 置顶标记，通常使用 0 或 1 |

schema 定义在 src/content.config.ts。不要添加项目没有定义和使用的 frontmatter 字段。

### 5.1 草稿行为

draft: true 的文章会被公开查询过滤掉，因此不会出现在首页、归档页、文章详情静态路由、RSS 或 Pagefind 搜索结果中。

脚手架和 CMS 的默认值不同：

| 创建方式 | 默认状态 |
| --- | --- |
| pnpm newpost | 已发布，draft: false |
| CMS 新建 | 草稿，draft: true |

### 5.2 slugId 行为

slugId 是同一文章不同语言版本共享的稳定外部标识。它不决定文章路径，也不会因为移动文章目录自动变化。已有文章的 slugId 不应随意修改，否则可能影响评论或其他外部关联。

## 6. 分类和首页目录

### 6.1 顶级分类

顶级分类定义在 src/content/navigation.ts。当前包括：

~~~text
技术笔记
项目实践
工具使用
随想记录
~~~

文章应使用顶级分类作为 category：

~~~yaml
category: 技术笔记
~~~

分类名称必须与导航中的顶级 label 完全一致。

### 6.2 “Web 开发”等文字的含义

“Web 开发”定义在 src/content/navigation.ts 的 children 中：

~~~ts
{
  id: "web",
  label: "Web 开发",
  description: "前端、Astro 与 Web 工程。"
}
~~~

它显示在首页“技术笔记”区块的目录列表中，是帮助读者理解主题范围的说明文字。

目前它不是实际的二级分类：

- 不会自动生成 /web 路由。
- 不会生成二级筛选链接。
- id: web 当前不参与文章匹配。
- 文章如果写 category: Web 开发，不会自动归入“技术笔记”区块。

如果文章希望出现在首页“技术笔记”下，应该写：

~~~yaml
category: 技术笔记
~~~

### 6.3 修改首页分类文字

修改 src/content/navigation.ts 中的以下字段：

- label：分类名称。
- description：分类简介。
- path：分类归档链接。
- children[].label：目录说明名称。
- children[].description：目录说明文字。

修改顶级 label 时，需要同步更新已有文章的 category，否则这些文章将无法匹配到新的首页分类。

### 6.4 首页文章数量

每个顶级分类的首页区块只显示该分类最近的 3 篇公开文章。全部文章可以通过“查看全部”进入归档页。

首页当前使用 getBlogEntrySort() 的公开文章结果，按发布日期降序排列。

## 7. 页面布局修改指南

### 7.1 全部页面的公共框架

页面公共结构由以下文件组成：

~~~text
src/layouts/MainPageLayout.astro
src/layouts/Layout.astro
~~~

MainPageLayout.astro 负责 Header、主内容区域、Footer 和 Search。

如果要调整所有页面的 Header、Footer、搜索框或主体外壳，优先修改 MainPageLayout.astro。

Layout.astro 负责更底层的页面文档结构：

- html 和 head。
- 页面标题和 description。
- favicon 和 RSS alternate link。
- 深色模式初始化。
- Astro 页面过渡。
- 页面加载遮罩。

### 7.2 全站宽度、颜色和基础样式

全局尺寸和主题变量位于 src/styles/variables.css。常用变量包括：

~~~css
--header-width       顶部导航宽度
--content-width      页面内容宽度
--page-width         普通正文最大宽度
--reading-width      文章正文宽度
--toc-width          右侧目录宽度
--bg-color           页面背景色
--text-color         主文字颜色
--text-color-70      次要文字颜色
--link-color         链接颜色
--accent-color       强调色
~~~

全局基础规则位于 src/styles/global.css。其中 .page-shell 控制大多数页面的水平宽度，.site-main 控制主内容区域的基础高度。

### 7.3 首页布局

首页入口是 src/pages/[...locale]/[...page].astro，负责首页标题、介绍文字、公开文章数量、归档入口、顶级分类遍历和整体间距。

分类区块由 src/components/knowledge/SectionOverview.astro 负责，显示分类名称、简介、目录说明、最近文章和归档链接。

首页不是通过 PostCard.astro 生成，而是通过 SectionOverview 生成知识库式分类区块。

### 7.4 文章详情页布局

文章详情页入口是 src/pages/[...locale]/blog/[...id].astro。

桌面端主要结构为：

~~~text
左侧知识树 | 中央文章正文 | 右侧本页目录
~~~

相关文件：

~~~text
src/components/knowledge/KnowledgeTree.astro
src/components/knowledge/OnThisPage.astro
src/components/misc/Markdown.astro
src/styles/markdown.css
~~~

文章页面文件自身负责文章标题、摘要、日期、字数、封面、正文、许可证、上下篇、评论和三栏响应式布局。

### 7.5 归档页布局

归档页入口是 src/pages/[...locale]/archives.astro，筛选交互由 src/components/ArchivePanel.svelte 负责。

服务端提供公开文章列表，Svelte 在浏览器端执行分类筛选和 URL query 同步。

### 7.6 关于页和友链页

关于页和友链页使用 MainPageLayout.astro，正文内容来自 src/content/spec：

~~~text
src/content/spec/about/zh-cn.md
src/content/spec/about/en.md
src/content/spec/friends/zh-cn.md
src/content/spec/friends/en.md
~~~

如果只修改文字，编辑对应 Markdown；如果修改布局，编辑对应页面入口或公共布局。

## 8. Markdown 写作语法

普通 Markdown 语法直接使用标题、列表、表格、链接、图片和代码块即可。

### 提示块

~~~markdown
:::note
这是一条普通提示。
:::

:::tip{name="写作提示"}
这是一条带标题的提示。
:::
~~~

可用类型包括 note、tip、important、caution 和 warning。

### 数学公式

~~~markdown
行内公式为 $O(n)$。

$$
T(n) = O(\log n)
$$
~~~

### GitHub、音乐和引用卡片

~~~markdown
::github{repo="owner/repository"}
::music{id="歌曲ID"}
::quote[这是一段居中引用]
~~~

### Typst

Markdown 中使用语言标记为 typst 的代码块即可触发 Typst 渲染。CMS 实时预览也支持该语法。

### 图片

文章目录内的图片可以使用相对路径：

~~~markdown
![封面说明](./cover.jpg)
~~~

CMS 上传的图片会保存到对应文章目录，并自动填写相对路径。

## 9. 多语言和翻译

Astro 的语言配置位于 astro.config.mjs：

~~~text
默认语言：zh-cn
支持语言：zh-cn、en
~~~

中文默认使用根路径，英文使用 /en/ 前缀。

界面翻译位于：

~~~text
src/i18n/language/zh-cn.ts
src/i18n/language/en.ts
~~~

文章内容翻译则使用同一文章目录中的不同 Markdown 文件。

如果英文文章不存在，英文文章页会回退到中文版本并显示提示。如果文章只有英文版本，它不会出现在默认中文文章列表中。

当前首页分类文字和部分首页说明直接写在 navigation.ts 和首页 Astro 文件中，并没有完全接入 i18n。修改英文首页时，需要注意这些固定中文文字。

## 10. 站点配置

主要配置文件是 src/config.ts，常用配置包括：

~~~ts
siteConfig.title                    站点名称
siteConfig.subTitle                 站点副标题
siteConfig.toc.depth                文章目录深度
siteConfig.blogNavi.enable          是否显示上一篇/下一篇
siteConfig.comments.enable          是否启用评论
siteConfig.theme.LQIP               是否启用图片低质量占位
siteConfig.theme.PhotoSwipe         是否启用图片查看器
siteConfig.theme.postCard.imageMode 文章卡片图片模式
profileConfig.name                  作者或站点名称
profileConfig.description           站点描述
licenseConfig                       文章许可证
~~~

评论只有在启用开关并配置后端地址后才会加载。默认配置中评论关闭。

## 11. 构建和部署

生产构建：

~~~bash
pnpm build
~~~

构建产物位于 dist/，可部署到 Cloudflare Pages、Netlify、Vercel 静态托管或普通静态文件服务器。

生产环境建议配置：

~~~text
PUBLIC_SITE_URL=https://example.com
~~~

该变量用于生成 canonical URL、RSS 等绝对地址。

如果部署在非根路径，还需要配置：

~~~text
BASE_PATH=/your-project
~~~

GitHub Pages 工作流位于 .github/workflows/deploy.yml。

## 12. 数据流概览

~~~text
Markdown 文件
  -> src/content.config.ts
  -> Astro Content Collections
  -> src/utils/content-utils.ts
     - 过滤草稿
     - 选择语言
     - 中文回退
     - 按日期排序
  -> 页面入口
  -> Layout / Components
  -> dist 静态 HTML
  -> Pagefind 搜索索引
~~~

文章写入有两条路径：

~~~text
pnpm newpost
  -> script/newpost.js
  -> src/content/blog/**/*.md

本地 CMS
  -> Hono API
  -> cms/server/store.mjs
  -> src/content/blog/**/*.md
~~~

CMS 预览会复用博客 Markdown 渲染管线中的主要插件，因此可以在保存前查看大部分正式渲染效果。

## 13. 常见问题

### 文章没有出现在首页

依次检查：

1. 文件是否位于 src/content/blog 下。
2. 文件名是否为 zh-cn.md 或 en.md。
3. 是否包含 title、pubDate 和 slugId。
4. 是否设置了 draft: true。
5. category 是否与顶级导航的 label 完全一致。
6. 当前页面语言是否有对应版本。

### 文章出现在归档，但没有出现在首页分类

通常是 category 与 src/content/navigation.ts 中的顶级 label 不一致。

例如 category: Web 开发 不会自动归入“技术笔记”，应改为 category: 技术笔记。

### 英文页面显示中文

这是当前设计的 locale fallback 行为：英文版本不存在时，页面回退到中文版本并显示提示。

### 搜索没有结果

请确认已经执行：

~~~bash
pnpm build
pnpm preview
~~~

开发服务器不会自动生成 Pagefind 索引。

### 修改导航文字后文章消失

顶级导航的 label 同时是文章分类匹配值。修改 label 后，必须同步修改文章 frontmatter 中的 category。

### CMS 保存后博客没有更新

确认：

1. CMS 和博客使用的是同一个项目目录。
2. 博客开发服务器仍在运行。
3. 保存的是正确语言版本。
4. 文章没有因为 draft: true 被公开查询过滤。
5. 修改 cms/server 目录后已经重启 CMS。

## 14. 当前边界和维护注意事项

- children 是首页说明性目录，不是实际二级分类模型。
- pageSize、PostPage.astro 和 Navi.astro 属于未接入当前主调用链的分页遗留。
- pinTop 在 CMS 中有置顶意义，但当前首页主要按发布日期排序。
- 首页和导航中存在直接写入的中文文案，新增英文体验时需要额外检查。
- CMS 是本地文件管理工具，当前应在本机或受控环境中使用。
- 修改文章目录会改变文章 URL；修改 slugId 可能影响外部关联。
- 不要把草稿预览误认为生产预览；生产构建和 Pagefind 都只处理公开文章。

## 15. 推荐工作流

日常写作流程：

~~~text
1. 使用 pnpm newpost 或 CMS 新建文章
2. 补充 title、description、category
3. 编写 Markdown 正文
4. 确认 draft 状态
5. 运行 pnpm exec astro check
6. 运行 pnpm build
7. 使用 pnpm preview 检查页面和搜索
8. 发布 dist/
~~~

调整页面外观时，按范围选择文件：

~~~text
单页布局       修改对应 page 文件
首页分类区块   修改 SectionOverview.astro
文章三栏布局   修改 blog/[...id].astro
公共页面外壳   修改 MainPageLayout.astro
全站尺寸颜色   修改 variables.css / global.css
~~~
