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
    const returns = () => useAsyncFn(func, [])
    expectTypeOf(returns).returns.toEqualTypeOf<AsyncFnReturn<typeof func>>()

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
      useAsyncFn(async () => 'next', [], { loading: false, value: 'initial' }),
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
      useAsyncFn((id: 'first' | 'second') => (id === 'first' ? first.promise : second.promise), []),
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
      useAsyncFn((index: number) => deferreds[index].promise, []),
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

  it('memoises the callback per deps: stable across re-renders, new identity when deps change', async () => {
    const { result, rerender } = await renderHook(
      (props: { tick: number } = { tick: 1 }) => useAsyncFn(async () => props.tick, [props.tick]),
      { initialProps: { tick: 1 } },
    )

    const firstCallback = result.current[1]

    await rerender({ tick: 1 })
    expect(result.current[1]).toBe(firstCallback)

    await rerender({ tick: 2 })
    expect(result.current[1]).not.toBe(firstCallback)
  })

  it('default comparison stays reference-based: an equal-but-new deps array keeps the callback, a new element reference does not', async () => {
    const filter = { q: 'a' }
    const { result, rerender } = await renderHook(
      (props: { filter: { q: string } } = { filter: { q: 'a' } }) => useAsyncFn(async () => props.filter.q, [props.filter]),
      { initialProps: { filter } },
    )

    const firstCallback = result.current[1]

    // A new array literal holding the *same* element reference: React's own
    // element-wise comparison says "unchanged" (upstream `useCallback`
    // semantics), so the callback is kept.
    await rerender({ filter })
    expect(result.current[1]).toBe(firstCallback)

    // An equal-but-new element reference: reference comparison says "changed",
    // so the callback is re-created — the default behaviour upstream users get.
    await rerender({ filter: { q: 'a' } })
    expect(result.current[1]).not.toBe(firstCallback)
  })

  it('deep: true keeps the callback for an equal-but-new dep and re-memoises on a real change', async () => {
    const { result, rerender } = await renderHook(
      (props: { filter: { q: string } } = { filter: { q: 'a' } }) =>
        useAsyncFn(async () => props.filter.q, [props.filter], { loading: false }, { deep: true }),
      { initialProps: { filter: { q: 'a' } } },
    )

    const firstCallback = result.current[1]

    // equal-but-new object — deep comparison keeps the callback
    await rerender({ filter: { q: 'a' } })
    expect(result.current[1]).toBe(firstCallback)

    // structurally different object — the callback is re-created
    await rerender({ filter: { q: 'b' } })
    expect(result.current[1]).not.toBe(firstCallback)
  })

  it('deep: true works on nested structures as well as top-level references', async () => {
    const { result, rerender } = await renderHook(
      (props: { query: { tags: string[], page: number } } = { query: { tags: ['a'], page: 1 } }) =>
        useAsyncFn(async () => props.query.page, [props.query], { loading: false }, { deep: true }),
      { initialProps: { query: { tags: ['a'], page: 1 } } },
    )

    const firstCallback = result.current[1]

    await rerender({ query: { tags: ['a'], page: 1 } })
    expect(result.current[1]).toBe(firstCallback)

    await rerender({ query: { tags: ['a', 'b'], page: 1 } })
    expect(result.current[1]).not.toBe(firstCallback)
  })
})
