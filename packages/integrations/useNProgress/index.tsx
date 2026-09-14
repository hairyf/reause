import type { NProgress, NProgressOptions } from 'nprogress'
import type { Dispatch, SetStateAction } from 'react'
import { isClient } from '@reause/shared'
import nprogress from 'nprogress'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Options forwarded to `nprogress.configure` —.
 */
export type UseNProgressOptions = Partial<NProgressOptions>

export interface UseNProgressReturn {
  /**
   * Current progress percentage (`0..1`), `null` after `remove()`, `1` after `done()` — the
   * plain-state replacement for upstream's `progress` ref. Write through `setProgress`.
   */
  readonly progress: number | null | undefined

  /**
   * Setter for `progress` — the React mapping of upstream's writable `progress` ref. Takes a plain
   * value or a functional updater (like a React `useState` setter, `prev => next`). A `number`
   * result is pushed to `nprogress` once, through the progress effect; a `null` / `undefined`
   * result only clears the state — the bar element is removed through `remove()`.
   */
  readonly setProgress: Dispatch<SetStateAction<number | null | undefined>>

  /**
   * Whether the bar is currently showing — the React replacement for upstream's writable
   * `isLoading` computed: `true` while `progress` is a number below 1. Write through
   * `setIsLoading`.
   */
  readonly isLoading: boolean

  /**
   * Setter half of upstream's writable `isLoading` computed — takes a plain value or a functional
   * updater (like a React `useState` setter, `prev => next`): `setIsLoading(true)` starts the bar,
   * `setIsLoading(false)` completes it.
   */
  readonly setIsLoading: Dispatch<SetStateAction<boolean>>

  /**
   * Show the bar — upstream's `start`.
   */
  readonly start: () => NProgress

  /**
   * Complete the bar (the placebo `done` animation) — upstream's `done`.
   *
   * @param force - show the bar even when it is hidden
   */
  readonly done: (force?: boolean) => NProgress

  /**
   * Reset `progress` to `null` and remove the bar from the DOM — upstream's `remove`.
   */
  readonly remove: () => void
}

/**
 * Map from @vueuse/integrations `useNProgress`
 * (`source/vueuse/packages/integrations/useNProgress/index.ts`), a reactive
 * wrapper around the [`nprogress`](https://github.com/rstacruz/nprogress) progress bar.
 * `currentProgress` is the hook's **read-only value source** and takes a plain `number | null |
 * undefined`.
 *
 * React divergences:
 * - the writable `WritableComputedRef<boolean>` `isLoading` and the `Ref<number | null |
 * undefined>` `progress` become plain state: `isLoading` is derived (`typeof progress === 'number'
 * && progress < 1`) and written through `setIsLoading`, `progress` is a plain number written
 * through `setProgress`; the object return mirrors upstream's object of refs with every writable
 * value paired with its setter — `{ progress, setProgress, isLoading, setIsLoading, start, done,
 * remove }`;
 * - the setters are React `Dispatch<SetStateAction<...>>`: each accepts a plain
 *   value or a functional updater (`prev => next`), like a `useState` setter;
 * - upstream monkey-patches the module-singleton `nprogress.set` so that its internal `set` calls
 * (`start` → `set(0)`, `done` → `set(1)`) write back into `progress.value`, which is what makes
 * `isLoading` flip. This port never touches the global `nprogress.set`: `setProgress(n)` only sets
 * the state and the progress effect pushes the number into the bar once per render, while `start` /
 * `done` / `setIsLoading` mirror the same write-back by hand (upstream's `start` only calls
 * `set(0)` when the bar was idle, and `done` only calls `set(1)` when it actually progresses) — so
 * `isLoading` flips, without global pollution and safely with concurrent hook instances;
 * - `options` are applied once on mount (`nprogress.configure`), like
 *   upstream's setup-time `if (options) nprogress.configure(options)`; later
 *   `options` changes are not re-applied, matching the upstream setup
 *   semantics;
 * - a provided `currentProgress` is mirrored into the internal state (upstream's
 *   `toRef`): a changed plain number re-syncs between renders, and a write
 *   through `setProgress` / `start` / `done` is only superseded by a genuine
 *   external change. Writes are **not** propagated back to the caller
 *   (upstream's `toRef` writes through to a ref input); the source is
 *   read-only here;
 * - unmount runs `nprogress.remove()`, mirroring upstream's
 *   `tryOnScopeDispose(nprogress.remove)`. `nprogress` is a module singleton,
 *   so unmounting one hook instance removes the shared bar — the same
 *   semantics as upstream.
 *
 * SSR-safe: `nprogress.set` is only called when `isClient` (upstream's `watchEffect` guard).
 *
 * @param currentProgress - initial progress percentage (`0..1`); a changed
 *   plain value re-syncs on the next render
 * @param options - `nprogress.configure` options, applied once on mount
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const { progress, setProgress, isLoading, setIsLoading, done, remove } = useNProgress()
 * setIsLoading(true) // starts the bar, isLoading === true
 * setProgress(0.5) // progress === 0.5, the bar renders at 50%
 * setProgress(prev => (prev ?? 0) + 0.1) // functional updater, like a useState setter
 * done() // progress === 1, isLoading === false
 * remove() // progress === null, the #nprogress element is gone
 */
export function useNProgress(
  currentProgress: number | null | undefined = null,
  options?: UseNProgressOptions,
): UseNProgressReturn {
  const [progress, setProgressState] = useState<number | null | undefined>(currentProgress)

  // Latest progress, kept in sync synchronously on every write so the
  // functional-updater forms of `setProgress` / `setIsLoading` resolve against
  // the most recent value even before the next render commits (React's own
  // `useState` setter cannot run the `nprogress.set` side effect inside its
  // updater function).
  const progressRef = useRef<number | null | undefined>(currentProgress)
  const updateProgress = useCallback((next: number | null | undefined) => {
    progressRef.current = next
    setProgressState(next)
  }, [])

  // mirror the incoming `currentProgress` prop into the internal state whenever
  // it changes between renders — upstream's `toRef(currentProgress)`. The
  // baseline records the last value synced FROM the prop, so a `setProgress` /
  // `start` / `done` write is never clobbered by a render that did not actually
  // change the external value.
  const lastExternalRef = useRef<number | null | undefined>(currentProgress)
  useEffect(() => {
    if (!Object.is(currentProgress, lastExternalRef.current)) {
      lastExternalRef.current = currentProgress
      updateProgress(currentProgress)
    }
  })

  // upstream applies options at setup time; later option changes are ignored.
  // Declared before the progress-push effect below so the configuration is in
  // place before the first `nprogress.set` (the minimum clamps the value).
  const optionsRef = useRef(options)
  optionsRef.current = options
  useEffect(() => {
    if (optionsRef.current)
      nprogress.configure(optionsRef.current)
  }, [])

  // upstream `watchEffect`: push numeric progress into the bar
  useEffect(() => {
    if (typeof progress === 'number' && isClient)
      nprogress.set(progress)
  }, [progress])

  // upstream `tryOnScopeDispose(nprogress.remove)`
  useEffect(() => () => {
    nprogress.remove()
  }, [])

  const setProgress = useCallback((updater: SetStateAction<number | null | undefined>) => {
    const next = typeof updater === 'function'
      ? updater(progressRef.current)
      : updater
    // state-only write: the `[progress]` effect pushes the number into the bar
    // exactly once per render (upstream's `watchEffect`), avoiding a double
    // `nprogress.set`
    updateProgress(next)
  }, [updateProgress])

  const start = useCallback((): NProgress => {
    // upstream's patched `set` writes `progress.value = 0` from the internal
    // `set(0)` call, but only when the bar was idle
    const wasStarted = nprogress.isStarted()
    const result = nprogress.start()
    if (!wasStarted)
      updateProgress(0)
    return result
  }, [updateProgress])

  const done = useCallback((force?: boolean): NProgress => {
    // upstream's `done` returns early (and so never calls the patched `set(1)`)
    // when `!force && !nprogress.status`
    const status = nprogress.status
    const result = nprogress.done(force)
    if (force || status)
      updateProgress(1)
    return result
  }, [updateProgress])

  const setIsLoading = useCallback((updater: SetStateAction<boolean>) => {
    const next = typeof updater === 'function'
      ? updater(typeof progressRef.current === 'number' && progressRef.current < 1)
      : updater
    if (next)
      start()
    else
      done()
  }, [start, done])

  const remove = useCallback(() => {
    updateProgress(null)
    nprogress.remove()
  }, [updateProgress])

  return {
    progress,
    setProgress,
    isLoading: typeof progress === 'number' && progress < 1,
    setIsLoading,
    start,
    done,
    remove,
  }
}
