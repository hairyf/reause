import type { RefObject } from 'react'
import type Sortable from 'sortablejs'
import { unrefElement } from '@reause/core'
import { useCallback, useEffect, useRef } from 'react'
import SortableJs from 'sortablejs'

/** Accepted DOM target kinds — mirrors upstream's `MaybeElement`. */
type MaybeElement = HTMLElement | SVGElement | null | undefined

/**
 * Target of the sortable container (upstream `MaybeRefOrGetter<MaybeElement>`). reause binds DOM
 * targets to a React ref object — a plain element, a getter and a callback ref are not accepted.
 */
type SortableTarget = RefObject<MaybeElement>

/**
 * Resolve a target to a DOM element, or `null` when it cannot be resolved. Upstream resolves
 * elements with `unrefElement` (`@vueuse/core`); the React port calls the same `unrefElement`
 * (`@reause/core`) on the target ref.
 */
function resolveElement(value: SortableTarget): HTMLElement | SVGElement | null {
  const el = unrefElement(value)
  if (el instanceof HTMLElement || el instanceof SVGElement)
    return el

  return null
}

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
  option: (<K extends keyof Sortable.Options>(name: K, value: Sortable.Options[K]) => void) & (<K extends keyof Sortable.Options>(name: K) => Sortable.Options[K])
}

/**
 * Options of `useSortable` — upstream `UseSortableOptions`, with `onUpdate` re-typed for React.
 *
 * is the internal handler that mutates the caller's array; here the hook never mutates `list`, so
 * `onUpdate` receives the reordered array instead (see `moveArrayElement`).
 */
export interface UseSortableOptions<T = unknown> extends Omit<Sortable.Options, 'onUpdate'> {
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
 * React port of VueUse's `useSortable` — wrapper for
 * [`sortablejs`](https://github.com/SortableJS/Sortable).
 *
 * Map from @vueuse/integrations `useSortable`
 * (`source/vueuse/packages/integrations/useSortable/`), a reactive wrapper
 * around the `sortablejs` package.
 *
 * React divergences: the list is **immutable**. Upstream's `moveArrayElement` mutates the caller's
 * array in place (deferring the splice through `nextTick` when the list is a ref), which cannot
 * work in React — an in-place mutation does not re-render. The reause `moveArrayElement(list, from,
 * to, e)` is pure: it returns a NEW reordered array (and still performs upstream's DOM fixup when
 * an event is given), and the hook forwards that array to `options.onUpdate`.
 *
 * React divergences: sortablejs manipulates DOM nodes directly, so the component must be a
 * controlled list that re-renders from `onUpdate` — stable `key`s recommended — otherwise React and
 * the DOM desync. Upstream's `onMounted` maps to a mount effect, `onScopeDispose` to the effect
 * cleanup, and `watchElement` to an effect keyed on the resolved element identity.
 *
 * @param el target element, React ref object (`{ current }`), or CSS selector
 * @param list current list items, in render order (never mutated)
 * @param options sortablejs options plus `watchElement` / `document` / `onUpdate`
 *
 * @__NO_SIDE_EFFECTS__
 * @see https://github.com/SortableJS/Sortable#options
 */
export function useSortable<T>(
  el: SortableTarget | string,
  list: T[],
  options: UseSortableOptions<T> = {},
): UseSortableReturn {
  const { document = globalThis.document, watchElement = false, onUpdate, ...resetOptions } = options

  const instanceRef = useRef<Sortable | undefined>(undefined)
  // the default `onUpdate` handler is created once, so it reads the current
  // list/callback/options from refs instead of closing over a stale render
  const listRef = useRef(list)
  const onUpdateRef = useRef(onUpdate)
  const optionsRef = useRef(resetOptions)

  listRef.current = list
  onUpdateRef.current = onUpdate
  optionsRef.current = resetOptions

  const cleanup = useCallback(() => {
    instanceRef.current?.destroy()
    instanceRef.current = undefined
  }, [])

  const initSortable = useCallback((target: Element) => {
    if (!target || instanceRef.current !== undefined)
      return

    const defaultOptions: Sortable.Options = {
      onUpdate: (e) => {
        const newList = moveArrayElement(listRef.current, e.oldIndex!, e.newIndex!, e)
        onUpdateRef.current?.(newList, e)
      },
    }

    instanceRef.current = new SortableJs(target as HTMLElement, { ...defaultOptions, ...optionsRef.current })
  }, [])

  const start = useCallback(() => {
    const target = typeof el === 'string' ? document?.querySelector(el) : resolveElement(el)
    if (target)
      initSortable(target)
  }, [document, el, initSortable])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  const option = useCallback(<K extends keyof Sortable.Options>(name: K, value?: Sortable.Options[K]) => {
    if (value !== undefined)
      instanceRef.current?.option(name, value)
    else
      return instanceRef.current?.option(name)
  }, []) as UseSortableReturn['option']

  // Resolve the target on every render: a ref-like object (`{ current }`) can
  // point at a different element after a re-render, and only a per-render
  // resolution lets the watch effect below react to the swap (upstream watches
  // `() => unrefElement(el)`).
  const resolved = typeof el === 'string' ? el : resolveElement(el)

  // watchElement: re-initialize whenever the RESOLVED element changes
  // (upstream `watch(() => unrefElement(el), ..., { immediate: true, flush: 'post' })`).
  // The returned cleanup also destroys the instance on unmount, so no instance
  // leaks when the resolved element never changes.
  useEffect(() => {
    if (!watchElement || typeof resolved === 'string')
      return
    cleanup()
    if (resolved)
      initSortable(resolved)
    return cleanup
  }, [cleanup, initSortable, resolved, watchElement])

  // default (and string + watchElement, which upstream routes into
  // `tryOnMounted(start)`): initialize once on mount (upstream
  // `tryOnMounted(start)`), destroy on unmount (upstream `tryOnScopeDispose`).
  // Keyed on the `el` identity, so a ref-like object whose `.current` swaps
  // keeps the instance on the element resolved at mount — `start()` re-queries
  // the target manually (upstream persist behavior).
  useEffect(() => {
    if (watchElement && typeof el !== 'string')
      return
    start()
    return cleanup
  }, [cleanup, start, watchElement, el])

  return {
    start,
    stop,
    option,
  }
}

/**
 * Inserts an element into the DOM at a given index.
 * @param parentElement
 * @param element
 * @param {number} index
 * @see https://github.com/Alfred-Skyblue/vue-draggable-plus/blob/a3829222095e1949bf2c9a20979d7b5930e66f14/src/utils/index.ts#L81C1-L94C2
 */
export function insertNodeAt(
  parentElement: Element,
  element: Element,
  index: number,
) {
  const refElement = parentElement.children[index]
  parentElement.insertBefore(element, refElement)
}

/**
 * Removes a node from the DOM.
 * @param {Node} node
 * @see https://github.com/Alfred-Skyblue/vue-draggable-plus/blob/a3829222095e1949bf2c9a20979d7b5930e66f14/src/utils/index.ts#L96C1-L102C2
 */
export function removeNode(node: Node) {
  if (node.parentNode)
    node.parentNode.removeChild(node)
}

/**
 * Move an element of `list` from `from` to `to`, returning a NEW array.
 *
 * Map from @vueuse/integrations `moveArrayElement` — the helper module
 * (`source/vueuse/packages/integrations/useSortable/`) shares its directory
 * with the `useSortable` hook ported above. With one deliberate deviation: upstream mutates the
 * caller's array in place (and defers the splice with `nextTick` when the list is a ref), which
 * cannot work in React — an in-place mutation does not re-render. This implementation is pure: the
 * input array is never mutated and the moved copy is returned. The move only happens when `to` is
 * in range (`to >= 0 && to < list.length`, exactly upstream's bounds check); otherwise a copy of
 * `list` is returned unchanged.
 *
 * The DOM fixup of upstream is kept for compatibility: when `e` is given (a sortablejs event),
 * `e.item` is removed from the DOM and re-inserted at `from` inside `e.from`. That fixup runs
 * regardless of the bounds check, as upstream does — note the upstream quirk of inserting at `from`
 * rather than `to`. Pass `null` (or omit `e`) to only compute the array.
 *
 * @param list the current list — never mutated
 * @param from source index
 * @param to destination index
 * @param e the sortablejs event to apply the DOM fixup for, if any
 * @returns a new array with the element moved
 */
export function moveArrayElement<T>(
  list: T[],
  from: number,
  to: number,
  e?: Sortable.SortableEvent | null,
): T[] {
  if (e != null) {
    removeNode(e.item)
    insertNodeAt(e.from, e.item, from)
  }

  const array = [...list]

  if (to >= 0 && to < array.length) {
    const element = array.splice(from, 1)[0]
    array.splice(to, 0, element)
  }

  return array
}
