# 编排（Orchestration）

reause 自动化流水线的总入口：定义总体流程、各环节职责与**精准轮询频率**，具体执行细节引用各分文档。

## 1. 总体流水线

```text
[上游变动 / 用户需求]
│
▼

创建 Issue (合并更新 / 新增 Hook)
│
▼

标记 implement 标签
│
▼

派发实现子代理 ───> 遵守核心协议 & 现有架构 ───> 提交 PR
│
▲

监控 PR 评论 ───(有人类评论/审查意见)───> 原子代理二次修复
│
▼ (无人类评论 & CI 通过)

PR 合并与收尾

▼ (每天晚上，有新增/更改内容)

Nightly Release
```

## 2. 环节职责与文档索引

| 环节            | 执行文档                                         | 触发时机                          | 轮询频率                        |
| :-------------- | :----------------------------------------------- | :-------------------------------- | :------------------------------ |
| 上游监控        | [upstream-monitoring.md](upstream-monitoring.md) | 持续                              | 指数退避：30 分钟 → 1 天        |
| Issues 监控     | [issues-monitoring.md](issues-monitoring.md)     | 持续                              | 指数退避：30 分钟 → 1 天        |
| 子代理执行      | [subagent-execution.md](subagent-execution.md)   | Issue 打上 `implement` 标签后派发 | 一次性派发 + 按 review 评论复派 |
| PR 合并         | [pr-merge.md](pr-merge.md)                       | 子代理 PR CI 完成                 | 事件驱动（CI 完成即触发）       |
| Nightly Release | [release.md](release.md)                         | 每天晚上                          | 每日一次，有新增/更改内容才执行 |
| 命名与绑定标准  | 根目录 [AGENTS.md](../AGENTS.md)                 | —                                 | —                               |

## 3. 轮询频率细则

- **指数退避**：起始间隔 **30 分钟**，每次轮询无新变化则翻倍递增（30 分钟 → 1 小时 → 2 小时 → …），封顶 **1 天**；发现新内容（新 Merged PR、新 Issue、新评论、标签变化）立即重置回 30 分钟。
- **PR CI 监控**：子代理提交 PR 后持续 `gh pr checks --watch` 直至 CI 完成，不适用退避策略。
- **Nightly Release**：固定每日一次，仅在存在新增/更改内容时执行，否则跳过。

## 4. 节点定义

1. **监控上游变动**：见 [upstream-monitoring.md](upstream-monitoring.md)。定期轮询/监控上游库（VueUse / react-use 等）的 Merged PR。若更改适用于 reause，自动创建“合并更新 Issue”。
2. **接收用户需求**：见 [issues-monitoring.md](issues-monitoring.md)。用户提出新增 Hook 请求（例如“请添加 react-use 的 `useXXX`”）时，直接创建对应的“新增 Hook Issue”。
3. **调度实现代理**：监控到 Issue 被打上 `implement` 标签后，系统自动派发**实现子代理**，按照根目录 [AGENTS.md](../AGENTS.md) 与 [subagent-execution.md](subagent-execution.md) 规范完成编码并提交 PR。
4. **处理 PR 审查**：见 [issues-monitoring.md](issues-monitoring.md) §3。持续监控 PR 中的用户评论/审查意见（**不含** netlify deploy-preview 等自动化评论），一旦产生人类评论，**必须重新指派原子代理**在同一个 Worktree 和分支上进行修复与提交，禁止重新创建 PR。
5. **PR 合并与收尾**：见 [pr-merge.md](pr-merge.md)。子代理 PR CI 完成后审批合并，合并后更新元数据。
6. **Nightly Release**：见 [release.md](release.md)。每天晚上有新增/更改内容时发布，否则跳过。

## 5. 需求权威来源（派发契约）

派发任何实现子代理之前，必须以 Issue 为唯一需求来源，按以下优先级取用（高 → 低）：

1. **Issue 评论中最后一条仓库所有者（`hairyf`）的评论**：**覆盖**正文中一切与之冲突的内容——Hook 命名、归属包、文件路径、参数与返回值结构、默认值与选项。绝大多数 Issue 都带有这类调整评论，子代理必须逐条读完再动手。
2. **Issue 标题**：给出该 Hook 在 reause 中的最终名称（可能与正文引用的上游 VueUse 名称不同，例如 `createReusableTemplate` → `createPortalSlot`、`createTemplatePromise` → `createPromisifiedComponent`）。
3. **Issue 正文**：`## Target` / `## Mapping files` / `## Mapping notes` 提供上游来源（`source/vueuse/...`）与映射决策。正文里的 `packages/<pkg>/src/<hook>.ts` 路径是历史遗留写法，**实际布局是 `packages/<pkg>/<hook>/index.tsx`**。
4. **Issue 标签**：`implement` = 已确认、可派发；`adjustment` = 该 Issue 的预期 React 实现仍需按所有者评论调整，未澄清前不得派发。

> 当评论与正文/标签冲突、且评论未覆盖该冲突点时，**严禁自行臆测**：暂停派发并向用户确认（对应 [AGENTS.md](../AGENTS.md) §1.2 的“抛回父代理”规则）。

## 6. 编排者与子代理分工

| 角色                 | 职责                                                                                                                                                                                                                           |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **编排者（父代理）** | 轮询上游与 Issues；创建/更新 Issue；读取正文与**全部评论**并形成派发契约；准备 Worktree（见 [subagent-execution.md](subagent-execution.md) §1）；并发派发实现子代理；审批并合并 PR；合并后统一更新元数据；执行 Nightly Release |
| **实现子代理**       | 仅在分配的 Worktree 内工作；按派发契约实现 Hook + 测试 + 文档；本地验证（`vitest` / `eslint` / `tsc`）；提交、推送并创建 PR；跟踪 CI 直至完成；**严禁合并、关闭 PR 或执行 `npm run update`**                                   |

- **一个 Hook/功能 = 一个分支 = 一个 PR**；并发派发时按包拆分，避免同一包 `index.ts` barrel 冲突。
- 子代理中断（无提交且 Worktree 干净）时，编排者必须重新派发同一 Issue，不得丢弃。
- PR 正文必须包含 `Closes #<N>`，合并即自动关闭对应 Issue。
- 元数据（`meta/functions.md`、`packages/functions.md`、`packages/metadata/src/functions.ts`）只由编排者在 PR 批量合并后统一生成，子代理一律不得改动。
