import type { Dispatch, RefObject, SetStateAction } from 'react'
import { deepEqual } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Options for `useTextareaAutosize`.
 */
export interface UseTextareaAutosizeOptions {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * Textarea element to autosize, as a React ref object (`RefObject`) — (a plain element, a getter
   * and a callback ref are not accepted). When omitted, bind the returned `textarea` ref instead.
   */
  element?: RefObject<HTMLTextAreaElement | null>
  /**
   * Textarea content. When omitted, the hook owns the content state and you update it through the
   * returned `setInput`.
   */
  input?: string
  /** Maximum autosized height in pixels. */
  maxHeight?: number
  /**
   * Values that should trigger a textarea resize when they change — the React mapping of upstream's
   * `watch` sources. Compared structurally with the shared `deepEqual` (functions by reference;
   * `Map` / `Set` / `Date` / `RegExp` by contents), so non-serializable values are supported. The
   * resize also fires once on mount (upstream `immediate: true`).
   */
  watch?: unknown[]
  /** Function called when the textarea size changes. */
  onResize?: () => void
  /**
   * Specify style target to apply the height based on textarea content, as a React ref object
   * (`RefObject`) — a plain element, a getter and a callback ref are not accepted. If not provided
   * it will use textarea itself.
   */
  styleTarget?: RefObject<HTMLElement | null>
  /**
   * Specify the style property that will be used to manipulate height. Can be `height | minHeight`.
   * Default value is `height`.
   */
  styleProp?: 'height' | 'minHeight'
}

export interface UseTextareaAutosizeReturn {
  /**
   * Current textarea content — the `input` option when provided, otherwise the hook-owned state.
   */
  readonly input: string
  /**
   * Content setter for the hook-owned state — the React mapping of upstream's writable `input` ref.
   * Has no effect on the resize while an `input` option is provided.
   */
  readonly setInput: Dispatch<SetStateAction<string>>
  /**
   * Ref to bind to the `<textarea>` — the `element` option when it is provided, otherwise a
   * hook-owned ref.
   */
  readonly textarea: RefObject<HTMLTextAreaElement | null>
  /** Manually trigger a textarea resize. */
  readonly triggerResize: () => void
}

/**
 * Call window.requestAnimationFrame(), if not available, just call the function
 */
function tryRequestAnimationFrame(window: Window | undefined, fn: () => void) {
  if (window && typeof window.requestAnimationFrame === 'function')
    window.requestAnimationFrame(fn)
  else
    fn()
}

/**
 * Map from @vueuse/core `useTextareaAutosize`
 * (`source/vueuse/packages/core/useTextareaAutosize/`) — automatically update
 * the height of a textarea depending on the content.
 *
 * React divergences:
 * - upstream returns `{ textarea, input, triggerResize }` with writable refs;
 *   this port returns the object `{ input, setInput, textarea, triggerResize }`
 *   — the content is a plain value paired with the `setInput` setter (the React
 *   mapping of upstream's writable `input` ref), and `textarea` stays an
 *   element ref;
 * - the `element` and `styleTarget` options take React ref objects
 *   (`RefObject`, read with the shared `unrefElement`); a plain element, a
 *   getter and a callback ref are not accepted. The textarea is resolved at
 *   commit time, so an element attached after mount (conditional or async
 *   render) still triggers the resize and the `ResizeObserver`;
 * - upstream's `watch([input, textarea], () => nextTick(triggerResize), {
 *   immediate: true })` and `watch(options.watch, triggerResize, { immediate:
 *   true, deep: true })` become one commit-time effect that resizes on mount
 *   and whenever the resolved element, the content or the `watch` values
 *   change — the mount resize therefore runs once, not twice;
 * - the `watch` values are compared with the shared structural `deepEqual`
 *   (functions by reference; `Map` / `Set` / `Date` / `RegExp` by contents)
 *   instead of a `JSON.stringify` key, so non-serializable values re-trigger;
 * - upstream's `useResizeObserver` composition becomes a self-contained `ResizeObserver` effect
 * that re-measures when the element's width changes.
 *
 * @example
 * const { input, setInput, textarea } = useTextareaAutosize()
 * // <textarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} />
 */
export function useTextareaAutosize(options: UseTextareaAutosizeOptions = {}): UseTextareaAutosizeReturn {
  const {
    element,
    input: inputOption,
    maxHeight,
    onResize,
    styleProp = 'height',
    styleTarget,
    watch,
    window: windowOption,
  } = options

  const [internalInput, setInternalInput] = useState('')
  const input = inputOption ?? internalInput

  const fallbackTextarea = useRef<HTMLTextAreaElement | null>(null)
  const textarea = element ?? fallbackTextarea

  // Latest option values — `triggerResize` and the commit-time resolver stay
  // referentially stable while still reading the newest options (upstream
  // captures them in setup and reads `maxHeight` / `styleTarget` lazily).
  const optionsRef = useRef({ element, maxHeight, onResize, styleProp, styleTarget })
  optionsRef.current = { element, maxHeight, onResize, styleProp, styleTarget }

  const textareaScrollHeightRef = useRef(1)
  const textareaOldWidthRef = useRef(0)

  // Resolve the target element at commit time (upstream resolves the reactive
  // `textarea` ref): the `element` ref's `.current` through `unrefElement`,
  // falling back to the hook-owned ref bound through the returned `textarea`.
  const resolveTextarea = useCallback(() => {
    return (optionsRef.current.element ? unrefElement(optionsRef.current.element) : undefined) ?? fallbackTextarea.current ?? null
  }, [])

  const triggerResize = useCallback(() => {
    const { maxHeight, onResize, styleProp, styleTarget } = optionsRef.current
    const textareaEl = resolveTextarea()
    if (!textareaEl)
      return

    let height = ''

    textareaEl.style[styleProp] = '1px'
    const scrollHeight = textareaEl.scrollHeight
    const previousScrollHeight = textareaScrollHeightRef.current
    textareaScrollHeightRef.current = scrollHeight
    const styleHeight = maxHeight != null
      ? `${Math.min(scrollHeight, maxHeight)}px`
      : `${scrollHeight}px`

    // If style target is provided update its height
    const target = styleTarget ? unrefElement(styleTarget) : undefined
    if (target)
      target.style[styleProp] = styleHeight
    // else update textarea's height by updating height variable
    else
      height = styleHeight

    textareaEl.style[styleProp] = height

    // upstream: watch(textareaScrollHeight, () => options?.onResize?.())
    if (scrollHeight !== previousScrollHeight)
      onResize?.()
  }, [resolveTextarea])

  // Track the resolved element so the resize and the ResizeObserver effects
  // re-run when a textarea is attached after mount (conditional / async
  // render). The first render resolves the already-attached element directly.
  const [resolvedTextarea, setResolvedTextarea] = useState<HTMLTextAreaElement | null>(() => (element ? unrefElement(element) : undefined) ?? null)

  useEffect(() => {
    const next = resolveTextarea()
    setResolvedTextarea(prev => (prev === next ? prev : next))
  })

  // upstream: watch([input, textarea], () => nextTick(triggerResize), { immediate: true })
  // merged with upstream's watch(options.watch, triggerResize, { immediate: true, deep: true })
  // so the mount resize runs once (upstream runs it twice when `watch` is provided).
  const previousTextareaRef = useRef<HTMLTextAreaElement | null | undefined>(undefined)
  const previousInputRef = useRef<string | undefined>(undefined)
  const previousWatchRef = useRef<unknown[] | undefined>(undefined)
  const firstRunRef = useRef(true)

  useEffect(() => {
    const firstRun = firstRunRef.current
    firstRunRef.current = false

    const elementChanged = previousTextareaRef.current !== resolvedTextarea
    const inputChanged = previousInputRef.current !== input
    const watchChanged = !deepEqual(previousWatchRef.current, watch)

    previousTextareaRef.current = resolvedTextarea
    previousInputRef.current = input
    previousWatchRef.current = watch

    if (firstRun || elementChanged || inputChanged || watchChanged)
      triggerResize()
  }, [resolvedTextarea, input, watch, triggerResize])

  // upstream: useResizeObserver(textarea, ...) — re-measure when the element's
  // width changes (e.g. responsive layouts)
  useEffect(() => {
    const win = windowOption ?? (typeof window === 'undefined' ? undefined : window)
    if (!win || !resolvedTextarea || !('ResizeObserver' in win))
      return

    const observer = new ResizeObserver((entries) => {
      const contentRect = entries[0]?.contentRect
      if (!contentRect || textareaOldWidthRef.current === contentRect.width)
        return

      tryRequestAnimationFrame(win, () => {
        textareaOldWidthRef.current = contentRect.width
        triggerResize()
      })
    })
    observer.observe(resolvedTextarea)

    return () => {
      observer.disconnect()
    }
  }, [resolvedTextarea, triggerResize, windowOption])

  return { input, setInput: setInternalInput, textarea, triggerResize }
}
