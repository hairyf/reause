# 文档写作规范（Hook / 指南 / Skills）

> 本文是 `packages/**/index.md`、`packages/guide/**`、`packages/skills/**` 三类文档的**唯一规范**。
> 目的：让 AI 生成或改写的文档与自动流水线一致——凡是机器能生成的内容一律不手写，凡是手写的内容只保留"怎么用"。
> 与 [CONTRIBUTING.md](../CONTRIBUTING.md)（流程）与 [AGENTS.md](../AGENTS.md)（镜像/绑定规范）配套阅读。

## 0. 一句话规则

> **只写"机器写不了的东西"。** 类型、来源链接、Demo、函数名链接、目录、分类索引、Skill 副本全部由脚本生成；`index.md` 只保留：**一句简介 + 用法示例 + 真实 API 的行为说明**。

## 1. 自动生成内容清单（禁止手写）

Hook 页面在构建期由插件 `packages/.vitepress/plugins/markdownTransform.ts` 注入以下内容，手写会被覆盖或重复：

| 内容                                                                            | 生成者                                                                                              | 触发条件                                            |
| :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `## Demo` 段落                                                                  | `markdownTransform.ts`                                                                              | 同目录存在 `demo.tsx`                               |
| `## Type Declarations`                                                          | 同上（`getTypeDefinitions` 从 `index.tsx` 导出类型提取）                                            | 该页有可提取的导出类型                              |
| `## Source` 链接行                                                              | 同上（`sourceLinks()` 按 registry 的 `source` 列生成 reause / Demo / 上游三链接）                   | 总能生成                                            |
| `## Contributors` 段（内含 `<Contributors />`）                                                              | 同上                                                                                                | 总是                                                |
| `## Changelog` 时间线（内含 `<Changelog />`）                                                                | 同上，由 `theme/components/Changelog.vue` 渲染，数据来自 `getChangeLog()`（`plugins/changelog.ts`）  | 总是                                                |
| 函数信息块（Category / Export Size / Package / Last Changed / Alias / Related） | 同上，由 `theme/components/FunctionInfo.vue` 渲染，数据取自 registry 与 `packages/export-size.json` | 总能生成                                            |
| 反引号函数名自动链接                                                            | 同上（`` `useToggle` `` → ``[`useToggle`](/core/useToggle)``）                                      | 名称在 registry 中存在；代码块与 `<` 开头的行不处理 |
| 代码块 twoslash（构建期类型检查 → 悬停卡片）                                    | 同上（按块注入该块引用到的 hook，import 指向 hook 源码模块）              | 块自身没写 `no-twoslash`                            |
| 首页 / 侧边栏 / 分类筛选                                                        | `packages/.vitepress/config.ts` + `packages/metadata/src/functions.ts`                              | `category` frontmatter 合法                         |
| Skill 参考副本                                                                  | `packages/skills/build.ts`（`npm run update:skills`）                                               | 对应 `packages/**/index.md` 存在                    |
| `meta/functions.md` 移植登记表                                                  | `scripts/update.ts`                                                                                 | 总是                                                |

因此：

- **不要**手写 `## Type Declarations`、`## Source`、`## Demo`、`## Contributors`、`## Changelog`、`## Install`、`Map from` 之类的整节。
- **不要**手写"该函数在 VueUse 里叫什么/在哪个文件"——这属于 JSDoc 注解与 registry，属于 §7。
- **不要**在正文里手打函数列表表格：`/functions` 由 registry 生成。
- **不要**在代码围栏上手写 `twoslash`：`ts`/`tsx`/`typescript` 块在构建期自动加上（见 §2.1）。

## 2. `index.md` 模板

````md
---
category: State
---

# useXxx

一句简介（英文，单个句子，见 §3）。

## Usage

```tsx
import { useXxx } from '@reause/core'
```

## 可选主题小节（按需，命名见 §4）

---

## Options

| Option | Type | Default | Description |
| :----- | :--- | :------ | :---------- |

---

## Return Values

- `value` — ...

---

## Recommended Reading

- [上游文档](https://vueuse.org/...)
````

硬性要求：

- **H1 必须是函数/页面名**，与目录同名（`useXxx`），例外：`packages/electron/_resolve/index.md`（内部辅助页，H1 列多个符号）。简介紧随其后，**每个页面最多一个 `## Usage`**。
- **frontmatter 必须有 `category`**（合法值见 §5），由 `scripts/update.ts` 的 `getPageCategory()` 直接读取。
- **可选 frontmatter**：`alias`（别名，如 `controlledRef`）与 `related`（相关页面，如 `useDevicesList, usePermission`）会被读进 registry 并显示在页面顶部的函数信息块里（§1），解析规则与"未知名字即报错"见 §5。
- **首个小节标题**：单场景用 `## Usage`；同时要展示"基础 + 变体"时用 `## Basic Usage` 作为首节。首节允许的例外：插件页用 `## Install`、同一 Hook 内多个入口用 `## Functions and hooks`、选型澄清用 `## Difference from \`<兄弟 Hook>\``、环境前提用 `## Requirements`、长动机说明用 `## Motivation`。
- **小节之间用 `---` 分隔**（283/285 个页面如此）：`##` 级小节之间空一行后加一条独立成行的 `---`，让长页可扫读；`## Usage` 之前的简介段与小节之间不加。
- **行文语言**：hook 页面与指南**一律英文**（与上游 VueUse 页面保持 1:1 便于对照）；只有 `docs/**`（流水线 SOP）用中文。
- 段落与代码块之间保留空行；代码围栏**必须**带语言标签（`tsx` / `ts` / `bash` / `text`），闭合围栏单独成行。
- 页面总长度默认 **≤ 60 行**；超过说明在复述源码，按 §6 裁剪；`## Internal Technical Notes` 例外。

### 2.1 代码块与 twoslash（悬停类型）

文档站与 VueUse 一样带 twoslash：悬停变量/函数会弹出真实类型与 JSDoc。

- 围栏**不需要**写 `twoslash`：`ts` / `tsx` / `typescript` 块由 `markdownTransform.ts` 在构建期自动处理。
- 注入的是**该块真正引用到的 hook**：`markdownTransform.ts` 拿 registry 匹配块里的标识符，逐个生成 `import { useMouse } from '@reause/core/useMouse'`，再由 `TWOSLASH_PATHS`（`config.ts` 里 twoslash 的 `paths`）解析到该 hook 的**源码模块**。注入内容被 `// ---cut-*---` 裁掉，读者看不到；也正因为注入了 hook 名，不写 import 的 `const { x, y } = useMouse()` 才能悬停出真实签名。
- **为什么按块注入，而不是像 VueUse 那样注入一个静态列表**：VueUse 的列表只有 `vue` 一个模块；reause 的 hook 分散在七个包里，而每个包只产出单个 `dist/index.d.ts`（`@reause/core/useMouse` 这类深路径不存在），所以任何 barrel import（`import ... from '@reause/core'`）都会把整包的**全部类型图 + 第三方类型**（firebase、rxjs、axios、electron…）拉进这个块的 TS program。把 registry 全量注入 ~690 个块，会让 `docs:build` 在 Netlify 上堆溢出（`--max-old-space-size=8192` 也不够）；按块注入后，一个块的 program 大致只有「它引用的那个 hook + react」，与 VueUse 的量级相当。
- 注入只覆盖 registry 里的 hook；工具函数（`unrefElement`、`toValue`…）和**类型**（`UseXxxOptions` 等）仍要自己写 import。
- 关掉单块的类型检查（伪代码、故意不成立的写法）就在 meta 写 `no-twoslash`：它会被 `markdownTransform.ts` 先剥掉，保证 twoslash transformer 的 `\btwoslash\b` 触发器不命中。行高亮照常可用（meta 写 `{5}`，会被补成 `{5} twoslash`）。`js` / `jsx` 块默认不参与，需要时手写 `twoslash`。
- 编译选项与 `tsconfig.json` 对齐（自动 JSX runtime、Bundler 解析、`noErrors: true`）：示例允许残缺，但**语法必须合法**，否则生产构建（Netlify 的 `npm run docs:build`）会直接失败。
- 悬停卡片由 `@shikijs/vitepress-twoslash` 在浏览器端渲染，`npm run docs` 预览即可验证。

## 3. 简介（第一个段落）—— 最关键的一条

`scripts/update.ts` 的 `extractDescription()` 会把**第一个标题之后的第一个段落**截断作为 registry 的 `description`（Skill 表格、`/functions` 列表都用它）：

- 截断点是**第一个 `, ` 或 `. `**，其后所有内容直接丢弃；
- 首字母会被强制小写（除非形如 `CSS` 的全大写缩写开头）；
- frontmatter 与 `:::` 容器块会被先剥掉。

后果与写法要求：

- **简介必须是一个短句**，核心信息放在**第一个逗号之前**。
- 禁止用逗号堆叠从句（旧 `useHotkeys` 写了 `… hotkey strings — mod+K …, with tagsToIgnore …, and …`，被截成半句）。
- **破折号不是截断点**：`. ` 只认句号加空格，`— React port of react-use's \`useLatest\` (upstream mapping files: \`source/react-use/src/useLatest.ts\`)` 会**整段**进入 registry 描述。因此简介里**不得**出现上游溯源从句、上游文件路径、LOC 数字——溯源归 JSDoc 注解（§7），`## Source` 上游链接由插件自动生成。
- 禁止第二段承担"背景介绍"职责：要么合并进第一句，要么写成 `## Usage` 下的小节。
- 长度目标 **≤ 12 词**，句式 `A hook for …` / `Reactive utility to …`。
- 首字母会被强制小写，因此简介首词不要用专有名词（否则 registry 里会出现 `a real Map whose …` 这种小写开头）。

> **待清理（2026-02 审计，未暂存的既有页面）**：`packages/shared/useLatest`、`packages/shared/useLockFn`、`packages/core/useFocusReturn`、`packages/shared/useList`、`packages/shared/createReducer`、`packages/shared/createMemo`、`packages/shared/useMount`、`packages/shared/useQueue`、`packages/shared/useRafState`、`packages/shared/useUnmount`、`packages/shared/useMap`、`packages/shared/useSet`、`packages/shared/useUpdate` 共 13 个页面的简介仍是 `… — React port of <source>'s \`<name>\`` 形式，需要把溯源从句移到 JSDoc、简介只留功能句。

## 4. 小节命名与内容分工

### 4.1 目录与命名

- `###` 用于"同一主题下的变体/子话题"，`####` 仅在一节内部再分层时使用。
- 小节标题用**名词短语**，不用疑问句、不用"关于……"：`### Options`、`### Return Values`、`### Legacy Mode`、`### Separator Attributes and Interactions (`getHandleProps`)`。
- 当小节讲的是**某个具体 API 成员**时，在标题里用反引号带上成员名，便于检索与自动链接。
- 同义标题择一：`Return Values`（复数，首选）／`Return Value`（单值时）；不要混用。
- `### Options` 只用于**钩子入参总表**，列为 `Option | Type | Default | Description`；讲"某个选项的详细行为"时不要复用这个标题，见 §4.4。

### 4.1.1 API 成员小节（`useCollapse` 范式）

页面里"某个 API 成员的完整契约"要成一节时，用**带签名的反引号标题**，而不是散文段落：

```md
## Behavior

### `getCollapseProps(input?)`

Returns element props required to control accessibility and height animation:
`{ style, ref, onTransitionEnd, 'aria-hidden', inert }`

- **`style`**: Merges `input.style` with internal styles. …
- **`ref`**: Merges internal node measurements with `input.ref` (supports Callback & Object Ref).

> **Warning**: Do not override `onTransitionEnd` without chaining the original handler; …
```

- 标题写**真实签名**（含可选参数 `?`）并加反引号；返回对象用一行反引号列出成员，再逐项用 `- **\`member\`**: …` 展开。
- 同一 Hook 的多个成员各自成一个 `###`，顺序与 `Usage` 里出现的顺序一致。

### 4.2 Return Values 的写法

优先按实际情况选择，不要为每个 Hook 强行加一节：

- **返回对象/元组且成员较多**：用 `## Return Values` + 表格（`Name | Type | Description`）或分组项目符号。
- **返回对象但成员少**：写进 `## Usage` 的一段说明即可（`useClipboard` 的 `controls` 就是这么处理的）。
- **`≥2` 个可写值/对象结构**：用对象解构示例（`const { x, setX, y, setY } = useXxx()`）；**返回元组**时必须写成元组解构（`const [text, copy] = useXxx()`），示例与真实类型签名必须一致——这是 `packages/guide/work-with-ai.md` 里也踩过的坑。
- 返回值规范本身（何时对象、何时元组）以 [AGENTS.md §2](../AGENTS.md) 为准，文档只负责**如实呈现**。

### 4.3 行为说明

说明"为什么/边界/副作用"时：

- 用**带粗体前缀的项目符号**列枚举，而不是一大段散文：
  ```md
  - **Accessibility Attributes**: `role="separator"`, `aria-orientation`, …
  - **Keyboard and Double-Click Interactions**:
    - `Arrow keys`: adjust the adjacent panels incrementally by `step` (uses `shiftStep` while `Shift` is held).
  ```
- 每个符号项写"触发条件 + 效果"，不写实现过程（不提 `useEffect` 顺序、内部 hook 名、`flush` 时机；确有必要时集中到 `## Internal Technical Notes`，见 §4.4）。
- 引用类型/函数名一律用反引号（会被自动链接）；引用上游时给 `Recommended Reading` 链接而不是正文长对比。

### 4.4 可选小节

- `## Recommended Reading`：需要读者看上游/VueUse 页面时使用，只放链接。
- `## Source Forms`：仅"多种入参形态"类 Hook（如 storage 系列）使用。
- `## Options`：钩子入参 ≥ 3 个时用表格；≤ 2 个直接写进 Usage 文字。
- `### Key Options` + `#### \`name\` (type, default: \`x\`)`：讲**单个选项**的行为时用这层嵌套（不要开 `##` 级小节）。选项本身有取值矩阵时，在其下用**语义化列名**的表格（`useCollapse`的`keepMounted`用了`Option | Collapsed Styles | Behavior`），不要硬套 `Type | Default`。
- `## Behavior`：把"成员的契约/边界"集中在此（内容形态见 §4.1.1），不与 `## Usage` 混写。
- `## Internal Technical Notes`：**唯一的实现细节出口**，仅用于 reause 特有、读者无法从公开 API 推断的取舍（`flushSync` 同步测量、用 latest-value ref 而非 `useEffectEvent`、顺带导出的工具函数）。写成带粗体前缀的项目符号，**不要**在这里写上游对比、迁移进度或"我们为什么不一样"。
- `## Install`：仅**需要额外 peer dependency 的插件页**（`packages/integrations/**`、`packages/rxjs/**` 共 18 个页面）使用，写在 `## Usage` 之前，只放安装命令与 peer 版本要求。
- `## Difference from \`<兄弟 Hook>\``/`## Motivation`/`## Requirements`：允许出现在 `## Usage` 之前，分别用于选型澄清、设计动机、运行环境前提；不要写成"上游怎么实现"的对比。
- `> **Important**` / `> **Warning**` 引用块：只用于**读者不照做就会出错**的一句话（如"`getCollapseProps()` 必须每次渲染重新调用"、"不要覆盖 `onTransitionEnd`"），不要用来做普通提示。

## 5. `category` 合法值

`category` 只能取 `packages/metadata/src/functions.ts` 中 `categoryNames` 收录的值（`scripts/update.ts` 按页面 frontmatter 收集）：

```text
State, Elements, Browser, Sensors, Network, Animation, Component, Watch, Reactivity,
Array, Time, Utilities, Factory, Lifecycle, Side-effects, Uncategorized,
@Electron, @Firebase, @Integrations, @Math, @RxJS
```

- 缺失或拼错 → registry 记为 `Uncategorized`，侧边栏分类、`/functions` 筛选、Skill 分节都会落错位置。
- 已知缺 `category` 的页面：`packages/core/useCollapse/index.md`、`packages/core/useSplitter/index.md`（registry 里已是 `Uncategorized`，应补 `Elements`）。
- **除 `category` 外，hook 页只允许再写 `alias` 与 `related` 两个键**：两者由 `scripts/update.ts` 的 `readFrontmatterList()` 读进 registry，再由页面顶部的函数信息块渲染（§1）。`related` 是**双向**的——A 写了 B，B 的页面也会出现 A（VueUse 的 "interop related" 语义）——并且每一项都必须指向存在的**页面目录或导出名**，否则 `npm run update` 直接以 `Unknown related function: <name>` 失败，避免页面里留下死链。写法：`alias: controlledRef`、`related: useDevicesList, usePermission`（逗号分隔）或 YAML 列表块；`related` 只表达"相关阅读"，正文里不需要再抄一遍链接。`title:` / `description:` 仍是无消费者的 VueUse 残留（`useStateManualHistory` 两个键都写了，真正生效的描述来自 §3 的简介）。首页 `packages/index.md` 的 `layout` / `hero` / `features` 是 VitePress 首页字段，保持现状。
- 改动 `category` 后分类不会自动生效：registry 由 `npm run update` 重算，本地跑一次只为**自查**是否落到预期分类，生成物按 §9 不随 PR 提交。

## 6. 不该出现在文档里的内容（AI 生成的高频噪声）

以下内容在本仓库的历史文档里大量出现，现已清理；**新写的文档不得再引入**：

1. **`## React divergences` / `## React divergence from upstream`** 整节——参数类型、返回值形态的差异由 `AGENTS.md` 与 JSDoc 承载，文档只描述"当前 API 怎么用"，不写"上游怎么用、我们不一样"。
2. **复述类型签名**：`Return Values` 表里粘贴完整联合类型、把 `UseXxxReturn` 接口贴进正文（`## Type Declarations` 已自动生成且永远与源码同步）。
3. **上游对比段落**：上游文件路径 + LOC、`source/mantine/.../use-hotkeys.ts` 这类坐标、与兄弟 Hook 的取舍长篇（`useHotkeys` vs `useMagicKeys` vs `useKeyPress`）。需要时给 `Recommended Reading`；**唯一允许的对比**是"同名/近名兄弟 Hook 的选型澄清"，且必须写成 `## Difference from \`<兄弟 Hook>\``（`useClipboardItems`对`useClipboard` 就是这种写法），只讲"各自适用什么场景"，不写上游实现差异。
4. **实现过程叙述**：内部用了哪个 hook、渲染几次、`flush: 'pre'` 的批量语义、"为什么不这样实现"——**唯一出口是 `## Internal Technical Notes`**（§4.4），且必须是读者无法从公开 API 推断的取舍。
5. **仓库级背景/架构介绍塞进指南或 Hook 页**（`packages/guide/index.md` 曾有大段"五个上游来源""27 个函数不可行"）：这类内容归 `docs/upstream-monitoring.md`、`meta/functions.md`、JSDoc。
6. **`unverified` / 待确认标注**：未确认的断言不要写进文档，去源码确认或直接不写。
7. **重复段落**：同一段话既出现在 `index.md` 又出现在 JSDoc 又出现在 skill 参考里（skill 参考是生成物，重复即失控）。
8. **过度分节**：把 5 行能说完的内容拆成 6 个 `###`，或给每个小节配一段代码示例。

## 7. JSDoc 注解（生成链的输入）

文档的信息源头是源码 JSDoc，改文档时通常要同步改 `index.tsx`：

- **上游溯源注解**（`scripts/update.ts` 解析，决定 `meta/functions.md` 与文档的 `## Source` 上游链接）：
  - 首选严格形式：`Map from @vueuse/shared \`useWatchImmediate\``（**反引号包裹上游名**，用**上游名**而非 reause 名）；
  - 也认字面路径 `source/vueuse/packages/<pkg>/<name>` 与散文体 `React port of VueUse's \`<Symbol>\``（`RE_PROSE_PORT`）；新写的移植**统一用严格反引号形式**。
- `@example` / 返回值与类型 JSDoc：文档示例与 JSDoc 示例要保持一致，且必须是**可编译的真实 API 调用形态**（元组 vs 对象不能写错）。
- 导出类型（`export interface UseXxxReturn` / `export type UseXxxOptions`）的注释会被自动提取进 `## Type Declarations`，因此**注释写在类型定义处**，不要在 markdown 里重复一遍。

## 8. Skills 文档（`skills/reause-functions/**`）

- `skills/reause-functions/references/*.md` 是 `packages/**/index.md` 的**生成副本**（`packages/skills/build.ts` → `npm run update:skills`，另有一份复制到仓库根的 `skills/`）。
- **永远不要直接编辑 `skills/**`**：`prepareFunctionReferences()` 先 `rmSync` 目标目录再重建，手改会在下次生成时消失，且会导致正文来源不一致。
- Skill 的表格（`SKILL.md`）也是生成的：`templates/reause-functions-skills.md` + `metadata.pages` 的 `description`（即 §3 的简介）。要改描述就改 `index.md` 的简介，不要改 `SKILL.md`。
- 生成逻辑保证 `../{name}/index.md` 链接被重写为 `{name}.md`（`rewrite-function-links.ts`），因此 `index.md` 里可以放心使用跨页链接。

## 9. 生成物与提交边界

`npm run update`（`scripts/update.ts`）会重写 metadata 三件套，`npm run update:skills` 会重写 `skills/**`。按 [CONTRIBUTING.md](../CONTRIBUTING.md) 的规定：

- 贡献者**只改源文件**（`index.tsx` / `index.md` / `demo.tsx` / `index.test.tsx`），**不提交**生成物；metadata 三件套与 `skills/**` 由 orchestrator 在 PR 合并后重新生成（`npm run docs:build` 内部走 `update:full`）。
- 本地可以跑生成命令**用于自查**（确认分类、简介、Skill 表格是否落到预期值），但落地结果不要混进 PR。
- PR 里生成物出现 diff 视为异常：先看是不是改了 `category` / 简介 / JSDoc 坐标，再看 diff 是否符合预期，而不是直接 commit。

## 10. 文档发布前自检清单

- [ ] `index.md` 没有手写的 `## Type Declarations` / `## Source` / `## Demo` / `## Contributors` / `## Changelog`（`## Install` 仅插件页允许）。
- [ ] H1 与目录名一致，`category` 存在且是 §5 的合法值；frontmatter 只写 `category` / `alias` / `related`，不写 `title` / `description` 这类无消费者的键。
- [ ] 简介是单句、≤ 12 词，**第一个逗号前已表达完整含义**，且不含 `React port of …` / 上游路径 / LOC 之类溯源从句。
- [ ] 每个页面只有一个 `## Usage`（或 `## Basic Usage`），且它出现在所有代码示例之前。
- [ ] 没有 `React divergences` 整节、上游文件路径/LOC、源码实现叙述、`unverified` 之类未确认标注。
- [ ] 示例代码的返回值形态（元组/对象）与 `index.tsx` 的真实签名一致。
- [ ] 可选小节（含 `### Key Options` / `## Behavior` / `## Internal Technical Notes` / `> **Warning**`）按 §4.4 取舍，没有为 5 行内容拆出 6 个 `###`。
- [ ] `##` 级小节之间用独立成行的 `---` 分隔。
- [ ] 代码块语法合法（`tsx` 块会被 twoslash 编译），没有手写多余的 `twoslash` meta。
- [ ] 没有直接编辑 `skills/**`。

发布前本地核对：

```bash
npm run docs   # 预览注入后的页面：Demo / Type Declarations / Source / 反引号函数名链接
npm run lint   # markdown 与代码风格
```

