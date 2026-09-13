import { StrictMode } from 'react'
import { expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useMethods } from '../useMethods'

/**
 * The pin ships no test file — `source/react-use/src` holds no `*.test.*` — so
 * this suite was written against the contract in `index.tsx` and
 * `source/react-use/src/useMethods.ts`, read directly, rather than translated.
 *
 * The cases below deliberately pin three upstream properties that look like
 * defects and are not: the wrapped method set is derived from
 * `createMethods(initialState)` **only**, the wrapper's argument list is
 * **spread** into the method, and both `useMemo` dependency lists re-create the
 * wrapped set whenever their inputs change identity. Each is asserted here so
 * that a future "fix" has to argue with a failing test.
 */

interface Counter {
  count: number
}

/**
 * Module scope on purpose: the hook's two `useMemo` lists are keyed on the
 * identity of these two references, so a stable pair is what keeps the wrapped
 * method set stable across renders.
 */
const counterInitial: Counter = { count: 0 }

function counterMethods(state: Counter) {
  return {
    reset: () => counterInitial,
    increment: () => ({ count: state.count + 1 }),
    decrement: () => ({ count: state.count - 1 }),
  }
}

it('drives the state through the named methods, mirroring the pin', async () => {
  const { result, act } = await renderHook(() => useMethods(counterMethods, counterInitial))

  expect(result.current[0]).toEqual({ count: 0 })

  await act(() => result.current[1].increment())
  expect(result.current[0]).toEqual({ count: 1 })

  // the reducer reads the *current* state on each dispatch: a port that fed it
  // the initial state every time would still be at 1 here
  await act(() => result.current[1].increment())
  expect(result.current[0]).toEqual({ count: 2 })

  await act(() => result.current[1].decrement())
  expect(result.current[0]).toEqual({ count: 1 })

  await act(() => result.current[1].reset())
  // `reset` returns the module-level initial object, so the state is that very
  // reference — the pin only ever stores what the method returns
  expect(result.current[0]).toBe(counterInitial)
})

it('returns [state, wrappedMethods] with void-returning, dispatch-backed wrappers', async () => {
  const { result, act } = await renderHook(() => useMethods(counterMethods, counterInitial))

  // The public shape: `state` is `T`, a wrapper is `(...payload: any) => void`,
  // and the *created* method returns the next state. Those locals are the
  // assertions — a changed contract fails the typecheck of this file.
  const state: Counter = result.current[0]
  const wrapped: (...payload: any) => void = result.current[1].increment
  const created: Counter = counterMethods(counterInitial).increment()

  expect(state).toEqual({ count: 0 })
  expect(created).toEqual({ count: 1 })
  expect(wrapped).toBeTypeOf('function')

  // A wrapper returns `undefined`: it dispatches, it does not compute. The
  // created method's next-state return value never reaches the caller.
  let returned: unknown = 'sentinel'
  await act(() => {
    returned = result.current[1].increment()
  })
  expect(returned).toBeUndefined()
  expect(result.current[0]).toEqual({ count: 1 })
})

it('spreads the wrapper payload into the method, so arguments arrive positionally', async () => {
  const seen: number[][] = []
  const initial: Counter = { count: 0 }

  function createMethods(state: Counter) {
    return {
      // `CreateMethods` types a method as `(payload?: any) => T`, so a method
      // that wants the forwarded arguments positionally takes a rest parameter;
      // a two-positional-parameter method is not assignable to that signature.
      add: (...args: number[]) => {
        seen.push(args)
        return { count: state.count + (args[0] ?? 0) + (args[1] ?? 0) }
      },
    }
  }

  const { result, act } = await renderHook(() => useMethods(createMethods, initial))
  await act(() => result.current[1].add(2, 3))

  // `add` was called with two positional arguments. A port that passed the
  // payload whole — `dispatch({ type, payload })` and then `method(payload)` —
  // would record `[[2, 3]]` here and compute `NaN` for the state.
  expect(seen).toEqual([[2, 3]])
  expect(result.current[0]).toEqual({ count: 5 })
})

it('derives the wrapped method set from createMethods(initialState) only, as the pin does', async () => {
  const initial: Counter = { count: 0 }

  // `dec` exists only once the state is non-zero.
  function createMethods(state: Counter) {
    if (state.count === 0)
      return { inc: () => ({ count: state.count + 1 }) }

    return {
      inc: () => ({ count: state.count + 1 }),
      dec: () => ({ count: state.count - 1 }),
    }
  }

  const { result, act } = await renderHook(() => useMethods(createMethods, initial))

  expect(Object.keys(result.current[1])).toEqual(['inc'])
  expect('dec' in result.current[1]).toBe(false)

  await act(() => result.current[1].inc())
  expect(result.current[0]).toEqual({ count: 1 })

  // ...and `dec` stays unwrapped: `Object.keys` ran once, against the initial
  // state. This is the pin's documented limitation — the state is non-zero now
  // and `createMethods` would produce `dec`, but the wrapper set is not rebuilt.
  expect('dec' in result.current[1]).toBe(false)
  expect(Object.keys(result.current[1])).toEqual(['inc'])

  // The reducer itself is not restricted that way — it calls `createMethods`
  // with the current state on every dispatch.
  await act(() => result.current[1].inc())
  expect(result.current[0]).toEqual({ count: 2 })
})

it('derives the wrapped names from initialState, not from the state at memo time', async () => {
  const initial: Counter = { count: 0 }

  // A fresh function reference per call, whose body branches on the *current*
  // state — so the wrapper memo re-runs on the very commit that moves the state.
  function makeMethods() {
    return (state: Counter) => {
      if (state.count === 0)
        return { inc: () => ({ count: state.count + 1 }) }

      return {
        inc: () => ({ count: state.count + 1 }),
        dec: () => ({ count: state.count - 1 }),
      }
    }
  }

  const { result, act } = await renderHook(() => useMethods(makeMethods(), initial))

  expect(Object.keys(result.current[1])).toEqual(['inc'])

  await act(() => result.current[1].inc())
  expect(result.current[0]).toEqual({ count: 1 })

  // The memo re-ran during that commit, and the state available to it was
  // already 1 — a state where `createMethods` produces `dec`. The pin reads
  // `initialState` instead, so `dec` is still absent. (This is the case the
  // preceding test cannot see: there the memo never re-runs after the state
  // moved, so "read the current state" is indistinguishable from the pin.)
  expect('dec' in result.current[1]).toBe(false)
  expect(Object.keys(result.current[1])).toEqual(['inc'])
})

it('keeps the wrapped set across re-renders when createMethods and initialState are stable', async () => {
  const { result, rerender } = await renderHook(
    (props: { tick: number } = { tick: 0 }) => ({
      tick: props.tick,
      methods: useMethods(counterMethods, counterInitial)[1],
    }),
    { initialProps: { tick: 0 } },
  )

  const first = result.current.methods

  await rerender({ tick: 1 })
  expect(result.current.tick).toBe(1) // the re-render really happened
  expect(result.current.methods).toBe(first) // ...and the wrapped set survived it
})

it('re-creates the wrapped set when createMethods is a new reference each render', async () => {
  const { result, rerender } = await renderHook(
    (props: { tick: number } = { tick: 0 }) => ({
      tick: props.tick,
      // an inline arrow: a new identity on every render, which is exactly what
      // the `[createMethods]` and `[createMethods, initialState]` deps key on
      methods: useMethods((state: Counter) => ({ increment: () => ({ count: state.count + 1 }) }), counterInitial)[1],
    }),
    { initialProps: { tick: 0 } },
  )

  const first = result.current.methods

  await rerender({ tick: 1 })
  // `initialState` is still the module-level constant, so `createMethods` is the
  // only cause: the pin adds no stabilising memo of its own.
  expect(result.current.methods).not.toBe(first)
})

it('re-creates the wrapped set for an equal-but-new initialState, without resetting state', async () => {
  const { result, act, rerender } = await renderHook(
    (props: { tick: number } = { tick: 0 }) => ({
      tick: props.tick,
      // an inline object literal: a new reference every render, even when equal
      value: useMethods(counterMethods, { count: 0 }),
    }),
    { initialProps: { tick: 0 } },
  )

  await act(() => result.current.value[1].increment())
  expect(result.current.value[0]).toEqual({ count: 1 })

  const before = result.current.value[1]

  await rerender({ tick: 1 })
  // the second dep changed identity, so the wrappers are rebuilt...
  expect(result.current.value[1]).not.toBe(before)
  // ...while the state is untouched: React reads `initialState` on the first
  // render only, so the new equal-but-different object cannot reset it.
  expect(result.current.value[0]).toEqual({ count: 1 })
})

it('applies each dispatch once under <StrictMode>', async () => {
  function Counter() {
    const [state, { increment }] = useMethods(counterMethods, counterInitial)

    // Upstream's docs wire the method straight to `onClick`, which forwards the
    // click event as the payload — the spread path again, and the method ignores
    // it. Double-invoking the render (and the reducer) must still commit one
    // increment: an impure reducer would show 2 here.
    return <button onClick={increment}>{`count: ${state.count}`}</button>
  }

  const screen = await render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.getByRole('button').click()
  await expect.element(screen.getByText('count: 1')).toBeVisible()

  await screen.getByRole('button').click()
  await expect.element(screen.getByText('count: 2')).toBeVisible()
})
