---
category: State
---

# useList

Tracks an array and returns it with a stable set of immutable mutators — React port of react-use's `useList`.

## Usage

```tsx
import { useList } from '@reause/shared'

const [list, { push, updateAt, upsert, sort, filter, removeAt, clear, reset }] = useList([1, 2, 3])

push(4) // [1, 2, 3, 4]
updateAt(0, 9) // [9, 2, 3, 4]
upsert(item => item === 2, 7) // replaces the match → [9, 7, 3, 4]; pushes the item when nothing matches
sort((a, b) => b - a) // [9, 7, 4, 3]
filter(item => item > 3) // [9, 7, 4]
removeAt(0) // [7, 4]
clear() // []
reset() // [1, 2, 3]
```

`list` is the current array and every action both stores the new array and re-renders the component, so mutate the list through the actions rather than in place. The full action set is `set`, `push`, `updateAt`, `insertAt`, `update`, `updateFirst`, `upsert`, `sort`, `filter`, `removeAt`, `remove`, `clear` and `reset` — react-use's own names and parameter lists. `remove` is upstream's deprecated alias of `removeAt` and is kept as the very same function reference (`remove === removeAt`); prefer `removeAt`. `set` accepts a value, a `prev => next` updater or a `() => next` factory, resolved exactly as react-use's `resolveHookState` resolves them. react-use's standalone `useUpsert` is deliberately not ported — upstream deprecates it in favour of `useList`'s `upsert`.

**The actions object never changes identity.** The list itself lives in a `useRef` and each action writes the resolved next list into that ref and then asks `@reause/shared`'s `useUpdate` for a re-render, while the action object is built once in a `useMemo(…, [])` whose dependencies are literally empty. That is the port's action-identity contract, and it has two visible consequences: the actions are safe to pass to children or to leave out of a `useEffect` dependency array, and two actions sequenced inside one handler observe each other — `set([1, 2, 3, 4])` followed immediately by `upsert(v => v === 4, 9)` yields `[1, 2, 3, 9]`, because `upsert` reads the ref the `set` just wrote rather than the array React has not re-rendered yet. The two re-render requests are batched by React into a single render.

`initialList` may also be a factory, `useList(() => [1, 2, 3])`, and it is read only on the first render: a later change to the argument is ignored, and `reset` restores that first value (upstream's memoised behaviour). Upstream does not copy it, so on the first render the returned `list` **is** the array you passed in; pass a factory or a spread if you mutate your own array. `filter` mirrors upstream's declared action type — a type-predicate callback compiles but cannot narrow the list, which stays `T[]`.

Ported from react-use's `source/react-use/src/useList.ts` (157 LOC including `ListActions`, its `source/react-use/src/misc/hookState.ts` state actions and its `source/react-use/tests/useList.test.ts`). Upstream exports it as the default; reause exports the hook and its types by name. The pin's docs page `source/react-use/docs/useList.md` was read from the checkout; no URL was fetched while writing this page.
