import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseShareOptions {
  title?: string
  files?: File[]
  text?: string
  url?: string
}

export interface UseShareReturn {
  /**
   * `true` when the resolved navigator exposes `canShare` — upstream's exact support check.
   * Resolved in a mount effect, so it stays `false` during the first render and on the server
   * (SSR-safe).
   */
  isSupported: boolean
  /**
   * Triggers the Web Share API with the hook options merged under the call-time overrides
   * (overrides win). Resolves `undefined` when unsupported or when `canShare` rejects the data; the
   * promise from `navigator.share` is passed through untouched — a user-cancelled share
   * (AbortError) rejects to the caller, like upstream.
   *
   * Must be called from a user gesture (e.g. a button click).
   */
  share: (overrideOptions?: UseShareOptions) => Promise<void>
}

interface NavigatorWithShare {
  share?: (data: UseShareOptions) => Promise<void>
  canShare?: (data: UseShareOptions) => boolean
}

/**
 * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
 * Declared inline instead of re-exporting upstream's configurable-navigator interface to keep the
 * barrel export collision-free.
 */
interface UseShareNavigatorOptions {
  navigator?: Navigator
}

/**
 * Map from @vueuse/core `useShare`
 * (`source/vueuse/packages/core/useShare/`). Reactive
 * [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).
 *
 * React divergences:
 * - upstream derives `isSupported` through its `useSupported` helper (a
 *   computed re-evaluated on mount); here it is a plain boolean state
 *   resolved in a mount effect — `false` during render and on the server
 *   (SSR-safe), `true` afterwards when the navigator exposes `canShare`
 *   (upstream's exact check — note: `canShare`, not `navigator.share`);
 * - upstream accepts `MaybeRefOrGetter<UseShareOptions>`; React has no
 *   reactive refs, so options are plain values. The latest options and
 *   navigator live in refs synced each render, keeping `share` a stable
 *   callback that always reads the newest values — inline option objects
 *   and later changes are picked up without invalidating it;
 * - upstream's `ConfigurableNavigator` option is declared inline
 *   (`UseShareNavigatorOptions`, not exported) to avoid same-name barrel
 *   collisions;
 * - the `share` promise is not wrapped or caught: rejections (including the user-cancel AbortError)
 * propagate to the caller.
 *
 * @example
 * const { share, isSupported } = useShare()
 *
 * function startShare() {
 *   share({ title: 'Hello', text: 'Hello my friend!', url: location.href })
 * }
 */
export function useShare(shareOptions: UseShareOptions = {}, options: UseShareNavigatorOptions = {}): UseShareReturn {
  // latest-value refs synced each render so `share` stays a stable callback
  // that always reads the newest options and navigator
  const shareOptionsRef = useRef<UseShareOptions | undefined>(undefined)
  shareOptionsRef.current = shareOptions

  const customNavigator = options.navigator
  const navigatorRef = useRef<Navigator | undefined>(undefined)
  navigatorRef.current = customNavigator ?? (typeof navigator === 'undefined' ? undefined : navigator)

  const [isSupported, setIsSupported] = useState(false)

  // upstream re-evaluates its support computed on mount; resolve the same
  // `'canShare' in navigator` check in a mount effect so the first render
  // (and SSR) stays `false` without touching `navigator` during render
  useEffect(() => {
    const nav = navigatorRef.current as NavigatorWithShare | undefined
    setIsSupported(Boolean(nav && 'canShare' in nav))
  }, [customNavigator])

  const share = useCallback(async (overrideOptions: UseShareOptions = {}) => {
    const nav = navigatorRef.current as NavigatorWithShare | undefined
    if (!nav || !('canShare' in nav))
      return

    const data = {
      ...shareOptionsRef.current,
      ...overrideOptions,
    }
    let granted = false

    if (nav.canShare)
      granted = nav.canShare(data)

    if (granted)
      return nav.share!(data)
  }, [])

  return { isSupported, share }
}
