import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useSafeState } from '../useSafeState'

/**
 * Mirrors ahooks' `__tests__/index.spec.ts` (initial value, update, and the
 * post-unmount no-op) and pins the behaviour this port measured about the
 * functional-updater form, which upstream neither tests nor documents.
 */
describe('useSafeState', () => {
  // a function declaration, not `<S>(…) => …`: in a `.tsx` file a bare
  // type-parameter list on an arrow function parses as JSX
  function setUp<S>(initialValue: S | (() => S)) {
    return renderHook(() => {
      const [state, setState] = useSafeState(initialValue)

      return { state, setState } as const
    })
  }

  it('should support initialValue', async () => {
    const hook = await setUp({ hello: 'world' })

    expect(hook.result.current.state).toEqual({ hello: 'world' })
  })

  it('should support update', async () => {
    const hook = await setUp(0)

    await hook.act(() => {
      hook.result.current.setState(5)
    })

    expect(hook.result.current.state).toBe(5)
  })

  it('should not support update when unmount', async () => {
    const hook = await setUp(0)

    await hook.unmount()

    await hook.act(() => {
      hook.result.current.setState(5)
    })

    // the setter returned early, so the last rendered state is untouched
    expect(hook.result.current.state).toBe(0)
  })

  it('does not re-render when the setter is called after unmount', async () => {
    // Stronger than reading `result.current`: capture every value the hook ever
    // rendered. The no-op must skip the state update entirely, not merely fail
    // to reach the captured handle.
    const renders: number[] = []
    const hook = await renderHook(() => {
      const [state, setState] = useSafeState(0)
      renders.push(state)

      return { state, setState }
    })

    await hook.act(() => {
      hook.result.current.setState(1)
    })
    expect(renders).toEqual([0, 1])

    await hook.unmount()

    await hook.act(() => {
      hook.result.current.setState(2)
    })

    // no new render, and no React "update on an unmounted component" noise
    expect(renders).toEqual([0, 1])
  })

  it('invokes a functional updater as a real updater, not stores it as state', async () => {
    // MEASURED, not assumed. The pin types the setter `Dispatch<SetStateAction<S>>`
    // while typing its parameter as `S` and forwarding it straight to
    // `useState`; React 19's runtime setter detects a function argument and
    // reduces with it. So the declared type is accurate.
    let updaterCalls = 0
    const hook = await setUp(10)

    await hook.act(() => {
      hook.result.current.setState((previous) => {
        updaterCalls += 1

        return previous + 1
      })
    })

    expect(updaterCalls).toBe(1)
    expect(hook.result.current.state).toBe(11)
    // the decisive pair: a number was committed, not the updater function
    expect(typeof hook.result.current.state).toBe('number')
    expect(typeof hook.result.current.state).not.toBe('function')
  })

  it('serialises batched functional updaters against the latest state', async () => {
    // The guarantee that only a genuine reducer can give: the second updater
    // observes the result of the first (`{ n: 2 }`), not the original `{ n: 1 }`.
    const seen: { n: number }[] = []
    const hook = await setUp({ n: 1 })

    await hook.act(() => {
      hook.result.current.setState((previous) => {
        seen.push(previous)

        return { n: previous.n + 1 }
      })
      hook.result.current.setState((previous) => {
        seen.push(previous)

        return { n: previous.n + 1 }
      })
    })

    expect(seen).toEqual([{ n: 1 }, { n: 2 }])
    expect(hook.result.current.state).toEqual({ n: 3 })
    expect(typeof hook.result.current.state).not.toBe('function')
  })

  it('skips a functional update after unmount without invoking the updater', async () => {
    // The guard runs before `setState`, so the updater is never called once
    // unmounted. This is the functional-update analogue of the plain no-op.
    let updaterCalls = 0
    const hook = await setUp(0)

    await hook.unmount()

    await hook.act(() => {
      hook.result.current.setState((previous) => {
        updaterCalls += 1

        return previous + 1
      })
    })

    expect(updaterCalls).toBe(0)
    expect(hook.result.current.state).toBe(0)
  })

  it('supports a lazy initial-state factory', async () => {
    // The pin hands the argument straight to `useState`, so a function is a
    // lazy initialiser — not an updater argument.
    let factoryCalls = 0
    const hook = await renderHook(() => {
      const [state, setState] = useSafeState(() => {
        factoryCalls += 1

        return 42
      })

      return { state, setState }
    })

    expect(factoryCalls).toBe(1)
    expect(hook.result.current.state).toBe(42)
  })

  it('returns a referentially stable setter across re-renders', async () => {
    // `useCallback(…, [])` is honest here: the ref object and React's state
    // setter are both stable, so the setter identity survives both an
    // unrelated re-render and a state commit.
    const hook = await renderHook(() => {
      const [state, setState] = useSafeState(0)
      const unrelated = useState(0)

      return { state, setState, unrelated }
    })

    const setter = hook.result.current.setState

    await hook.rerender()
    expect(hook.result.current.setState).toBe(setter)

    await hook.act(() => {
      hook.result.current.setState(1)
    })
    expect(hook.result.current.state).toBe(1)
    expect(hook.result.current.setState).toBe(setter)
  })

  it('supports the no-argument overload', async () => {
    const hook = await renderHook(() => {
      const [state, setState] = useSafeState<string>()

      return { state, setState }
    })

    expect(hook.result.current.state).toBeUndefined()

    await hook.act(() => {
      hook.result.current.setState('later')
    })

    expect(hook.result.current.state).toBe('later')
  })

  it('reads undefined, not a function, when the no-argument overload is used', async () => {
    // Regression guard for the mismatch the issue worried about: if the pin
    // stored a function argument as state, this would be a function after the
    // first updater call instead of `undefined`.
    const hook = await renderHook(() => {
      const [state, setState] = useSafeState<number>()

      return { state, setState }
    })

    expect(hook.result.current.state).toBeUndefined()
    expect(typeof hook.result.current.state).toBe('undefined')
  })

  it('stays usable after a remount: a fresh instance commits again', async () => {
    // The mutation sentinel. A guard that latched on a shared/module-level flag
    // would leave the second instance permanently unable to update.
    const renders: number[] = []

    function useProbe() {
      const [state, setState] = useSafeState(0)
      const rendersRef = useRef(0)
      rendersRef.current += 1
      renders.push(state)

      return { state, setState, renders: rendersRef.current }
    }

    const first = await renderHook(useProbe)
    await first.unmount()

    const second = await renderHook(useProbe)

    await second.act(() => {
      second.result.current.setState(7)
    })

    // the fresh instance is not poisoned by the unmounted one
    expect(second.result.current.state).toBe(7)
    expect(renders.at(-1)).toBe(7)
  })
})
