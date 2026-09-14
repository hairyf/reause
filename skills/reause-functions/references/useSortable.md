---
category: '@Integrations'
---

# useSortable

Wrapper for [`sortablejs`](https://github.com/SortableJS/Sortable).

For more information on what options can be passed, see [`Sortable.options`](https://github.com/SortableJS/Sortable#options) in the `Sortable` documentation.

::: warning
Currently, `useSortable` only implements drag-and-drop sorting for a single list.
:::

## Install

```bash
npm i sortablejs@^1
```

## Usage

### Use template ref

```tsx
import { useSortable } from '@reause/integrations'
import { useRef, useState } from 'react'

function Component() {
  const [list, setList] = useState(['a', 'b', 'c'])
  const el = useRef<HTMLDivElement>(null)

  const { start, stop, option } = useSortable(el, list, {
    // the reordered array is handed back instead of mutating `list`
    onUpdate: newList => setList(newList),
  })

  return (
    <div ref={el}>
      {list.map(item => (
        <div key={item}>{item}</div>
      ))}
    </div>
  )
}
```

### Use specifies the selector to operate on

```tsx
const { option } = useSortable(el, list, {
  handle: '.handle',
  // or option set
  // animation
})

// You can use the option method to set and get the option of Sortable
option('animation', 150)
// option('animation') // 150
```

### Use a selector to get the root element

```tsx
const { start, stop } = useSortable('#my-list', list, {
  onUpdate: newList => setList(newList),
})
```

### Watch Element Changes

With `watchElement: true` the instance is destroyed and re-created whenever the resolved element
changes; with the default `watchElement: false` the instance follows the element that was resolved on
mount, and `start()` re-queries the target.

```tsx
const el = useRef<HTMLDivElement>(null)
const { start } = useSortable(el, list, { watchElement: true })
```

### Custom Update Handler

If you want to handle the `onUpdate` yourself, you can pass in `onUpdate` parameters, and we also exposed a function to move the item position.

```tsx
useSortable(el, list, {
  onUpdate: (newList, event) => {
    // do something
    setList(newList)
  },
})
```

### Return Values

| Property | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| `start`  | Initialize the Sortable instance (called automatically on mount) |
| `stop`   | Destroy the Sortable instance                                    |
| `option` | Get or set Sortable options at runtime                           |

```tsx
const { start, stop, option } = useSortable(el, list)

// Stop sorting
stop()

// Start sorting again
start()

// Get/set options
option('animation', 200) // set
const animation = option('animation') // get
```

### Helper Functions

The following helper functions are also exported:

| Function                                   | Description                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `moveArrayElement(list, from, to, event?)` | Move an element in an array from one index to another (returns a new array) |
| `insertNodeAt(parent, element, index)`     | Insert a DOM node at a specific index                                       |
| `removeNode(node)`                         | Remove a DOM node from its parent                                           |

## Type Declarations

```ts
/** Accepted DOM target kinds — mirrors upstream's `MaybeElement`. */
type MaybeElement = HTMLElement | SVGElement | null | undefined
/**
 * Target of the sortable container (upstream `MaybeRefOrGetter<MaybeElement>`). reause binds DOM
 * targets to a React ref object — a plain element, a getter and a callback ref are not accepted.
 */
type SortableTarget = RefObject<MaybeElement>
/**
 * React return type of `useSortable` — the method bag of upstream `UseSortableReturn` (issue §2B:
 * an object, not a tuple).
 */
export interface UseSortableReturn {
  /**
   * Create the sortablejs instance for the current target.
   *
   * No-op when an instance already exists (upstream `initSortable`).
   */
  start: () => void
  /**
   * Destroy the sortablejs instance.
   */
  stop: () => void
  /**
   * Options getter/setter, delegating to the instance's `option()`.
   *
   * @param name a `Sortable.Options` property.
   * @param value a value; omit it to read the current value.
   */
  option: (<K extends keyof Sortable.Options>(
    name: K,
    value: Sortable.Options[K],
  ) => void) &
    (<K extends keyof Sortable.Options>(name: K) => Sortable.Options[K])
}
/**
 * Options of `useSortable` — upstream `UseSortableOptions`, with `onUpdate` re-typed for React.
 *
 * is the internal handler that mutates the caller's array; here the hook never mutates `list`, so
 * `onUpdate` receives the reordered array instead (see `moveArrayElement`).
 */
export interface UseSortableOptions<T = unknown> extends Omit<
  Sortable.Options,
  "onUpdate"
> {
  /**
   * Watch the resolved element and automatically reinitialize Sortable when it changes.
   *
   * When `false` (default), Sortable is only initialized once on mount. You must manually call
   * `start()` if the element changes.
   *
   * When `true`, the instance is destroyed and re-created whenever the resolved element identity
   * changes (e.g. conditional rendering).
   *
   * @default false
   */
  watchElement?: boolean
  /**
   * Document used to resolve a selector-string target.
   *
   * @default document
   */
  document?: Document
  /**
   * Called after a drag reorder with the NEW array and the sortablejs event.
   *
   * React state is immutable, so the hook hands the reordered array to the caller instead of
   * mutating `list` in place. When no `onUpdate` is passed, sortablejs still moves the DOM nodes
   * while the array stays as-is — the component then re-renders from stale data and desyncs from
   * the DOM. Always store the new array, e.g. `onUpdate: newList => setList(newList)`.
   */
  onUpdate?: (newList: T[], event: Sortable.SortableEvent | null) => void
}
/**
 * Map from @vueuse/integrations `useSortable`
 * (`source/vueuse/packages/integrations/useSortable/`).
 *
 * @param el target element, React ref object (`{ current }`), or CSS selector
 * @param list current list items, in render order (never mutated)
 * @param options sortablejs options plus `watchElement` / `document` / `onUpdate`
 *
 * @__NO_SIDE_EFFECTS__
 * @see https://github.com/SortableJS/Sortable#options
 */
export declare function useSortable<T>(
  el: SortableTarget | string,
  list: T[],
  options?: UseSortableOptions<T>,
): UseSortableReturn
/**
 * Inserts an element into the DOM at a given index.
 * @param parentElement
 * @param element
 * @param {number} index
 * @see https://github.com/Alfred-Skyblue/vue-draggable-plus/blob/a3829222095e1949bf2c9a20979d7b5930e66f14/src/utils/index.ts#L81C1-L94C2
 */
export declare function insertNodeAt(
  parentElement: Element,
  element: Element,
  index: number,
): void
/**
 * Removes a node from the DOM.
 * @param {Node} node
 * @see https://github.com/Alfred-Skyblue/vue-draggable-plus/blob/a3829222095e1949bf2c9a20979d7b5930e66f14/src/utils/index.ts#L96C1-L102C2
 */
export declare function removeNode(node: Node): void
/**
 * Map from @vueuse/integrations `moveArrayElement`.
 *
 * @param list the current list — never mutated
 * @param from source index
 * @param to destination index
 * @param e the sortablejs event to apply the DOM fixup for, if any
 * @returns a new array with the element moved
 */
export declare function moveArrayElement<T>(
  list: T[],
  from: number,
  to: number,
  e?: Sortable.SortableEvent | null,
): T[]
```
