# 上游监控（source/*）

> 编排入口与轮询频率见 [orchestration.md](orchestration.md)。

## 1. 监控对象

- 上游仓库以 git submodule 挂载于根目录 `source/` 下（清单见 [.gitmodules](../.gitmodules)），当前为 `source/vueuse`（VueUse）与 `source/react-use`（react-use）。
- **首次轮询某个上游前先初始化对应 submodule**：`git submodule update --init source/react-use`（未初始化时 `git submodule status` 会在该条目行首输出 `-`）。
- 新增上游时以同一模式加入 `source/*`。
- **除 `source/vueuse` 外的 `source/*` 挂载只用于溯源（provenance-only），不纳入监控**：`source/react-use`、`source/react-hookz`、`source/mantine`、`source/ahooks`（以及已挂载但尚无移植的 `source/usehooks`）仅供 `scripts/update.ts` 的 source registry 解析端口自身的 `Map from <source> \`<上游名>\``注解（#915）；本节至 §3 的轮询仍只覆盖`source/vueuse`（所有者决定：仅 VueUse 更新频繁）。`react-spring` 没有 submodule——它是纯再导出依赖，`meta/functions.md`记为`source = react-spring`、路径 `—`、状态 `✅ re-exported`。
- 监控内容：对应上游仓库**默认分支**的 Merged PR，判断改动是否适用于 reause。默认分支按上游而异：`source/vueuse` 为 `main`，`source/react-use` 为 `master`。

## 2. 轮询频率（指数退避）

- **起始间隔**：30 分钟。
- **封顶**：1 天。
- **退避规则**：每次轮询未发现新 Merged PR，间隔翻倍（30 分钟 → 1 小时 → 2 小时 → … → 1 天封顶）；一旦发现新 PR 或相关状态变化，立即重置回 30 分钟。

## 3. 处理流程

1. 在对应 `source/<repo>` submodule 内执行 `git fetch origin`，再对比其**默认分支**（`origin/HEAD`，即 `source/vueuse` 的 `origin/main` / `source/react-use` 的 `origin/master`）的最近 Merged PR。切勿硬编码 `main`：react-use 上 `git fetch origin main` 会以 `fatal: couldn't find remote ref main`（exit 128）失败。
2. 判定改动是否适用于 reause（涉及已镜像或待镜像的 Hook / 共享工具函数）。
3. 若适用：创建「合并更新 Issue」（见 [issues-monitoring.md](issues-monitoring.md)）；若不适用，跳过并在下次轮询继续。

### 3.1 比 submodule pin 更新的上游 Hook

submodule pin 只在挂载时固定过一次、之后长期不推进（当前 pin 用 `git -C source/vueuse rev-parse HEAD` 查看，`git log --oneline -- source/vueuse` 可确认它自初始提交起未再变更，上游默认分支用 `git -C source/vueuse rev-parse origin/main` 查看；撰写本文时为 `97fd09c3` 对 `418c69d3`），因此比该 pin 更新的上游 Hook 源码**不在磁盘上**：

```powershell
Test-Path source/vueuse/packages/core/useWebMCP   # False
```

无需 checkout 或推进 pin，直接从远端 ref 读取即可：

```powershell
git -C source/vueuse show origin/main:packages/core/useWebMCP/index.ts
git -C source/vueuse show origin/main:packages/core/useWebMCP/index.md
```

由此可解释一个看起来像 bug 的产物：`scripts/update.ts` 按冻结的 pin 做映射，从更新提交移植来的 Hook 会在 `meta/functions.md` 中被记为

```text
| `useWebMCP`                       | —                                             | `packages/core/useWebMCP/index.tsx`                       | ✅ ported (not in pinned submodule) |
```

其中的 `✅ ported (not in pinned submodule)` 含义是「该移植声称的上游无法由当前 pin 确认」，**不是**「上游没有对应实现」——它仍是有效来源，按上述 `git show origin/main:<path>` 取原文比对即可。该标签覆盖两种情形：声称的上游比 pin 更新、或上游本就是 Vue 自身 API（`useWebMCP`、`useWatch`），以及该符号是 VueUse 从 `vue` 再导出的（`toValue`）。真正表示「上游既未定义也未再导出该符号」的是第三个标签 `✅ reause-only export`（如 `isRefLike`、`writeState`）。

### 3.2 覆盖度审计

`meta/functions.md` 由 `scripts/update.ts` 生成：`collectFunctions()` 先遍历 **reause 自己的导出**（`packages/{core,shared,math,integrations,electron,firebase,rxjs}/*/index.tsx`），`generateFunctionsMD()` 再**逐个导出**回查上游 `source/vueuse/packages/<pkg>/<name>/index.ts`（本节其余 `L<n>` 是撰写时的实测坐标，`scripts/update.ts` 重构后即会漂移（#884 重写 resolver 即为一例）；核对时以函数名 / 符号名为准）。检查方向是 **reause → 上游**：上游有、reause 没有的函数根本不会被遍历，也就不会成为一行，表格照旧满屏 `✅ ported`。所以该表是**移植登记表，不是覆盖度证明**——「全部 ✅ ported」不能当作完整性依据。本节把覆盖度审计并入本监控阶段（不新增流水线阶段），按下列三步独立复核。

**第 1 步：枚举 pin 上的上游函数。** 口径是 `source/vueuse/packages/<pkg>/<dir>/index.ts`，跳过 `_*` 目录（`core/_template`）与没有 `index.ts` 的目录：

```powershell
$pkgs = @('core','shared','math','integrations','electron','firebase','rxjs')
foreach ($p in $pkgs) {
  $c = (Get-ChildItem "source/vueuse/packages/$p" -Directory | Where-Object { -not $_.Name.StartsWith('_') -and (Test-Path "$($_.FullName)\index.ts") }).Count
  "$p $c"
}
```

**第 2 步：按注解匹配。** 每个移植的 JSDoc 都带 `Map from @vueuse/<pkg> \`<上游名>\``，用的是**上游名**而非 reause 名——这正是重命名可解析的原因（`packages/shared/useWatch/index.tsx`标注的是`watch`）。本步的匹配口径是**「严格反引号注解」与「字面路径」两条通道的并集**——`parseClaims()` 解析的第三种声明形式（散文体，见下文）**不计入本步**；注解通道必须用反引号包裹上游名的严格形式，两条通道必须同时使用，任一偏差都会让残留数算错：

- **只认反引号注解** → 漏掉 3 个只写路径、没写注解的移植（`packages/shared/utils/index.tsx`、`packages/firebase/useAuth/index.tsx`、`packages/firebase/useFirestore/index.tsx`，路径写作 `source/vueuse/packages/<pkg>/<name>`），残留虚增到 38。
- **把无反引号的注解写法也算命中** → 多命中 6 个（`useWatchImmediate` 等 6 个 `useWatch*` 的注解写作 `Map from @vueuse/shared watchImmediate.`，没有反引号），残留少算到 29。

本节的基线用的是「严格注解 ∪ 字面路径」。但**这并非生成器认识的全部形式**：`scripts/update.ts` 还解析第三种声明——**散文体**，见 `RE_PROSE_PORT`（L67）：

```ts
const RE_PROSE_PORT = /port of VueUse's `([A-Z_]\w*)`/gi
// L109-110 —— 与 Map from 声明同等压入 claims，只是不带包名
for (const match of content.matchAll(RE_PROSE_PORT))
  claims.push({ module: '', symbol: match[1], offset: match.index })
```

散文体写成 `React port of VueUse's \`<上游名>\``，只点名上游**符号**、不点名包（`module` 为空），语料里共 **163 个符号**用它；`resolveExport()` 的 L336-342 正为此而设——`module`为空时在本页自己的上游包（如`packages/shared`）里按符号找模块，命中即记为 `✅ ported`（`useWatchArray`/`useStateThrottled`两行在`meta/functions.md`里解析成`packages/shared/watchArray`/`packages/shared/refThrottled`，只可能出自这条通道。去掉它，后续分支 L344、L348-350、L352-354、L356 找的都是 reause 名，上游既无该符号也无同名目录，兜不回来，这两行只会被标成 `✅ reause-only export`，即把已移植的 Hook 误标为「上游没有对应实现」。）因此第 2 步的口径必须写明是哪一种：**231/35 基线 =「严格反引号注解 ∪ 字面路径」两条通道，散文体不计入第 2 步**；把散文体一并计入则是 236/30（见下文「两种口径」）。

```powershell
$corpus = Get-ChildItem packages -Recurse -File -Include index.tsx,index.md | Where-Object { $_.FullName -notmatch 'node_modules|dist|\.vitepress' }
$text = ($corpus | ForEach-Object { Get-Content $_.FullName -Raw }) -join "`n"
```

（`index.md` 只是沿用生成器的文件集：`collectFunctions()` 的 `globSync` 只取 `index.tsx`（L451），而 252 个 `index.md` 里 `Map from` 与散文体声明各为 0 处，纳入它不影响任何计数。）

**第 3 步：分流残留项——未命中不等于缺口。**

- **(a) 重命名移植**：确认 `packages/<pkg>/<新名>/` 目录存在，并**核实该目录确实声明了这个上游名**——名字相似不算证据。证据有两类，**任一成立即可**：`Map from @vueuse/<pkg> \`<上游名>\``注解（第 2 步的严格形式），或第 2 步不计入、专门在此核实的散文体`React port of VueUse's \`<上游名>\``（`RE_PROSE_PORT`）。8 个重命名移植里有 2 个既没有 `Map from` 注解、也没有字面路径，**只靠散文体**声明，不要因此把它们当成「无来源」：

  - `packages/shared/useWatchArray/index.tsx` L16：`* React port of VueUse's \`watchArray\` — watch for an array with additions and removals.`
  - `packages/shared/useStateThrottled/index.tsx` L10：`* Throttle changing of a state value — React port of VueUse's \`refThrottled\`.`

  其余 6 个（`useWatchImmediate`、`useWatchPausable`、`useWatchThrottled`、`useWatchTriggerable`、`useWatchWithFilter`、`useWatchIgnorable`）都写了 `Map from` 注解（其中 3 个同时也有散文体）。反例：`packages/shared/useStateWithControl/` 的注解是 `Map from @vueuse/shared \`refWithControl\``，与 `computedWithControl`无关；后者是议题 **#14**，已带`impractical` 关闭（所有者结论：Vue 的 computed/effect 依赖追踪在 React 中没有等价实现）。只按名字相似推断就会把一个未移植的上游函数误判为已移植。

- **(b) barrel 注释占位**：未实现的由 barrel 以 `// export * from './<name>'` 声明，这就是「已声明未移植」的信号（不得删除）：

  ```powershell
  Get-ChildItem packages/*/index.ts | ForEach-Object { Select-String -Path $_.FullName -Pattern '^//\s*export \* from' }
  ```

  当前 5 条：`core` 的 `computedInject` / `createUnrefFn` / `useCurrentElement`，`shared` 的 `injectLocal` / `provideLocal`。

- **(c) 查决策**：其余查已关闭的 `Mapping | <name>` 议题及其决策标签（`impractical` = 已判定不适用于 React，**不得再派发**）：

  ```powershell
  gh issue list --repo hairyf/reause --state all --label impractical --limit 200 --json number,title,state
  ```

**基线（2026-09-12 实测，pin `97fd09c3`）**

| 项                         |    数量 |
| :------------------------- | ------: |
| 上游函数总数（第 1 步）    | **266** |
| 注解 / 路径命中（第 2 步） | **231** |
| 残留（第 3 步分流）        |  **35** |

按包拆分：`core` 147、`shared` 74、`math` 18、`integrations` 12、`rxjs` 7、`electron` 5、`firebase` 3（合计 266）。

**两种口径。** 同一语料、同一 pin 下，第 2 步用哪种口径计命中，决定了这一行数字：

| 第 2 步口径                               |    命中 |   残留 | 残留分流                      |
| :---------------------------------------- | ------: | -----: | :---------------------------- |
| 严格反引号注解 ∪ 字面路径（**本节基线**） | **231** | **35** | **8 重命名 + 27 impractical** |
| 再计入散文体（`RE_PROSE_PORT`）           | **236** | **30** | **3 重命名 + 27 impractical** |

两种口径下**重命名移植总数都是 8**，27 个 impractical 也完全一致；差别只是其中 5 项（`watchArray`、`refThrottled`、`watchPausable`、`watchThrottled`、`watchIgnorable`）算「第 2 步直接命中」还是留给「第 3(a) 步分流」。下文第 3 步与基线表按**两通道口径（231/35）**展开，并保证 8 个重命名在第 3(a) 步全部可核实。

残留 35 项 = **8 个重命名移植 + 27 个已判定 impractical**（27 = 带 `impractical` 标签且已关闭的议题数，其中 `core` 5 个、`shared` 22 个）。

**重命名移植（8）**：`watchImmediate` → `useWatchImmediate`、`watchPausable` → `useWatchPausable`、`watchThrottled` → `useWatchThrottled`、`watchTriggerable` → `useWatchTriggerable`、`watchWithFilter` → `useWatchWithFilter`、`watchIgnorable` → `useWatchIgnorable`、`watchArray` → `useWatchArray`、`refThrottled` → `useStateThrottled`。

**已判定 impractical（27，不得再派发）**：

- `@vueuse/core`（5）：`computedInject`、`createUnrefFn`、`useCurrentElement`、`useVModel`、`useVModels`
- `@vueuse/shared`（22）：`computedEager`、`computedWithControl`、`createDisposableDirective`、`createRef`、`extendRef`、`get`、`injectLocal`、`provideLocal`、`reactify`、`reactifyObject`、`reactiveComputed`、`reactiveOmit`、`reactivePick`、`set`、`toReactive`、`toRef`、`toRefs`、`tryOnBeforeMount`、`tryOnBeforeUnmount`、`tryOnMounted`、`tryOnScopeDispose`、`tryOnUnmounted`

**结论**：上游 266 个函数全部有着落，**覆盖度是完整的**；27 个是为 React 主动放弃的 Vue-only `ref` / 响应式 API（含 `computedWithControl`），是决策而非缺口，**不得重新派发**。
