import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface UseStyleTagOptions {
  /**
   * Media query for styles to apply
   */
  media?: string

  /**
   * Load the style immediately
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Manual controls the timing of loading and unloading
   *
   * @default false
   */
  manual?: boolean

  /**
   * DOM id of the style tag
   *
   * @default auto-incremented (`reause_styletag_N`)
   */
  id?: string

  /**
   * Nonce value for CSP (Content Security Policy)
   *
   * @default undefined
   */
  nonce?: string

  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document
}

export type UseStyleTagReturn = readonly [
  /**
   * Current CSS text of the style tag — React state seeded by the initial `css` argument.
   */
  css: string,
  /**
   * Update the CSS text of the style tag — `setCss('...')` or `setCss(prev => '...')`. Updates the
   * live `<style>` element while loaded, and is stored for the next `load()` otherwise. Upstream:
   * `css.value = '...'`.
   */
  setCss: Dispatch<SetStateAction<string>>,
  controls: {
    /**
     * DOM id of the style tag
     */
    id: string
    /**
     * Inject the style tag into `document.head` (no-op when already loaded)
     */
    load: () => void
    /**
     * Remove the style tag from `document.head` (reference-counted, so style tags shared by id are
     * only removed with the last unloaded instance)
     */
    unload: () => void
    /**
     * Whether the style tag is currently injected
     */
    isLoaded: boolean
  },
]

let _id = 0
const _refCount = new WeakMap<HTMLStyleElement, number>()

/**
 * Map from @vueuse/core `useStyleTag`
 * (`source/vueuse/packages/core/useStyleTag/`). Injects a `<style>` element
 * into `document.head` and keeps its text in sync with the given CSS.
 *
 * React divergences:
 * - the return is a React tuple `[css, setCss, { id, load, unload, isLoaded }]` instead of
 * upstream's object `{ id, css: ShallowRef<string>, load, unload, isLoaded }` — `css` is plain
 * state and `setCss` replaces it with the React immutable-update protocol, `setCss('...')` or
 * `setCss(prev => '...')`. The `controls` object keeps a stable identity while `load`, `unload` and
 * `isLoaded` are unchanged;
 * - the initial `css` argument seeds that state once, like upstream's
 *   `shallowRef(css)`; later updates go through `setCss`;
 * - the `isLoaded` ref return becomes a plain boolean state;
 * - an initial `el.textContent` write in `load()` plus direct writes from `setCss` while loaded;
 * - `tryOnMounted(load)` / `tryOnScopeDispose(unload)` become a mount
 *   `useEffect` whose cleanup calls `unload` (skipped with `manual: true`);
 * - SSR-safe: `document` is only touched inside the mount effect and the
 *   callbacks, never during render — with no `document` available `load()`
 *   and `unload()` are no-ops (upstream's `defaultDocument` guard);
 * - auto-generated ids use the `reause_styletag_` prefix.
 *
 * @example
 * const [css, setCss, { id, load, unload, isLoaded }] = useStyleTag('.foo { margin-top: 32px; }')
 * setCss('.foo { margin-top: 64px; }') // updates the injected <style>
 * setCss(prev => `${prev}\n.foo { margin-top: 96px; }`) // functional update
 */
export function useStyleTag(
  css: string,
  options: UseStyleTagOptions = {},
): UseStyleTagReturn {
  const [cssValue, setCssValue] = useState(css)
  const [isLoaded, setIsLoaded] = useState(false)

  // auto-generated id is produced by a lazy state initializer, so the module
  // counter only advances once per mounted instance — never during a render
  // that is later discarded (upstream assigns eagerly at setup: `id =
  // \`vueuse_styletag_${++_id}\``)
  const [id] = useState(() => options.id ?? `reause_styletag_${++_id}`)

  // latest-value refs (repo idiom, see useStateManualHistory) so `load`,
  // `unload` and `setCss` stay stable callbacks that always read the newest
  // values; `isLoadedRef` guards the ref-counting against stale state
  const cssRef = useRef(cssValue)
  const isLoadedRef = useRef(false)
  const optionsRef = useRef(options)
  cssRef.current = cssValue
  optionsRef.current = options

  const resolveDocument = useCallback(() => {
    const doc = optionsRef.current.document
    if (doc)
      return doc
    return typeof document === 'undefined' ? undefined : document
  }, [])

  const load = useCallback(() => {
    const doc = resolveDocument()
    if (!doc)
      return

    const el = (doc.getElementById(id) || doc.createElement('style')) as HTMLStyleElement

    if (!el.isConnected) {
      el.id = id
      if (optionsRef.current.nonce)
        el.nonce = optionsRef.current.nonce
      if (optionsRef.current.media)
        el.media = optionsRef.current.media
      doc.head.appendChild(el)
    }

    if (isLoadedRef.current)
      return

    _refCount.set(el, (_refCount.get(el) ?? 0) + 1)

    // upstream: watch(cssRef, el.textContent = value, { immediate: true }) —
    // the immediate write happens here; later writes go through `setCss`
    el.textContent = cssRef.current
    isLoadedRef.current = true
    setIsLoaded(true)
  }, [id, resolveDocument])

  const unload = useCallback(() => {
    const doc = resolveDocument()
    if (!doc || !isLoadedRef.current)
      return

    const el = doc.getElementById(id) as HTMLStyleElement | null
    if (el) {
      const count = (_refCount.get(el) ?? 1) - 1
      if (count <= 0) {
        _refCount.delete(el)
        doc.head.removeChild(el)
      }
      else {
        _refCount.set(el, count)
      }
    }

    isLoadedRef.current = false
    setIsLoaded(false)
  }, [id, resolveDocument])

  const setCss = useCallback<Dispatch<SetStateAction<string>>>((action) => {
    const prev = cssRef.current
    const next = typeof action === 'function' ? action(prev) : action
    cssRef.current = next
    setCssValue(next)
    if (!isLoadedRef.current)
      return
    const doc = resolveDocument()
    const el = doc?.getElementById(id)
    if (el)
      el.textContent = next
  }, [id, resolveDocument])

  useEffect(() => {
    const { immediate = true, manual = false } = optionsRef.current
    if (immediate && !manual)
      load()
    return () => {
      if (!manual)
        unload()
    }
  }, [load, unload])

  // stable controls object — new identity only when its members change
  const controls = useMemo(() => ({ id, load, unload, isLoaded }), [id, load, unload, isLoaded])

  return [cssValue, setCss, controls]
}
