import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useEventListener } from '../useEventListener'

/**
 * Element on which fullscreen is requested — a React ref object (`RefObject`) holding the element
 * (or `null` / `undefined` while it is not available yet).
 */
export type FullscreenTarget = RefObject<HTMLElement | SVGElement | null | undefined>

export interface UseFullscreenOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document

  /**
   * Automatically exit fullscreen when the component is unmounted.
   *
   * @default false
   */
  autoExit?: boolean
}

export interface UseFullscreenReturn {
  /**
   * If the Fullscreen API is supported by the current browser.
   */
  isSupported: boolean

  /**
   * Whether the target element (or `document.documentElement` when no target is given) is currently
   * displayed in fullscreen mode.
   */
  isFullscreen: boolean

  /**
   * Request fullscreen on the target element.
   */
  enter: () => Promise<void>

  /**
   * Exit fullscreen mode.
   */
  exit: () => Promise<void>

  /**
   * Toggle between entering and exiting fullscreen mode.
   */
  toggle: () => Promise<void>
}

// Upstream listens for the standard event plus the vendor-prefixed variants.
const eventHandlers: string[] = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'webkitendfullscreen',
  'mozfullscreenchange',
  'MSFullscreenChange',
]

const listenerOptions: AddEventListenerOptions = { capture: false, passive: true }

// Vendor-prefixed method / property names, searched on `document` and the
// target element (upstream `computed` lists). The found result is cast to the
// standard name for typing — the runtime value is whatever the browser
// actually exposes.
const requestMethods = [
  'requestFullscreen',
  'webkitRequestFullscreen',
  'webkitEnterFullscreen',
  'webkitEnterFullScreen',
  'webkitRequestFullScreen',
  'mozRequestFullScreen',
  'msRequestFullscreen',
]

const exitMethods = [
  'exitFullscreen',
  'webkitExitFullscreen',
  'webkitExitFullScreen',
  'webkitCancelFullScreen',
  'mozCancelFullScreen',
  'msExitFullscreen',
]

const fullscreenEnabledProps = [
  'fullScreen',
  'webkitIsFullScreen',
  'webkitDisplayingFullscreen',
  'mozFullScreen',
  'msFullscreenElement',
]

const fullscreenElementProps = [
  'fullscreenElement',
  'webkitFullscreenElement',
  'mozFullScreenElement',
  'msFullscreenElement',
]

interface ResolvedFullscreenState {
  doc: Document | undefined
  target: HTMLElement | SVGElement | null | undefined
  requestMethod: 'requestFullscreen' | undefined
  exitMethod: 'exitFullscreen' | undefined
  fullscreenEnabled: 'fullscreenEnabled' | undefined
  fullscreenElementMethod: 'fullscreenElement' | undefined
}

function resolveFullscreenState(
  target: HTMLElement | SVGElement | null | undefined,
  doc: Document | undefined,
): ResolvedFullscreenState {
  return {
    doc,
    target,
    requestMethod: requestMethods.find(m => (doc && m in doc) || (target && m in target)) as 'requestFullscreen' | undefined,
    exitMethod: exitMethods.find(m => (doc && m in doc) || (target && m in target)) as 'exitFullscreen' | undefined,
    fullscreenEnabled: fullscreenEnabledProps.find(m => (doc && m in doc) || (target && m in target)) as 'fullscreenEnabled' | undefined,
    fullscreenElementMethod: fullscreenElementProps.find(m => (doc && m in doc)) as 'fullscreenElement' | undefined,
  }
}

function isSupportedState(state: ResolvedFullscreenState): boolean {
  return Boolean(
    state.doc
    && state.target
    && state.requestMethod
    && state.exitMethod
    && state.fullscreenEnabled,
  )
}

/**
 * The browser's current fullscreen state for the resolved element — the document-level flag first,
 * with the prefixed per-target fallback for WebKit / iOS Safari (upstream reads
 * `document[fullscreenEnabled]` then `target[fullscreenEnabled]`).
 */
function isElementFullScreen(state: ResolvedFullscreenState): boolean {
  const { doc, target, fullscreenEnabled } = state
  if (!fullscreenEnabled)
    return false

  const docValue = doc?.[fullscreenEnabled]
  if (docValue != null)
    return docValue

  const targetValue = (target as unknown as Record<string, unknown> | null | undefined)?.[fullscreenEnabled]
  if (targetValue != null)
    return Boolean(targetValue)

  return false
}

/**
 * Whether the resolved element is the current fullscreen element (only when the browser exposes
 * `document.fullscreenElement`).
 */
function isCurrentElementFullScreen(state: ResolvedFullscreenState): boolean {
  const { doc, target, fullscreenElementMethod } = state
  if (fullscreenElementMethod)
    return doc?.[fullscreenElementMethod] === target
  return false
}

/**
 * Looks up a (possibly vendor-prefixed) fullscreen method on an object and binds it to that object
 * so the browser receives the correct `this`.
 */
function getFullscreenMethod(obj: object, name: string): (() => Promise<void>) | undefined {
  const value = (obj as unknown as Record<string, unknown>)[name]
  if (typeof value !== 'function')
    return undefined
  return (value as () => Promise<void>).bind(obj)
}

/**
 * Reactive Fullscreen API — React port of VueUse's `useFullscreen`.
 *
 * Map from @vueuse/core `useFullscreen`
 * (`source/vueuse/packages/core/useFullscreen/`). Adds methods to present a
 * specific element (and its descendants) in fullscreen mode, and to exit fullscreen mode once it is
 * no longer needed. The target defaults to `document.documentElement`, and some platforms (like iOS
 * Safari) only allow fullscreen on video elements.
 *
 * React divergences:
 * - upstream returns `isSupported` (`computed`) and `isFullscreen`
 *   (`shallowRef`) as reactive refs; here they are plain boolean states —
 *   `isSupported` resolves in a mount effect (SSR renders `false`) and
 *   `isFullscreen` follows the `fullscreenchange` events and the `enter` /
 *   `exit` calls;
 * - the `enter` / `exit` / `toggle` functions are stable `useCallback`s that
 *   read the latest resolved element, `document` and method names from a ref
 *   the way upstream reads its refs at call time;
 * - the vendor-prefixed method detection re-resolves in an effect whenever
 *   the resolved target or the `document` option changes (upstream
 *   `computed`), and the fullscreenchange listeners re-bind when the resolved
 *   target changes (upstream `useEventListener(() => unrefElement(targetRef))`);
 * - `tryOnMounted(handlerCallback)` becomes the same effect adopting the
 *   browser's current fullscreen state after mount, and
 *   `tryOnScopeDispose(exit)` with `autoExit` becomes an unmount cleanup (the
 *   option is read once at mount, as upstream destructures it at setup);
 * - rendering never touches the DOM: the target is read from its ref's
 *   `.current` and the global `document` is only read through
 *   a guarded `typeof document === 'undefined'` check, so server rendering is
 *   safe and the state keeps its defaults until the mount effect;
 * - the component variant (`UseFullscreen` render-slot component) is not
 *   ported — React uses the hook directly.
 *
 * @example
 * const el = useRef<HTMLVideoElement>(null)
 * const { isFullscreen, enter, exit, toggle } = useFullscreen(el)
 */
export function useFullscreen(
  target?: FullscreenTarget,
  options: UseFullscreenOptions = {},
): UseFullscreenReturn {
  const {
    document: documentOption,
    autoExit = false,
  } = options

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  // Sync mirrors of the state above, read inside the stable callbacks
  // (upstream mutates and reads its refs directly; React state only drives
  // renders).
  const isFullscreenRef = useRef(false)
  const supportedRef = useRef(false)
  const stateRef = useRef<ResolvedFullscreenState | null>(null)

  // Resolve the document and unwrap the target during render — a pure unwrap
  // plus a guarded global read (undefined on the server). The
  // `document.documentElement` fallback (upstream default) is applied inside
  // the effect below, so a not-yet-populated `useRef(null)` never resolves to
  // the document root during render.
  const doc = documentOption ?? (typeof document === 'undefined' ? undefined : document)
  const resolvedTarget = target ? unrefElement(target) : undefined

  const applyFullscreenState = useCallback((state: ResolvedFullscreenState) => {
    const isElementFullScreenValue = isElementFullScreen(state)
    if (!isElementFullScreenValue || (isElementFullScreenValue && isCurrentElementFullScreen(state))) {
      isFullscreenRef.current = isElementFullScreenValue
      setIsFullscreen(isElementFullScreenValue)
    }
  }, [])

  // Refresh the resolved state (method detection + `isSupported`) and adopt
  // the browser's current fullscreen state — upstream's reactive `computed` +
  // `tryOnMounted(handlerCallback)`.
  useEffect(() => {
    const effectiveTarget = resolvedTarget ?? doc?.documentElement
    const state = resolveFullscreenState(effectiveTarget, doc)
    stateRef.current = state
    supportedRef.current = isSupportedState(state)
    setIsSupported(supportedRef.current)
    applyFullscreenState(state)
  }, [applyFullscreenState, doc, resolvedTarget])

  const handler = useCallback(() => {
    const state = stateRef.current
    if (state)
      applyFullscreenState(state)
  }, [applyFullscreenState])

  // fullscreenchange listeners on the document and the resolved element
  // (upstream `useEventListener(document, ...)` + a reactive element target);
  // the listener effect re-binds whenever the element / `document` changes.
  useEventListener({ current: doc }, eventHandlers, handler, listenerOptions)
  useEventListener({ current: resolvedTarget ?? undefined }, eventHandlers, handler, listenerOptions)

  const exit = useCallback(async () => {
    const state = stateRef.current
    if (!state || !supportedRef.current || !isFullscreenRef.current)
      return

    const { doc: currentDoc, target, exitMethod } = state
    if (exitMethod) {
      const fromDocument = currentDoc && getFullscreenMethod(currentDoc, exitMethod)
      if (fromDocument) {
        await fromDocument()
      }
      else {
        // prefixed exit fallback on the target itself (Safari iOS)
        const fromTarget = target && getFullscreenMethod(target, exitMethod)
        if (fromTarget)
          await fromTarget()
      }
    }

    isFullscreenRef.current = false
    setIsFullscreen(false)
  }, [])

  const enter = useCallback(async () => {
    const state = stateRef.current
    if (!state || !supportedRef.current || isFullscreenRef.current)
      return

    if (isElementFullScreen(state))
      await exit()

    const { target, requestMethod } = state
    if (requestMethod && target) {
      const requestFullscreen = getFullscreenMethod(target, requestMethod)
      if (requestFullscreen) {
        await requestFullscreen()
        isFullscreenRef.current = true
        setIsFullscreen(true)
      }
    }
  }, [exit])

  const toggle = useCallback(async () => {
    await (isFullscreenRef.current ? exit() : enter())
  }, [enter, exit])

  // Upstream `tryOnScopeDispose(exit)` when `autoExit` — read once at mount
  // (upstream destructures `autoExit` at setup).
  const autoExitRef = useRef(autoExit)
  useEffect(() => {
    if (!autoExitRef.current)
      return

    return () => {
      void exit()
    }
  }, [exit])

  return {
    isSupported,
    isFullscreen,
    enter,
    exit,
    toggle,
  }
}
