# reause 开发规范

> 自动化流水线 SOP（子代理执行 / 上游监控 / Issues 监控 / PR 合并 / Nightly Release / 编排）见 [docs/orchestration.md](docs/orchestration.md)。
> 文档写作规范（`packages/**/index.md`、指南、Skills 生成物边界）见 [docs/writing-docs.md](docs/writing-docs.md)。

## 1. 来源判定与命名规范

### 1.1 来源分类与镜像策略

| 来源分类       | 代表库    | 镜像策略     | 命名与解构风格                                                                                                              |
| :------------- | :-------- | :----------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Vue 体系**   | VueUse    | 转换适配     | `ref*` → `useState*`；`on*` → `use*`；`use*RefHistory` → `useState*History`<br/>其余优先 React 数组解构，多可写值使用对象。 |
| **React 体系** | react-use | **直接镜像** | 完全保持上游原生 React 的 API 命名、参数类型与返回值结构。                                                                  |

> **“直接镜像”的边界**：参数类型以 §2 的绑定标准为准，**不得**用 §1.1 的镜像规则放宽类型；命名、返回值结构与整体语义仍按上游镜像（个别 Hook 有意偏离处，在各自 JSDoc 里写明）。
> 例如上游 ahooks `useClickAway` 的目标参数是 `BasicTarget | BasicTarget[]`，reause 侧收窄为 §2 规定的 `RefObject<T | null>` 或元素类型一致的 `RefObject<T | null>[]`，异构目标数组仍不支持——这是**参数类型收窄**，不是偏离镜像规则。

### 1.2 VueUse 侧命名转换细节

- **命名映射**：`ref*` → `useState*`；`on*` → `use*`；`use*RefHistory` → `useState*History`。
- **上游兼容**：JSDoc、Target、Map from 等位置保留上游原名；reause 内部实现、路径、标题统一步骤改用新名。
- **返回值风格**：
  - `useState*History` 系列：返回**对象结构**（如 `const { history, undo, redo } = useStateHistory([state, setState])`）。
  - 其他 VueUse 转换 Hook：统一采用 **React 数组解构**（如 `const [val, setVal, control] = useStateWithControl(0)`）。
- **异常处理**：若需求不符合上述命名或返回值规范，直接**抛回给父代理**，严禁自行臆测修改。

## 2. 绑定标准

- **参数类型**：
  - **只读 value-source 参数**：仅接受纯类型 `T`（严禁 `RefObject` / `RefOrValue` / `State<T>` / getter）。
  - **内部写入参数**：仅接受 `State<T>`（纯值、getter、`[value, setter]` 元组或 `{ value, onChange }` 对，**不含** ref）。
  - **DOM Hook 参数**：单个目标仅接受 React 原生 `RefObject<T | null>`（禁止纯元素、getter、callback ref）。
    - ref 只是 DOM 句柄，读取一律走 `unrefElement`（`@reause/core`）；`toValue` **不再解析 ref**，也不接受 `RefObject`。
    - **多目标**：接受**元素类型一致的**数组——`RefObject<T | null>[]`、`RefObject<T[] | null>` 都只是同一规则的不同写法，判定标准只有一条：数组里每个元素的类型必须相同（`T` 为元素类型）。既有别名 `ElementTarget<T>` / `ElementTargetOrArray<T>`（`@reause/core`）就是这套写法。
      异构目标数组（如 `[buttonRef, divRef]`，元素类型不同）**刻意不支持**，也不会通过类型检查；需要宽元素类型时由调用方自行收窄或包装成同一 `T`。
      与 §1.1 的分工：本节的 DOM 目标类型规则**优先于** §1.1 的直接镜像——上游 DOM 目标类型更宽时按本条收窄，这属于参数类型收窄、不算偏离镜像规则；其余（命名、返回值结构）仍按 §1.1 镜像。
- **返回值约束（VueUse 转换类）**：
  - **≥2 个可写值**：返回对象，镜像 VueUse 结构，每个可写值配对专属 setter（如 `useDraggable` → `{ x, setX, y, setY }`）。
  - **恰 1 个可写值**：纯单值返回元组 `[value, setValue, otherObject]`；富记录/异步状态/DOM ref 返回对象 + 配对 setter。
  - **0 个可写值**：结构与命名默认镜像 VueUse（如 `useShare`）；剪贴板两件套 `useClipboard` / `useClipboardItems` 例外，返回元组 `[value, action, { ...只读成员 }]`（如 `useClipboard` → `[text, copy, { copied, isSupported, copyPending }]`）。
- **返回值约束（react-use 等原生 React 类）**：
  - **完全保持上游设计**：如上游返回元组/对象/函数，直接保持一致，不做强制改写。
- **文档镜像**：
  - VueUse 源：镜像上游 `index.md` 结构，替换关键词（`ref` → `controllable state`）。
  - react-use\其他源：参考上游 README/文档改写为 reause 标准 markdown。
  - React 特有差异仅在 JSDoc 中写明，严禁自造章节。
- **质量底线**：CI 必须 100% 绿（允许 flaky 测试重跑一次）。
