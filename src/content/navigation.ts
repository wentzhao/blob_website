export type NavigationChild = {
  id: string;
  label: string;
  description: string;
};

export type NavigationSection = {
  id: string;
  label: string;
  description: string;
  path: string;
  children: NavigationChild[];
};

export function validateNavigation(sections: NavigationSection[]) {
  const ids = sections.map((section) => section.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate navigation section id");
  }
  return sections;
}

export const topSections = validateNavigation([
  {
    id: "tech",
    label: "技术笔记",
    description: "记录基础知识、工程实践和值得反复查阅的结论。",
    path: "/archives/?category=技术笔记",
    children: [
      { id: "web", label: "Web 开发", description: "前端、Astro 与 Web 工程。" },
      { id: "ai", label: "人工智能", description: "模型、论文和实验记录。" },
    ],
  },
  {
    id: "projects",
    label: "项目实践",
    description: "把想法做成可以运行、验证和复用的项目。",
    path: "/archives/?category=项目实践",
    children: [
      { id: "build", label: "构建记录", description: "从设计到交付的过程记录。" },
      { id: "review", label: "复盘总结", description: "问题、取舍和经验沉淀。" },
    ],
  },
  {
    id: "tools",
    label: "工具使用",
    description: "整理那些能让学习和开发更顺手的工具。",
    path: "/archives/?category=工具使用",
    children: [
      { id: "workflow", label: "工作流", description: "编辑器、命令行与自动化。" },
      { id: "deployment", label: "部署运维", description: "部署、托管与发布。" },
    ],
  },
  {
    id: "thoughts",
    label: "随想记录",
    description: "不急着归类的观察、阅读和阶段性思考。",
    path: "/archives/?category=随想记录",
    children: [
      { id: "reading", label: "阅读笔记", description: "书籍、文章和灵感。" },
      { id: "life", label: "生活片段", description: "一些慢下来的记录。" },
    ],
  },
]);
