import { useRef } from 'react'

/**
 * A list of collected refs with an attached `set(el)` collector callback — the React counterpart of
 * upstream's `TemplateRefsList<T> = T[] & { set }`.
 */
export type TemplateRefsList<T> = T[] & {
  set: (el: T | null) => void
}

/**
 * Creates the stable, per-instance refs list: an array with the `set` collector attached.
 * `refs.set` is the same function across re-renders, so it can be stored or passed around like
 * upstream's `refs.set`.
 */
function createRefsList<T>(): TemplateRefsList<T> {
  const refs = [] as unknown as TemplateRefsList<T>
  const set = (el: T | null): void => {
    // upstream `set(el)` is a no-op on `null` (`if (el) push`) — React hands
    // `null` to ref callbacks when an element unmounts or whenever the
    // callback identity changes. `null` is never collected: the list is reset
    // before each commit re-collects it (see `useRefsList`), so it always
    // holds exactly the elements that are currently mounted. The identity
    // check additionally absorbs React StrictMode's double-invoked attach
    // (the same element is handed to the callback twice while mounting in
    // dev), which would otherwise duplicate the element.
    if (el && !refs.includes(el))
      refs.push(el)
  }
  refs.set = set
  return refs
}

/**
 * Map from @vueuse/core `useTemplateRefsList`
 * (`source/vueuse/packages/core/useTemplateRefsList/`). Shorthand for
 * collecting refs to elements rendered inside a list — the `v-for` `:ref` binding helper.
 *
 * React adaptation:
 *
 * - Vue returns a single readonly `Ref` of an array-with-`set` bound as
 *   `:ref="refs.set"` inside `v-for`; React binds ref callbacks instead, so
 *   the hook returns the very same array-with-`set` — `TemplateRefsList<T>`,
 *   a plain `T[]` carrying the `set(el)` collector on itself. Bind it as
 *   `ref={el => refs.set(el)}` while mapping the list;
 * - `refs` is a stable container: it is created once on the first render and
 *   its identity is preserved across re-renders (a ref-like container, not
 *   state) — mutating it never schedules a re-render, so read the collected
 *   elements after the commit (an effect) or via an explicit re-render
 *   trigger;
 * - `set` ignores `null`, mirroring upstream's `if (el) push` — the list
 *   never contains null slots;
 * - upstream resets the list before every update (`onBeforeUpdate`); the port
 *   mirrors it by clearing the list during each render, and the ref callbacks
 *   of the currently-mounted elements re-populate it in the following commit.
 *   Because of that, ref callbacks MUST be inline (a new function identity
 *   per render) — React only re-invokes a ref callback when its identity
 *   changes, so a stable `ref={refs.set}` would not re-collect after a
 *   re-render. `refs.length` therefore always equals the live element count
 *   after a commit, and no manual reset (`refs.length = 0`) is needed — in
 *   fact it must NOT be done: ref callbacks never re-fire for already-mounted
 *   elements, so a manual reset would leave the list empty;
 * - upstream's `Ref<Readonly<TemplateRefsList<T>>>` immutability does not
 *   apply: React consumers hold the array identity directly, so the port
 *   returns the mutable `TemplateRefsList<T>` itself.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const refs = useRefsList<HTMLLIElement>()
 *
 * items.map((item) => (
 *   <li key={item} ref={el => refs.set(el)}>{item}</li>
 * ))
 *
 * refs.length // number of currently mounted `<li>` elements (after commit)
 * refs[0] // first `<li>` element
 */
export function useRefsList<T = Element>(): TemplateRefsList<T> {
  const refsRef = useRef<TemplateRefsList<T> | null>(null)
  if (refsRef.current === null)
    refsRef.current = createRefsList<T>()

  const refs = refsRef.current

  // upstream resets the list before every update (`onBeforeUpdate(() => {
  // refs.value.length = 0 })`) so `refs.length` always equals the number of
  // live elements; React has no equivalent hook, so mirror it during render —
  // the (inline) ref callbacks of the mounted elements re-populate the list
  // during the following commit.
  refs.length = 0

  return refs
}
