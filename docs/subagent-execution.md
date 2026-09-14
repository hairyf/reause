# 子代理执行与 Worktree

> 编排入口与轮询频率见 [orchestration.md](orchestration.md)。
> Hook 命名与返回值标准见根目录 [AGENTS.md](../AGENTS.md)。

## 1. 环境准备

- **仅限 Worktree 操作**：Worktree 根目录与主树同级（主树 `D:\reaxuse` → `D:\reaxuse-wt\<slug>`，分支 `fix/<feature-or-hook>`），严禁直接修改主树。
- **依赖连接**：为主树中的每个 `node_modules`（根目录 + `packages/*` + `playgrounds/*`）在 Worktree 的同位置创建 junction（`cmd /c mklink /J`）；**严禁在 Worktree 内执行任何安装命令**。
- **配置隔离**：生成 git-ignored 的 `vitest.worktree.config.ts`（独立 `cacheDir`，如 `.worktree-vite`）并据此运行测试；该文件严禁提交。
- **上游只读**：上游 submodule 无需在 Worktree 内初始化，直接从主树 `source/vueuse/...` 只读引用。

## 2. 编码铁律

- **需求优先级**：Issue 标题 = 最终命名；**最后一条所有者评论 = 最终需求**（见 [orchestration.md](orchestration.md) §5）；正文中的 `packages/<pkg>/src/<hook>.ts` 为历史路径，实际布局是 `packages/<pkg>/<hook>/index.tsx`。
- **严格按需修改**：严禁修改无关代码。
- **`packages/shared/**` 例外（唯一授权）**：默认禁止修改 `packages/shared/**`（必要时上报提案）。唯一例外是**新增 shared 类 Hook**：允许新建 `packages/shared/<hook>/**` 目录（`index.tsx` / `index.test.tsx` / `index.md` / `demo.tsx`），并在 `packages/shared/index.ts` 的 ASCII 排序位置**新增一行**导出（若已有注释占位则取消注释）。严禁改动已有的 shared 实现、类型、工具函数或其它导出行；确需改动必须上报提案。
- **禁忌指令**：严禁执行 `npm/pnpm install|ci`、`npm run update`、`git add -A` 或编辑元数据文件。
- **严禁使用 `git stash`**：由于全局共享 `refs/stash`，并发使用会导致改动穿透。使用 `git diff` / `git show` 或临时副本比对。

## 3. 核心协议（高优先级）

### 3.1 返回值约束协议

- **VueUse 转换类 Tuple 强制家族**：所有 `useState*`（含 `useState*History`）必须返回 `[value, setValue]` 或 `[value, setValue, controls]` / `[history, undo, redo, controls]`。
- **VueUse 可写白名单**：`useStorage` / `useSessionStorage` / `useLocalStorage` / `useStorageAsync` / `useScrollLock` / `useTitle` / `useUrlSearchParams` / `useTextDirection` 默认返回 `[value, setValue]`。
- **react-use 直接镜像类**：不受 VueUse tuple 白名单约束，严格与 react-use 原生签名对齐。

### 3.2 引用链协议

- 工具函数与类型唯一实现于 `@reause/shared`，其他包必须统一引用。
- **例外处理**：当 barrel `export *` 触发 TS2308 同名类型冲突且无法直接导入时，允许本地声明并登记记录。
- `integrations` 包禁止从 `@reause/core` 导入代码，须使用本地 `MaybeElement` / `resolveElement`。
- **React 19 规范**：需要可写 ref 容器时使用 `{ current: T }` 类型，禁止使用 `as MutableRefObject<T>`。

### 3.3 useListener 协议

- 凡是返回 listener callback 的 Hook，消费方式统一采用 `useListener(onXxx, cb)`。
- 注册函数 `onXxx` 必须返回 off 函数 `() => void` 或 `void`；`useListener` 既可传注册函数本身，也可传带 `on` 成员的对象（如 `createEventHook()` 的返回值）。

## 4. 本地验证与提交

```powershell
# 1. 验证流程
npx vitest run --config vitest.worktree.config.ts packages/<pkg>/<hook>/index.test.tsx
npx eslint packages/<pkg>/<hook>/
npx tsc --noEmit                          # 基线 0 错误（main 上实测无输出、exit 0），零新增

# 2. 提交与推送
git add <改动文件>
git commit -m "feat(<pkg>): implement <hook>"
git push -u origin fix/<feature-or-hook>

# 3. 创建 PR
gh pr create --repo hairyf/reause --base main --head fix/<feature-or-hook> --title "feat(<pkg>): implement <hook>" --body-file <temp.md>
gh pr checks <PR> --repo hairyf/reause --watch
```

> **注意**：一个 Hook/功能变更对应一个 PR，被 review 指出问题时需重新指派原子代理在原分支追加提交，严禁主动执行 merge 或 close 操作。

## 5. 环境避坑与铁律

- **主树同步**：操作前同步主树（`D:\reaxuse`），防止 junction 失效引发类型误报：

  ```powershell
  git -C D:\reaxuse fetch origin main
  git -C D:\reaxuse checkout main
  git -C D:\reaxuse reset --hard origin/main
  ```

  必须先 `checkout main`：`bumpp --pr` 与 worktree 流程会把主树停在 `release/*` / `fix/*` 分支上，此时直接 `reset --hard origin/main` 改写的是**当前分支**而非 `main`。

- **Worktree 安全清理**：删除 worktree 前必须先执行 `cmd /c rmdir <wt>\node_modules` 移除软链接，防止 `git worktree remove` 误删主树文件。
- **PowerShell 路径规范**：.NET 文件 API 必须使用绝对路径。
- **构建与测试限制**：
  - 修改 Markdown 文档后须先运行 `npx eslint --fix <file>`，避免提交拦截。
  - 测试文件涉及 rxjs 时，必须使用值导入（`import { Observable } from 'rxjs'`），禁止使用 `import type`。
  - 不得在 worktree 内执行 `npm/pnpm install`。依赖新增统一在主树根目录以 pnpm workspace 根形式安装：`pnpm add -Dw <pkg>`（同样严禁在 worktree 内执行）。
