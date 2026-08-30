import type { Translation } from "@i18n/key";

const translation: Translation = {
    header: {
        home: "首页",
        archive: "归档",
        about: "关于",
        friends: "友链",
    },
    cover: {
        title: {
            home: "欢迎来到我的笔记",
            archive: "文章归档",
            about: "关于本站",
            friends: "友链",
        },
        subTitle: {
            home: "生活多彩！",
            archive: "共 {count} 篇文章",
            about: "一个以知识库方式组织的个人博客",
            friends: "有趣的灵魂",
        }
    },
    home: {
        infoAriaLabel: "站点信息",
        infoLabel: "知识库概览",
        infoTitle: "欢迎来到我的笔记空间",
        infoDescription: "这里记录学习、实践和思考，也整理着那些值得再次进入的知识路径。",
        topCategoriesCount: "顶级分类",
        publicArticles: "公开文章总数",
        lastUpdated: "最后更新",
    },
    portal: {
        ariaLabel: "站点入口",
        eyebrow: "个人数字空间",
        title: "欢迎来到 wentZh",
        description: "这里汇集持续生长的笔记、项目与实验。请选择想要进入的空间。",
        note: {
            label: "笔记站",
            description: "整理学习、实践与思考的知识库。",
            action: "进入笔记站",
        },
        project: {
            label: "项目站",
            description: "用于记录正在推进的作品与项目。",
        },
        lab: {
            label: "实验站",
            description: "留给原型、试验与尚未定型的想法。",
        },
        comingSoon: "即将开放",
    },
    article: {
        publishedOn: "发布于",
        updatedOn: "最后更新于",
    },
    toc: "目录",
    category: "分类",
    pageNavigation: {
        previous: "上一页",
        next: "下一页",
        currentPage: "第 {currentPage} 页，共 {totalPages} 页",
    },
    button: {
        switchDarkMode: "切换明暗模式",
        backToTop: "回到顶部",
        backToBottom: "回到底部",
        meun: "菜单",
        toc: "目录",
        backToComments: "前往评论区",
    },
    search: {
        placeholder: "输入关键词开始搜索",
        noresult: "未找到相关结果",
        error: "搜索出现错误，请稍后重试"
    },
    license: {
        author: "作者",
        license: "许可协议",
        publishon: "发布时间"
    },
    blogNavi: {
        next: "下一篇",
        prev: "上一篇"
    },
    pagecard: {
        words: "字",
        minutes: "分钟",
        uncategorized: "未分类"
    },
    directory: {
        home: "首页",
        articles: "篇文章",
        lastUpdated: "最后更新",
        recentUpdates: "最近发布",
        subdirectories: "子目录",
        allArticles: "全部文章",
        noArticles: "暂无公开文章",
        noUpdates: "暂无更新",
    },
    comments: {
        name: "昵称",
        email: "邮箱",
        site: "网站",
        required: "必填",
        optional: "选填",
        welcome: "欢迎评论",
        comments: "条评论",
        cancel: "取消",
        send: "发送",
        sending: "发送中...",
        reply: "回复",
        replyPlaceholder: "写下你的回复...",
        loadMore: "加载更多",
        loading: "正在加载评论...",
        loadFailed: "加载失败",
        submitSuccess: "提交成功",
        submitFailed: "提交失败，请稍后再试",
        verificationRequired: "邮箱需要认证，请查收验证邮件",
        fillRequired: "请填写昵称、邮箱和评论内容",
        confirmDelete: "确定要删除这条评论吗？",
        delete: "删除",
        deleteSuccess: "删除成功",
        deleteFailed: "删除失败",
        deleteError: "删除评论失败",
        characters: "字符",
        words: "单词",
        contentTooLong: "评论内容超出限制：不超过2000字或1000单词",
        replyTo: "回复",
        write: "编辑",
        preview: "预览",
        previewError: "Markdown 语法错误",
        codeFence: "代码块标记 ``` 未闭合",
        inlineCode: "行内代码标记 ` 未闭合",
        bold: "粗体",
        italic: "斜体",
        quote: "引用",
        code: "代码",
        link: "链接",
        image: "图片",
        list: "列表",
        showMoreReplies: "查看剩余回复",
        collapseReplies: "收起回复",
    },
    langNote: {
        note: "注意：",
        description: "当前页面不支持简体中文，使用默认语言版本"
    },
    draftNote: {
        warning: "草稿警告：",
        description: "草稿不会出现在公开页面。"
    },
    page404: {
        title: "404 - 虚无之境",
        subTitle: "看起来你闯入了一片代码荒原，这里还没有被开发出来。",
        backToHome: "返回首页",
        backToPreview: "返回上一页",
        errorCode: "错误代码：404 - 虚无之境",
        notice: "或许你可以尝试："
    },
    themeInfo: {
        light: "切换到 浅色 模式",
        dark: "切换到 深色 模式",
        system: "切换到 跟随系统 模式"
    }
}

export default translation;
