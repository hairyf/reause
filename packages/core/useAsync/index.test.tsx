import { promiseTimeout } from '@reause/shared'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useAsync } from '../useAsync'

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

describe('useAsync', () => {
  it('should be defined', () => {
    expect(useAsync).toBeDefined()
  })

  it('types: initialState is optional and widens the return to T | undefined when omitted', () => {
    const func = () => Promise.resolve('data')
    // Declared but never called — type-level assertions only, no hooks run.
    const withoutInitial = () => useAsync(func)
    const withInitial = () => useAsync(func, 'initial')
    expectTypeOf(withoutInitial).returns.toEqualTypeOf<string | undefined>()
    expectTypeOf(withInitial).returns.toEqualTypeOf<string>()
  })

  it('returns the initial state (plain value) until the evaluation settles', async () => {
    const deferred = createDeferred<string>()
    const { result } = await renderHook(() => useAsync(() => deferred.promise, 'initial'))
    expect(result.current).toBe('initial')
  })

  it('supports a getter initial state (refs are not a state source)', async () => {
    const source = 'getter-initial'
    const deferred = createDeferred<string>()
    const { result } = await renderHook(() => useAsync(() => deferred.promise, () => source))
    expect(result.current).toBe('getter-initial')
    deferred.resolve('resolved')
    await vi.waitFor(() => {
      expect(result.current).toBe('resolved')
    })
    // the getter is read-only: the resolved value never writes back to it
    expect(source).toBe('getter-initial')
  })

  it('supports a controlled state tuple and publishes resolved values through its setter', async () => {
    const deferred = createDeferred<string>()
    let externalValue = 'controlled'
    const setExternalValue = vi.fn((value: string | ((prev: string) => string)) => {
      externalValue = typeof value === 'function' ? value(externalValue) : value
    })
    const state: readonly [string, typeof setExternalValue] = [externalValue, setExternalValue]
    const { result } = await renderHook(() => useAsync(() => deferred.promise, state))
    expect(result.current).toBe('controlled')
    deferred.resolve('resolved')
    await vi.waitFor(() => {
      expect(setExternalValue).toHaveBeenCalledWith('resolved')
    })
    expect(result.current).toBe('controlled')
    expect(externalValue).toBe('resolved')
  })

  it('supports a controlled value/onChange state object', async () => {
    const deferred = createDeferred<string>()
    const onChange = vi.fn()
    const { result } = await renderHook(() => useAsync(() => deferred.promise, { value: 'initial', onChange }))
    deferred.resolve('next')
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('next')
    })
    expect(result.current).toBe('initial')
  })

  it('resolves the async value', async () => {
    const deferred = createDeferred<string>()
    const { result } = await renderHook(() => useAsync(() => deferred.promise, 'initial'))
    deferred.resolve('resolved')
    await vi.waitFor(() => {
      expect(result.current).toBe('resolved')
    })
  })

  it('updates the state synchronously for non-Promise return values', async () => {
    const { result } = await renderHook(() => useAsync(() => 'sync-value', 'initial'))
    expect(result.current).toBe('sync-value')
  })

  it('re-evaluates when deps change', async () => {
    const evaluationCallback = vi.fn(async (term: string) => `lookup:${term}`)
    const { result, rerender } = await renderHook(
      ({ term }: { term: string } = { term: 'a' }) => useAsync(() => evaluationCallback(term), '', { deps: [term] }),
      { initialProps: { term: 'a' } },
    )
    await vi.waitFor(() => {
      expect(result.current).toBe('lookup:a')
    })
    await rerender({ term: 'b' })
    await vi.waitFor(() => {
      expect(result.current).toBe('lookup:b')
    })
    expect(evaluationCallback).toHaveBeenCalledTimes(2)
  })

  it('discards a stale result when deps change while a promise is pending', async () => {
    const onEvaluating = vi.fn()
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    let call = 0
    const pick = () => {
      call += 1
      if (call === 1)
        return first.promise
      return second.promise
    }
    const { result, rerender } = await renderHook(
      ({ term }: { term: string } = { term: 'a' }) => useAsync(() => pick(), 'initial', { deps: [term], onEvaluating }),
      { initialProps: { term: 'a' } },
    )
    expect(result.current).toBe('initial')

    // deps change while the first promise is still pending
    await rerender({ term: 'b' })
    await vi.waitFor(() => {
      expect(call).toBe(2)
    })

    // the stale resolution must never land
    first.resolve('stale')
    await promiseTimeout(20)
    expect(result.current).toBe('initial')

    // only the latest evaluation updates the state
    second.resolve('latest')
    await vi.waitFor(() => {
      expect(result.current).toBe('latest')
    })

    // true(start #1) → false(discard) → true(start #2) → false(settle)
    expect(onEvaluating.mock.calls).toEqual([[true], [false], [true], [false]])
  })

  it('invokes onCancel on deps change mid-flight but not on a clean settle', async () => {
    const onCancel = vi.fn()
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    const third = createDeferred<string>()
    let call = 0
    const pick = () => {
      call += 1
      if (call === 1)
        return first.promise
      if (call === 2)
        return second.promise
      return third.promise
    }
    const { result, rerender } = await renderHook(
      ({ term }: { term: string } = { term: 'a' }) => useAsync((cancel) => {
        cancel(onCancel)
        return pick()
      }, 'initial', { deps: [term] }),
      { initialProps: { term: 'a' } },
    )
    await vi.waitFor(() => {
      expect(call).toBe(1)
    })

    // eval #1 is still pending → the deps change cancels it
    await rerender({ term: 'b' })
    await vi.waitFor(() => {
      expect(call).toBe(2)
    })
    expect(onCancel).toHaveBeenCalledTimes(1)

    // eval #2 settles cleanly
    second.resolve('second')
    await vi.waitFor(() => {
      expect(result.current).toBe('second')
    })

    // eval #2 already finished → its cancel callbacks must not run
    await rerender({ term: 'c' })
    await vi.waitFor(() => {
      expect(call).toBe(3)
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('reports the onEvaluating true→false sequence', async () => {
    const onEvaluating = vi.fn()
    const deferred = createDeferred<string>()
    const { result } = await renderHook(() => useAsync(() => deferred.promise, '', { onEvaluating }))
    expect(result.current).toBe('')
    await vi.waitFor(() => {
      expect(onEvaluating).toHaveBeenCalledTimes(1)
    })
    expect(onEvaluating).toHaveBeenCalledWith(true)

    deferred.resolve('data')
    await vi.waitFor(() => {
      expect(result.current).toBe('data')
    })
    expect(onEvaluating).toHaveBeenCalledTimes(2)
    expect(onEvaluating.mock.calls).toEqual([[true], [false]])
  })

  it('keeps the current state and calls onError on rejection', async () => {
    const onError = vi.fn()
    const error = new Error('lookup failed')
    const { result } = await renderHook(() => useAsync(
      async () => {
        throw error
      },
      'kept',
      { onError },
    ))
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error)
    })
    expect(result.current).toBe('kept')
  })

  it('default onError uses globalThis.reportError', async () => {
    const originalReportError = globalThis.reportError
    const mockReportError = vi.fn()
    globalThis.reportError = mockReportError
    try {
      const error = new Error('lookup failed')
      const { result } = await renderHook(() => useAsync(
        async () => {
          throw error
        },
        undefined,
      ))
      await vi.waitFor(() => {
        expect(mockReportError).toHaveBeenCalledWith(error)
      })
      expect(result.current).toBeUndefined()
    }
    finally {
      globalThis.reportError = originalReportError
    }
  })

  it('deprecated lazy alias skips the mount evaluation and evaluates on deps change', async () => {
    const evaluationCallback = vi.fn((term: string) => Promise.resolve(`lazy:${term}`))
    const onEvaluating = vi.fn()
    const { result, rerender } = await renderHook(
      ({ term }: { term: string } = { term: 'a' }) => useAsync(() => evaluationCallback(term), 'initial', { deps: [term], lazy: true, onEvaluating }),
      { initialProps: { term: 'a' } },
    )
    expect(evaluationCallback).not.toHaveBeenCalled()
    expect(result.current).toBe('initial')
    expect(onEvaluating).not.toHaveBeenCalled()

    await rerender({ term: 'b' })
    await vi.waitFor(() => {
      expect(result.current).toBe('lazy:b')
    })
    expect(evaluationCallback).toHaveBeenCalledTimes(1)
  })

  it('skipInitial + onCancel: cancels a pending evaluation on deps change and discards its late resolution', async () => {
    const onCancel = vi.fn()
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    let call = 0
    const pick = () => {
      call += 1
      return call === 1 ? first.promise : second.promise
    }
    const { result, rerender } = await renderHook(
      ({ term }: { term: string } = { term: 'a' }) => useAsync((cancel) => {
        cancel(onCancel)
        return pick()
      }, 'initial', { deps: [term], skipInitial: true }),
      { initialProps: { term: 'a' } },
    )
    // skipInitial: nothing evaluates on mount, so nothing to cancel either
    expect(call).toBe(0)
    expect(result.current).toBe('initial')
    expect(onCancel).not.toHaveBeenCalled()

    // the deps change starts the first (still pending) evaluation
    await rerender({ term: 'b' })
    await vi.waitFor(() => {
      expect(call).toBe(1)
    })

    // another deps change mid-flight cancels it exactly once
    await rerender({ term: 'c' })
    await vi.waitFor(() => {
      expect(call).toBe(2)
    })
    expect(onCancel).toHaveBeenCalledTimes(1)

    // the cancelled evaluation's late resolution is discarded
    first.resolve('stale')
    await promiseTimeout(20)
    expect(result.current).toBe('initial')

    second.resolve('latest')
    await vi.waitFor(() => {
      expect(result.current).toBe('latest')
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('unmount discards a late resolution without state updates or warnings', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const onCancel = vi.fn()
      const onEvaluating = vi.fn()
      const deferred = createDeferred<string>()
      const { result, unmount } = await renderHook(() => useAsync((cancel) => {
        cancel(onCancel)
        return deferred.promise
      }, 'initial', { onEvaluating }))
      expect(onEvaluating).toHaveBeenCalledWith(true)

      // cancellation runs on unmount while the evaluation is mid-flight
      unmount()
      expect(onCancel).toHaveBeenCalledTimes(1)

      // the late resolution is discarded: no state update, no onEvaluating
      // call, no React warning
      const onEvaluatingCallsAtUnmount = onEvaluating.mock.calls.length
      deferred.resolve('late')
      await promiseTimeout(20)
      expect(result.current).toBe('initial')
      expect(onEvaluating.mock.calls.length).toBe(onEvaluatingCallsAtUnmount)
      expect(consoleError).not.toHaveBeenCalled()
    }
    finally {
      consoleError.mockRestore()
    }
  })
})
