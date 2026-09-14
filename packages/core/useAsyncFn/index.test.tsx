import type { AsyncFnReturn, AsyncState } from '../useAsyncFn'
import { promiseTimeout } from '@reause/shared'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useAsyncFn } from '../useAsyncFn'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncFn', () => {
  it('should be defined', () => {
    expect(useAsyncFn).toBeDefined()
  })

  it('types: mirrors the upstream AsyncState / AsyncFnReturn public shapes', () => {
    const func = async (id: string) => id.length
    // Declared but never called — type-level assertions only, no hooks run.
    const returns = () => useAsyncFn(func)
    expectTypeOf(returns).returns.toEqualTypeOf<AsyncFnReturn<typeof func>>()

    // … and takes only `fn` plus the optional `initialState`
    const withInitialState = () => useAsyncFn(func, { loading: false, value: 1 })
    expectTypeOf(withInitialState).returns.toEqualTypeOf<AsyncFnReturn<typeof func>>()
    // @ts-expect-error upstream's `deps` parameter is intentionally not supported
    expectTypeOf(() => useAsyncFn(func, [])).toBeFunction()

    const errorState: AsyncState<number> = { loading: false, error: new Error('failed') }
    const valueState: AsyncState<number> = { loading: false, value: 1 }
    const loadingState: AsyncState<number> = { loading: true }
    expect([errorState.loading, valueState.loading, loadingState.loading]).toEqual([false, false, true])
  })

  it('starts from the upstream default state `{ loading: false }`', async () => {
    const { result } = await renderHook(() => useAsyncFn(async () => 'value'))

    expect(result.current[0]).toEqual({ loading: false })
  })

  it('honours a custom initialState', async () => {
    const { result } = await renderHook(() =>
      useAsyncFn(async () => 'next', { loading: false, value: 'initial' }),
    )

    expect(result.current[0]).toEqual({ loading: false, value: 'initial' })
  })

  it('exposes the loading branch while in flight, then the resolved value branch', async () => {
    const deferred = createDeferred<string>()
    const { result } = await renderHook(() => useAsyncFn(() => deferred.promise))

    const promise = result.current[1]()
    await vi.waitFor(() => {
      expect(result.current[0]).toEqual({ loading: true })
    })

    deferred.resolve('resolved')
    await expect(promise).resolves.toBe('resolved')
    await vi.waitFor(() => {
      expect(result.current[0]).toEqual({ loading: false, value: 'resolved' })
    })
  })

  it('stores a rejection as the error branch and resolves with the error instead of rejecting', async () => {
    const failure = new Error('request failed')
    const { result } = await renderHook(() => useAsyncFn(async () => {
      throw failure
    }))

    const promise = result.current[1]()
    // the callback resolves with the error — upstream behaviour, kept on purpose
    await expect(promise).resolves.toBe(failure)
    await vi.waitFor(() => {
      expect(result.current[0]).toEqual({ loading: false, error: failure })
    })
  })

  it('returns the raw promise of the wrapped function so callers can await it', async () => {
    const deferred = createDeferred<string>()
    const { result } = await renderHook(() => useAsyncFn((prefix: string) => deferred.promise.then(value => `${prefix}:${value}`)))

    const promise = result.current[1]('raw')
    expect(promise).toBeInstanceOf(Promise)

    deferred.resolve('value')
    await expect(promise).resolves.toBe('raw:value')
  })

  it('discards a stale response: call #1 resolving after call #2 must not overwrite the newer state', async () => {
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    const { result } = await renderHook(() =>
      useAsyncFn((id: 'first' | 'second') => (id === 'first' ? first.promise : second.promise)),
    )

    // Call #1 is started first and deliberately left pending.
    const firstCall = result.current[1]('first')
    const secondCall = result.current[1]('second')

    // Call #2 settles first — it is the newest call, so it owns the state.
    second.resolve('second')
    await expect(secondCall).resolves.toBe('second')
    await vi.waitFor(() => {
      expect(result.current[0]).toEqual({ loading: false, value: 'second' })
    })

    // Call #1 (the stale one) settles last: its own promise still resolves with
    // its value, but it must not touch the state any more.
    first.resolve('first')
    await expect(firstCall).resolves.toBe('first')
    await promiseTimeout(20)
    expect(result.current[0]).toEqual({ loading: false, value: 'second' })
  })

  it('keeps the race guard across more than two overlapping calls', async () => {
    const deferreds = [createDeferred<string>(), createDeferred<string>(), createDeferred<string>()]
    const { result } = await renderHook(() =>
      useAsyncFn((index: number) => deferreds[index].promise),
    )

    const calls = [result.current[1](0), result.current[1](1), result.current[1](2)]

    // The newest call (#3) settles first and owns the state …
    deferreds[2].resolve('third')
    await calls[2]
    await vi.waitFor(() => {
      expect(result.current[0]).toEqual({ loading: false, value: 'third' })
    })

    // … then the two older calls settle, in start order, and must all be discarded.
    deferreds[0].resolve('first')
    await calls[0]
    deferreds[1].resolve('second')
    await calls[1]

    await promiseTimeout(20)
    expect(result.current[0]).toEqual({ loading: false, value: 'third' })
  })

  it('has no deps: the callback is re-created per render and closes over the latest fn', async () => {
    const { result, rerender } = await renderHook(
      (props: { value: string } = { value: 'first' }) => useAsyncFn(async () => props.value),
      { initialProps: { value: 'first' } },
    )

    const firstCallback = result.current[1]
    await expect(firstCallback()).resolves.toBe('first')

    await rerender({ value: 'second' })

    // Not memoised: every render hands back a new function …
    expect(result.current[1]).not.toBe(firstCallback)
    // … which is exactly what keeps it reading the latest `fn` closure.
    await expect(result.current[1]()).resolves.toBe('second')
  })
})
