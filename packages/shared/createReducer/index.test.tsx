import { createReducer } from '@reause/shared'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'

/**
 * There is **no upstream test file to mirror** for this factory: the pinned
 * `source/react-use/src` tree ships no test suite at all (zero `*.test.*`
 * files), and `src/factory/` holds source files only. This suite is therefore
 * written against the contract the port promises, not translated from upstream.
 */

type Action
  = | { type: 'inc' }
    | { type: 'add', payload: number }
    | { type: 'replace', payload: number }

function counterReducer(state: number, action: Action): number {
  switch (action.type) {
    case 'inc':
      return state + 1
    case 'add':
      return state + action.payload
    case 'replace':
      return action.payload
    default:
      return state
  }
}

/** A behaviourally identical reducer with a *different* identity. */
function freshCounterReducer(state: number, action: Action): number {
  return counterReducer(state, action)
}

describe('createReducer', () => {
  it('is exported from the @reause/shared barrel', () => {
    expect(createReducer).toBeTypeOf('function')
  })

  it('returns a [state, dispatch] tuple that reduces through the given reducer', async () => {
    const useCounterReducer = createReducer<Action, number>()

    const { result, act } = await renderHook(() => useCounterReducer(counterReducer, 0))

    expect(result.current).toHaveLength(2)
    expect(result.current[0]).toBe(0)
    expect(result.current[1]).toBeTypeOf('function')

    await act(() => {
      result.current[1]({ type: 'inc' })
    })
    expect(result.current[0]).toBe(1)

    await act(() => {
      result.current[1]({ type: 'add', payload: 4 })
    })
    expect(result.current[0]).toBe(5)

    await act(() => {
      result.current[1]({ type: 'replace', payload: 100 })
    })
    expect(result.current[0]).toBe(100)
  })

  it('keeps the dispatch identity stable across re-renders', async () => {
    const useCounterReducer = createReducer<Action, number>()

    const { result, act, rerender } = await renderHook(() => useCounterReducer(counterReducer, 0))

    const firstDispatch = result.current[1]

    await act(() => {
      result.current[1]({ type: 'inc' })
    })
    await rerender()
    await rerender()

    // no re-composition happened, so `dispatch` is literally the same function
    expect(result.current[1]).toBe(firstDispatch)
    expect(result.current[0]).toBe(1)
  })

  it('composes rapid dispatches in one tick — the ref is written synchronously', async () => {
    const useCounterReducer = createReducer<Action, number>()

    const { result, act } = await renderHook(() => useCounterReducer(counterReducer, 0))

    await act(() => {
      result.current[1]({ type: 'inc' })
      result.current[1]({ type: 'inc' })
      result.current[1]({ type: 'add', payload: 10 })
    })

    // 12, not 1 + 10: every dispatch read the state the previous one wrote
    expect(result.current[0]).toBe(12)
  })

  it('returns the action it was given (the cast-free runtime promise middleware relies on)', async () => {
    const useCounterReducer = createReducer<Action, number>()

    const { result, act } = await renderHook(() => useCounterReducer(counterReducer, 0))

    await act(() => {
      expect(result.current[1]({ type: 'add', payload: 3 }))
        .toEqual({ type: 'add', payload: 3 })
    })
    expect(result.current[0]).toBe(3)
  })

  it('returns the action only as far as the chain forwards it', async () => {
    // The promise belongs to the innermost dispatch; a middleware that does not
    // `return next(action)` swallows it — which is why the public
    // `Dispatch<Action>` type can honestly say `void`.
    const useSwallowingReducer = createReducer<Action, number>(
      () => next => (action) => {
        next(action)
      },
    )

    const { result, act } = await renderHook(() => useSwallowingReducer(counterReducer, 0))

    await act(() => {
      expect(result.current[1]({ type: 'inc' })).toBeUndefined()
    })
    // the reducer still ran
    expect(result.current[0]).toBe(1)
  })

  it('lets a middleware read store.getState() mid-dispatch, before React re-renders', async () => {
    // `rendered` records the state of every committed/render-phase tuple, so the
    // middleware can prove its `getState()` is *ahead* of the last render.
    const rendered: number[] = []
    const mid: { getState: number, rendered: number | undefined }[] = []

    const useProbingReducer = createReducer<Action, number>(
      store => next => (action) => {
        mid.push({ getState: store.getState(), rendered: rendered.at(-1) })
        const result = next(action)
        // the reducer's write is already visible through the same store
        mid.push({ getState: store.getState(), rendered: rendered.at(-1) })
        return result
      },
    )

    const { result, act } = await renderHook(() => {
      const tuple = useProbingReducer(counterReducer, 0)
      rendered.push(tuple[0])
      return tuple
    })

    await act(() => {
      result.current[1]({ type: 'add', payload: 5 })
    })

    // before the reducer: the mount state. After `next`: 5 — the middleware saw
    // the new state while the *rendered* state was still 0.
    expect(mid).toEqual([
      { getState: 0, rendered: 0 },
      { getState: 5, rendered: 0 },
    ])
    expect(rendered).toEqual([0, 5])
    expect(result.current[0]).toBe(5)
  })

  it('lets a middleware rewrite the action before it reaches the reducer', async () => {
    const useRewritingReducer = createReducer<Action, number>(
      () => next => action =>
        next(action.type === 'add' ? { type: 'replace', payload: action.payload * 10 } : action),
    )

    const { result, act } = await renderHook(() => useRewritingReducer(counterReducer, 0))

    await act(() => {
      result.current[1]({ type: 'add', payload: 2 })
    })

    // the reducer only ever saw the replacement action
    expect(result.current[0]).toBe(20)
  })

  it('lets a middleware call store.dispatch, re-entering the whole chain', async () => {
    const entered: string[] = []

    const useReentrantReducer = createReducer<Action, number>(
      store => next => (action) => {
        if (action.type === 'add' && action.payload === 0) {
          entered.push('middleware')
          store.dispatch({ type: 'inc' })
          store.dispatch({ type: 'inc' })
          return
        }
        entered.push('pass')
        return next(action)
      },
    )

    const { result, act } = await renderHook(() => useReentrantReducer(counterReducer, 0))

    await act(() => {
      result.current[1]({ type: 'add', payload: 0 })
    })

    // both re-entrant dispatches went back through this middleware…
    expect(entered).toEqual(['middleware', 'pass', 'pass'])
    // …and composed: each `inc` saw the previous one's state
    expect(result.current[0]).toBe(2)
  })

  it('composes the chain in the pin\'s order: first middleware outermost', async () => {
    const order: string[] = []

    // upstream uses reduceRight, so `middlewares[0]` wraps `middlewares[1]`
    const useOrderedReducer = createReducer<Action, number>(
      () => next => (action) => {
        order.push('first:before')
        const result = next(action)
        order.push('first:after')
        return result
      },
      () => next => (action) => {
        order.push('second:before')
        const result = next(action)
        order.push('second:after')
        return result
      },
    )

    const { result, act } = await renderHook(() => useOrderedReducer(counterReducer, 0))

    await act(() => {
      result.current[1]({ type: 'inc' })
    })

    expect(order).toEqual(['first:before', 'second:before', 'second:after', 'first:after'])
    expect(result.current[0]).toBe(1)
  })

  it('re-composes the chain when the `dispatch` dependency changes (reducer identity)', async () => {
    const calls: string[] = []

    const { result, act, rerender } = await renderHook(
      ({ reducer, tag }: { reducer: typeof counterReducer, tag: string } = { reducer: counterReducer, tag: 'a' }) =>
        createReducer<Action, number>(
          () => next => (action) => {
            calls.push(tag)
            return next(action)
          },
        )(reducer, 0),
      { initialProps: { reducer: counterReducer, tag: 'a' } },
    )

    await act(() => {
      result.current[1]({ type: 'inc' })
    })
    expect(calls).toEqual(['a'])

    // a new reducer identity is what changes `dispatch`, and the pin's
    // `useUpdateEffect([dispatch])` re-composes the chain from this render
    await rerender({ reducer: freshCounterReducer, tag: 'b' })

    // the render that observed the change already handed the caller the previous
    // chain — the re-composed one arrives with the next render
    await act(() => {
      result.current[1]({ type: 'inc' })
    })
    expect(calls).toEqual(['a', 'a'])

    await act(() => {
      result.current[1]({ type: 'inc' })
    })
    expect(calls).toEqual(['a', 'a', 'b'])
    expect(result.current[0]).toBe(3)
  })

  it('keeps the composed chain when only the middleware list changes (`dispatch` is unchanged)', async () => {
    const calls: string[] = []

    // This is the pin's real dependency, and it is narrower than "the middleware
    // list changed": `dispatch` is `useCallback(..., [reducer])`, so a brand-new
    // middleware function with the same reducer reference re-composes nothing.
    const { result, act, rerender } = await renderHook(
      ({ tag }: { tag: string } = { tag: 'a' }) =>
        createReducer<Action, number>(
          () => next => (action) => {
            calls.push(tag)
            return next(action)
          },
        )(counterReducer, 0),
      { initialProps: { tag: 'a' } },
    )

    await act(() => {
      result.current[1]({ type: 'inc' })
    })
    expect(calls).toEqual(['a'])

    await rerender({ tag: 'b' })
    await act(() => {
      result.current[1]({ type: 'inc' })
    })

    // still the mount-time middleware: no re-composition without a new `dispatch`
    expect(calls).toEqual(['a', 'a'])
    expect(result.current[0]).toBe(2)
  })

  it('applies `initializer` when provided and defaults to identity', async () => {
    const useDefaultInitializer = createReducer<Action, number>()
    const plain = await renderHook(() => useDefaultInitializer(counterReducer, 7))
    expect(plain.result.current[0]).toBe(7)

    // upstream's third parameter, applied to `initialState`
    const useMultiplyInitializer = createReducer<Action, number>()
    const initialized = await renderHook(
      () => useMultiplyInitializer(counterReducer, 7, (value: number) => value * 10),
    )
    expect(initialized.result.current[0]).toBe(70)

    // the initialized value is the base `dispatch` reduces from
    await initialized.act(() => {
      initialized.result.current[1]({ type: 'inc' })
    })
    expect(initialized.result.current[0]).toBe(71)
  })

  it('does not warn or leak when unmounted, and a fresh mount starts clean', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const useCounterReducer = createReducer<Action, number>()
      const { result, act, unmount } = await renderHook(() => useCounterReducer(counterReducer, 0))

      await act(() => {
        result.current[1]({ type: 'inc' })
      })
      expect(result.current[0]).toBe(1)

      const dispatchAfterUnmount = result.current[1]
      await unmount()

      // the hook owns no pending update (and no timer): dispatching into the
      // unmounted tree is a silent no-op rather than a warning or a throw
      expect(() => dispatchAfterUnmount({ type: 'inc' })).not.toThrow()
      expect(errorSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()

      // nothing leaked into a later mount of the same hook
      const fresh = await renderHook(() => useCounterReducer(counterReducer, 0))
      expect(fresh.result.current[0]).toBe(0)
    }
    finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })

  it('drives a real component through the factory', async () => {
    const log: string[] = []

    const useCounterReducer = createReducer<Action, number>(
      () => next => (action) => {
        log.push(action.type)
        return next(action)
      },
    )

    function Counter() {
      const [count, dispatch] = useCounterReducer(counterReducer, 0)

      return (
        <div>
          <span>{`count ${count}`}</span>
          <button onClick={() => dispatch({ type: 'add', payload: 2 })}>add 2</button>
        </div>
      )
    }

    const screen = await render(<Counter />)

    await expect.element(screen.getByText('count 0')).toBeVisible()

    await screen.getByRole('button', { name: 'add 2' }).click()
    await expect.element(screen.getByText('count 2')).toBeVisible()

    await screen.getByRole('button', { name: 'add 2' }).click()
    await expect.element(screen.getByText('count 4')).toBeVisible()

    expect(log).toEqual(['add', 'add'])
  })
})
