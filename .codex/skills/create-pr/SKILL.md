---
name: create-pr
description: Use when committed changes need a GitHub Pull Request prepared or created from the current branch, including when repository, branch, remote, or PR conventions must be checked first.
---

# Create Pull Request

根据当前仓库事实准备并创建 GitHub Pull Request。标题、描述、语言和目标分支以项目规则、现有模板、提交记录和用户要求为准，不套用其他项目的格式。

## Preconditions

- 当前工作已提交到非默认分支。
- 已确认当前 remote、仓库归属和目标 base 分支。
- GitHub 连接器或 MCP 能力可用。
- 用户已明确允许执行本次 PR 创建；推送是独立动作，必须单独获得授权。

## Workflow

### 1. Inspect repository state

检查并记录：

- 当前分支和默认分支；
- remote URL 对应的 owner/repository；
- 相对于 base 分支的提交和文件差异；
- 未提交或未跟踪改动；
- 上游分支是否存在、是否已推送；
- `.github` 中的 PR 模板、项目 README、`.ai_docs/rules/git_rules.md`（如存在）和近期提交格式。

如果当前分支是默认分支、没有独有提交、remote 不明确、或工作区包含可能不应进入 PR 的改动，先报告问题，不创建 PR。

### 2. Resolve conventions

- 有项目规则时严格遵守项目规则。
- 没有规则时，根据近期提交和用户要求生成最小格式，不臆造 scope、标签、检查项或 issue 关联。
- 当前项目默认使用中文标题和描述；用户临时指定其他语言时，以用户指定为准。
- PR 描述应说明目的、主要改动、验证结果、已知限制和关联 issue（没有则写“无”）。

### 3. Prepare preview

生成并展示：

- 标题；
- base/head 分支；
- 目标 owner/repository；
- Markdown 描述；
- 改动文件和提交摘要；
- 测试/构建结果；
- 是否需要推送。

预览中必须区分“已验证事实”和“推断内容”。

### 4. Push only with explicit authorization

如果 head 分支尚未推送，先说明需要执行的推送命令和目标 remote。没有明确授权时，只展示预览，不推送。不得为了创建 PR 自动 force-push、修改 remote、提交未提交文件或清理工作区。

### 5. Create only after confirmation

用户确认预览、目标仓库和 base 分支后，使用当前环境可用的 GitHub 工具创建 PR。创建成功后返回 PR 编号、URL、标题、base/head 和验证状态。

如果 GitHub 工具不可用，只完成预览并说明缺失能力，不伪造创建结果。

## Output Contract

```text
状态：<需要补充 / 等待确认 / 已创建 / 未创建>
仓库：<owner/repository>
分支：<head -> base>
标题：<title>
描述：<markdown>
验证：<commands and results>
阻塞项：<none or list>
```

## Guardrails

- 不把当前 remote 推断成用户拥有的仓库；owner/repository 必须从 Git 配置或用户输入确认。
- 不把推送、提交、创建 PR 视为同一个授权。
- 不在 PR 描述中声称未执行的测试已经通过。
- 不因为 PR 模板或提交格式缺失就强行套用固定项目模板。
- 不修改业务代码；发现代码问题只报告，不在本 Skill 中修复。
