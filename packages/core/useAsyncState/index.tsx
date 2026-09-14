import type { Dispatch, SetStateAction } from 'react'
import { noop, promiseTimeout } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Default `onError` — mirrors upstream's `globalThis.reportError` fallback. `reportError` must be
 * invoked with the global object as `this`, otherwise Chromium throws "Illegal invocation" for a
 * detached call.
 */
function defaultOnError(e: unknown) {
  if (typeof globalThis.reportError === 'function')
    globalThis.reportError(e)
}

export interface UseAsyncStateReturnBase<Data, Params extends any[], _Shallow extends boolean> {
  /**
   * The resolved result of the async function.
   *
   * Upstream types this as `Shallow extends true ? Ref<Data>: Ref<UnwrapRef<Data>>`, but React
   * state is never deep-wrapped, so both arms of that conditional are `Data`. The unused `_Shallow`
   * type parameter is kept only for generic-arity parity with VueUse and never affects this type.
   */
  state: Data
  /**
   * Set the state value directly, without re-executing the async function.
   *
   * The React equivalent of writing upstream's writable `state` ref (`state.value = next`). It
   * updates only `state`; `isReady`, `isLoading` and `error` are left untouched.
   */
  setState: Dispatch<SetStateAction<Data>>
  isReady: boolean
  isLoading: boolean
  error: unknown
  execute: (delay?: number, ...args: Params) => Promise<Data | undefined>
  executeImmediate: (...args: Params) => Promise<Data | undefined>
}

export type UseAsyncStateReturn<Data, Params extends any[], Shallow extends boolean>
  = UseAsyncStateReturnBase<Data, Params, Shallow>
    & PromiseLike<UseAsyncStateReturnBase<Data, Params, Shallow>>

export interface UseAsyncStateOptions<Shallow extends boolean = true, D = any> {
  /**
   * Delay for the first execution of the promise when "immediate" is true. In milliseconds.
   *
   * @default 0
   */
  delay?: number

  /**
   * Execute the promise right after the function is invoked. Will apply the delay if any.
   *
   * When set to false, you will need to execute it manually.
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void

  /**
   * Callback when success is caught.
   * @param data
   */
  onSuccess?: (data: D) => void

  /**
   * Sets the state to initialState before executing the promise.
   *
   * This can be useful when calling the execute function more than once (for example, to refresh
   * data). When set to false, the current state remains unchanged until the promise resolves.
   *
   * @default true
   */
  resetOnExecute?: boolean

  /**
   * Use shallowRef.
   *
   * Accepted for API parity with VueUse only — React state is never deep-wrapped, so this option
   * has no effect.
   *
   * @default true
   */
  shallow?: Shallow

  /**
   * An error is thrown when executing the execute function.
   *
   * @default false
   */
  throwError?: boolean
}

/**
 * Reactive async state. Will not block your component and will trigger changes once the promise is
 * ready.
 *
 * Map from @vueuse/core `useAsyncState`
 * (`source/vueuse/packages/core/useAsyncState/`). Mirrors the upstream object
 * return: `{ state, setState, isReady, isLoading, error, execute, executeImmediate }`. `state`
 * holds the resolved result of the async function, `setState` writes it directly (the React
 * equivalent of upstream's writable `state` ref, see below), `isReady` becomes `true` when the
 * latest execution resolved (reset to `false` on each execution and stays `false` when it rejects),
 * `isLoading` is `true` while a promise is pending and `error` holds the rejection reason.
 * `execute(delay?...args)` re-runs the promise (waiting for `delay` ms first) and
 * `executeImmediate(...args)` is shorthand for `execute(0...args)`. `onSuccess`/`onError` callbacks
 * fire for every settled execution and `throwError` re-throws the rejection from `execute`.
 *
 * React divergences:
 * - upstream exposes refs (`state.value`, `isLoading.value`...); this port is an object mirror
 * whose members are live React state values — the members render as plain values (no `.value`) and
 * re-reading them yields the latest committed state (getters over the current render state);
 * - upstream's `state` ref is writable, so this port pairs it with
 *   `setState(next)` / `setState(prev => next)` (the React equivalent of
 *   `state.value = next`). `setState` updates `state` only and never triggers
 *   an execution; `isReady`, `isLoading` and `error` are left untouched;
 * - `initialState` is a read-only plain value (upstream `MaybeRef<Data>`):
 *   it is read once when the hook is created and again by each
 *   `resetOnExecute` reset, and is never written back to;
 * - the initial execution fires from a mount effect (upstream fires during
 *   setup), honoring `delay`; subsequent executions run from
 *   `execute`/`executeImmediate` with an execution counter guarding against
 *   outdated executions mutating the state. `resetOnExecute` resets `state`
 *   to the initial value at the start of each execution;
 * - the thenable contract is preserved: the returned object carries a `then`
 *   that resolves with the current result object once the latest execution
 *   finished, so `const { state } = await useAsyncState(...)` works;
 * - `shallow` is accepted for API parity but has no React equivalent — React
 *   state is never deep-wrapped, so the option is a no-op; the `Shallow`
 *   generic is likewise kept for type-arity parity only.
 *
 * @example
 * const { state, setState, isReady, isLoading, error, execute } = useAsyncState(
 *   fetchData,
 *   initialData,
 * )
 * // pass `immediate: false` and call `execute()` manually instead
 * setState(nextData) // write `state` without re-executing
 *
 * @see https://vueuse.org/core/useAsyncState/
 */
export function useAsyncState<Data, Params extends any[] = any[], Shallow extends boolean = true>(
  promise: Promise<Data> | ((...args: Params) => Promise<Data>),
  initialState: Data,
  options?: UseAsyncStateOptions<Shallow, Data>,
): UseAsyncStateReturn<Data, Params, Shallow> {
  const {
    immediate = true,
    delay = 0,
    onError = defaultOnError,
    onSuccess = noop,
    resetOnExecute = true,
    throwError,
  } = options || {}

  const [state, setStateInternal] = useState<Data>(() => initialState)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(undefined)

  // latest-value mirrors synced every render so the stable `execute` closure
  // and the mount effect always read the newest input (house pattern)
  const promiseRef = useRef(promise)
  promiseRef.current = promise
  const initialStateRef = useRef(initialState)
  initialStateRef.current = initialState
  const delayRef = useRef(delay)
  delayRef.current = delay
  const immediateRef = useRef(immediate)
  immediateRef.current = immediate
  const resetOnExecuteRef = useRef(resetOnExecute)
  resetOnExecuteRef.current = resetOnExecute
  const throwErrorRef = useRef(!!throwError)
  throwErrorRef.current = !!throwError
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // live mirror of the exposed state — the shell getters read this so a
  // captured object (e.g. the value an `await useAsyncState(...)` resolves to)
  // still exposes fresh values. It is updated synchronously by `execute` and by
  // the exposed `setState` (like upstream refs) and never from the render body —
  // React renders can commit with stale state values when updates are queued
  // outside `act`, and a render-body reassignment would clobber the in-progress
  // mirror.
  const liveRef = useRef({ state, isReady, isLoading, error })

  // execution counter: only the latest execution may touch the exposed state
  const executionsCountRef = useRef(0)
  // synchronous mirror of `isLoading` — React state updates are async
  const loadingRef = useRef(false)
  const waitersRef = useRef<Array<{ resolve: (value: UseAsyncStateReturnBase<Data, Params, Shallow>) => void }>>([])

  // React equivalent of writing upstream's writable `state` ref. It writes the
  // internal state (and its live mirror) only — it never starts an execution,
  // so `isReady`/`isLoading`/`error` keep their current values.
  const setState = useCallback<Dispatch<SetStateAction<Data>>>((action) => {
    const prev = liveRef.current.state
    const next = typeof action === 'function' ? (action as (value: Data) => Data)(prev) : action
    liveRef.current.state = next
    setStateInternal(next)
  }, [])

  const execute = useCallback((delay = 0, ...args: any[]): Promise<Data | undefined> => {
    const executionId = (executionsCountRef.current += 1)

    // `liveRef` is updated synchronously alongside every state update so the
    // shell getters read the in-progress values immediately (upstream refs are
    // synchronous too; React state only commits on the next render)
    const nextState = resetOnExecuteRef.current ? initialStateRef.current : liveRef.current.state
    if (resetOnExecuteRef.current)
      setStateInternal(nextState)
    liveRef.current = { state: nextState, isReady: false, isLoading: true, error: undefined }
    setError(undefined)
    setIsReady(false)
    loadingRef.current = true
    setIsLoading(true)

    return (async () => {
      if (delay > 0)
        await promiseTimeout(delay)

      const pending = typeof promiseRef.current === 'function'
        ? promiseRef.current(...args as Params)
        : promiseRef.current

      try {
        const data = await pending
        if (executionId === executionsCountRef.current) {
          setStateInternal(data)
          setIsReady(true)
          liveRef.current.state = data
          liveRef.current.isReady = true
        }
        onSuccessRef.current(data)
        return data
      }
      catch (e) {
        if (executionId === executionsCountRef.current) {
          setError(e)
          liveRef.current.error = e
        }
        onErrorRef.current(e)
        if (throwErrorRef.current)
          throw e
        return undefined
      }
      finally {
        if (executionId === executionsCountRef.current) {
          loadingRef.current = false
          setIsLoading(false)
          liveRef.current.isLoading = false
        }
      }
    })()
  }, [])

  const executeImmediate = useCallback((...args: Params) => execute(0, ...args), [execute])

  // the base shell is deliberately NOT a thenable — upstream's
  // `waitUntilIsLoaded` resolves with its plain `shell` (the `then` lives on
  // the returned composite) so promise resolution can never re-adopt `then`
  const base = {
    get state() {
      return liveRef.current.state
    },
    get isReady() {
      return liveRef.current.isReady
    },
    get isLoading() {
      return liveRef.current.isLoading
    },
    get error() {
      return liveRef.current.error
    },
    setState,
    execute,
    executeImmediate,
  }

  const baseRef = useRef<UseAsyncStateReturnBase<Data, Params, Shallow> | null>(base)
  baseRef.current = base

  const waitUntilIsLoaded = useCallback((): Promise<UseAsyncStateReturnBase<Data, Params, Shallow>> => {
    return new Promise<UseAsyncStateReturnBase<Data, Params, Shallow>>((resolve) => {
      if (!loadingRef.current) {
        resolve(baseRef.current as UseAsyncStateReturnBase<Data, Params, Shallow>)
        return
      }
      waitersRef.current.push({ resolve })
    })
  }, [])

  // upstream fires the initial execution during setup — React fires it from a
  // mount effect (exactly once), honoring the configured `delay`.
  useEffect(() => {
    if (immediateRef.current)
      void execute(delayRef.current)
  }, [execute])

  // resolve `await useAsyncState(...)` waiters once a load cycle completes
  useEffect(() => {
    if (isLoading)
      return
    const waiters = waitersRef.current
    waitersRef.current = []
    waiters.forEach(waiter => waiter.resolve(baseRef.current as UseAsyncStateReturnBase<Data, Params, Shallow>))
  }, [isLoading])

  // the composite shell is built via `Object.create` (NOT object spread —
  // spread materializes accessor values into dead data properties, which would
  // freeze the members to the values captured at render time) so every member
  // stays a live getter over `liveRef`
  const shell = Object.create(base) as UseAsyncStateReturn<Data, Params, Shallow>
  shell.then = function then<TResult1 = UseAsyncStateReturnBase<Data, Params, Shallow>, TResult2 = never>(
    onFulfilled?: ((value: UseAsyncStateReturnBase<Data, Params, Shallow>) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return waitUntilIsLoaded().then(onFulfilled, onRejected)
  }

  return shell
}
