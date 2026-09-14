import type { ConfigurableWindow } from '@reause/shared'
import { isClient } from '@reause/shared'
import { useCallback, useEffect, useRef } from 'react'

let announcerMap: Map<string, number> | undefined

function getAnnouncerMap() {
  return announcerMap ??= new Map<string, number>()
}

export interface UseLiveAnnouncerOptions extends ConfigurableWindow {
  /**
   * The prefix for the id of the announcer elements.
   * @default 'vueuse-live-announcer'
   */
  idPrefix?: string
}

function cleanup(idPrefix: string, document: Document) {
  const map = getAnnouncerMap()
  const count = map.get(idPrefix) || 0

  if (count <= 1) {
    const container = document.getElementById(`${idPrefix}-container`)
    if (container) {
      container.remove()
    }
    map.delete(idPrefix)
  }
  else {
    map.set(idPrefix, count - 1)
  }
}

export interface UseLiveAnnouncerReturn {
  announce: (message: string, mode?: 'polite' | 'assertive', timeout?: number) => void
  polite: (message: string, timeout?: number) => void
  assertive: (message: string, timeout?: number) => void
}

/**
 * Vue's `nextTick` has no React equivalent — DOM writes are not coordinated through a reactive
 * scheduler. The clear-then-set-on-the-next-tick announce pattern is kept (mirrors upstream) but
 * the "next tick" is the microtask queue, which is enough to let the browser re-read a live region
 * even when the exact same message is announced twice in a row. Promise-based so it resolves
 * normally under `vi.useFakeTimers()`.
 */
function nextTick(callback?: () => void): Promise<void> {
  return callback ? Promise.resolve().then(callback) : Promise.resolve()
}

/**
 * Map from @vueuse/core `useLiveAnnouncer`
 * (`source/vueuse/packages/core/useLiveAnnouncer/`). Accessible way to
 * announce messages to screen reader users (ARIA live regions).
 *
 * The hook maintains a visually-hidden `<div>` (per `idPrefix`) containing a `polite`
 * (`role="status"`, `aria-live="polite"`) and an `assertive` (`role="alert"`,
 * `aria-live="assertive"`) region. `announce(message, mode, timeout)` writes the message into the
 * region with the given mode (default `'polite'`), optionally auto-clearing it after `timeout` ms;
 * a new announcement cancels any pending auto-clear for the same mode so a previously scheduled
 * clear can never wipe a fresh message. `polite` / `assertive` are shorthand for `announce` with a
 * fixed mode.
 *
 * React divergences:
 * - upstream registers cleanup on the active effect scope
 *   (`tryOnScopeDispose`); here the DOM regions are created in a mount effect
 *   and torn down on unmount, so nothing touches the DOM during render or on
 *   the server (SSR-safe no-op when no `window` / `document` is available);
 * - the module-level `announcerMap` reference counting is kept 1:1: the
 *   container is only removed when the last mounted hook sharing an
 *   `idPrefix` unmounts;
 * - upstream `nextTick` becomes a microtask flush (see `nextTick` above);
 * - the return object `{ announce, polite, assertive }`;
 * - the `window` option defaults to the global `window` (`undefined` on the
 *   server, where the hook becomes a no-op) — upstream's `defaultWindow`
 *   symbol is inlined here because the shared package does not export it.
 *
 * @example
 * const { announce, polite, assertive } = useLiveAnnouncer()
 *
 * announce('This is a polite announcement')
 * polite('This is also a polite announcement')
 * assertive('Important message!')
 */
export function useLiveAnnouncer(options: UseLiveAnnouncerOptions = {}): UseLiveAnnouncerReturn {
  const {
    idPrefix = 'vueuse-live-announcer',
    window: windowOption,
  } = options

  // Resolve the window without touching the global during render; an explicit
  // `window: null` / `window: {}` opts out entirely (upstream's
  // `defaultWindow` is inlined here — the shared package does not export it).
  const win = windowOption !== undefined
    ? windowOption
    : (isClient ? window : undefined)

  const document = win?.document

  // Pending auto-clear timers per mode, cleared on unmount (upstream:
  // `tryOnScopeDispose`).
  const timers = useRef(new Map<'polite' | 'assertive', ReturnType<Window['setTimeout']>>())

  const ensureAnnouncer = useCallback(() => {
    if (!document)
      return

    let container = document.getElementById(`${idPrefix}-container`)

    if (!container) {
      container = document.createElement('div')
      container.id = `${idPrefix}-container`
      container.style.position = 'absolute'
      container.style.width = '1px'
      container.style.height = '1px'
      container.style.padding = '0'
      container.style.margin = '-1px'
      container.style.overflow = 'hidden'
      container.style.clip = 'rect(0, 0, 0, 0)'
      container.style.whiteSpace = 'nowrap'
      container.style.border = '0'
      container.style.wordWrap = 'normal'
      container.style.clipPath = 'inset(50%)'
      document.body.appendChild(container)
    }

    if (!document.getElementById(`${idPrefix}-polite`)) {
      const polite = document.createElement('div')
      polite.id = `${idPrefix}-polite`
      polite.setAttribute('role', 'status')
      polite.setAttribute('aria-live', 'polite')
      polite.setAttribute('aria-atomic', 'true')
      container.appendChild(polite)
    }

    if (!document.getElementById(`${idPrefix}-assertive`)) {
      const assertive = document.createElement('div')
      assertive.id = `${idPrefix}-assertive`
      assertive.setAttribute('role', 'alert')
      assertive.setAttribute('aria-live', 'assertive')
      assertive.setAttribute('aria-atomic', 'true')
      container.appendChild(assertive)
    }
  }, [idPrefix, document])

  // React analog of upstream's mount-time ensureAnnouncer() +
  // tryOnScopeDispose cleanup. The reference count is bumped here so the
  // container survives while more than one hook shares the same `idPrefix`.
  useEffect(() => {
    if (!win || !document)
      return

    const map = getAnnouncerMap()
    const count = map.get(idPrefix) || 0
    map.set(idPrefix, count + 1)

    ensureAnnouncer()

    return () => {
      timers.current.forEach(timer => win.clearTimeout(timer))
      timers.current.clear()
      cleanup(idPrefix, document)
    }
  }, [win, document, idPrefix, ensureAnnouncer])

  const announce = useCallback((message: string, mode: 'polite' | 'assertive' = 'polite', timeout?: number) => {
    if (!win || !document)
      return

    ensureAnnouncer()

    const element = document.getElementById(`${idPrefix}-${mode}`)

    if (element) {
      // Cancel any pending auto-clear for this region so it can't wipe the new message.
      const pending = timers.current.get(mode)
      if (pending != null) {
        win.clearTimeout(pending)
        timers.current.delete(mode)
      }

      element.textContent = ''
      nextTick(() => {
        element.textContent = message
      })

      if (timeout && timeout > 0) {
        const timer = win.setTimeout(() => {
          timers.current.delete(mode)
          element.textContent = ''
        }, timeout)
        timers.current.set(mode, timer)
      }
    }
  }, [win, document, idPrefix, ensureAnnouncer])

  const polite = useCallback((message: string, timeout?: number) => {
    announce(message, 'polite', timeout)
  }, [announce])

  const assertive = useCallback((message: string, timeout?: number) => {
    announce(message, 'assertive', timeout)
  }, [announce])

  return {
    announce,
    polite,
    assertive,
  }
}
