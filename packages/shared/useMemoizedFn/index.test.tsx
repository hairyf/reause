import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useMemoizedFn } from '../useMemoizedFn'

/**
 * Mirrors ahooks' `source/ahooks/packages/hooks/src/useMemoizedFn/__tests__/index.spec.ts`
 * — its single case (the memoized function reads the latest `count` while
 * keeping the identity it was first handed) is reproduced decision for decision
 * — and adds the rest of the port's contract: the caller's `this` reaches `fn`
 * (the wrapper is a plain function, never an arrow), arguments and the return
 * value pass through, the wrapper is a different reference from `fn` and
 * inherits none of `fn`'s properties (upstream FAQ, alibaba/hooks#2273), a
 * non-function argument is reported through `console.error` in dev, and server
 * rendering is silent. The production half of the dev gate is reasoned, not
 * tested: this suite can only run in the non-production realm the gate admits.
 *
 * Upstream drives its case with `@testing-library/react`; this port uses
 * `vitest-browser-react`, the repo's browser project, exactly as the sibling
 * ports do. The `act` below is the one `renderHook` hands back — the same shape
 * `useCounter`'s test uses — rather than React's standalone `act`, which this
 * browser environment is not configured for (see `useLockFn`'s test note).
 */
const NON_FUNCTION_MESSAGE = 'useMemoizedFn expected parameter is a function, got string'

function errorMessages(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map(call => call.map(String).join(' '))
}

function useCount() {
  const [count, setCount] = useState(0)

  const addCount = () => setCount(c => c + 1)

  const memoizedFn = useMemoizedFn(() => count)

  return { addCount, memoizedFn }
}

describe('useMemoizedFn', () => {
  it('is defined', () => {
    expect(useMemoizedFn).toBeDefined()
  })

  it('declares a signature that follows `fn`\'s parameters and return type', () => {
    // Type-level only; the hook is never called here. The wrapper keeps `fn`'s
    // parameter list and its return type — the `PickFunction<T>` contract.
    const declared = () => useMemoizedFn((a: number, b: string) => `${a}${b}`)

    expectTypeOf(declared).returns.parameters.toEqualTypeOf<[number, string]>()
    expectTypeOf(declared).returns.returns.toEqualTypeOf<string>()
  })

  it('mirrors upstream: reads the latest state and keeps its identity across the update', async () => {
    // Upstream's own case: the first call sees 0, the state update happens, and
    // the *same* function reference (captured before the update) now sees 1.
    // `toBe` is the identity check upstream writes as `toEqual`; for two
    // function values the two are the same check.
    const { result, act } = await renderHook(() => useCount())

    const currentFn = result.current.memoizedFn
    expect(currentFn()).toBe(0)

    await act(() => result.current.addCount())

    expect(result.current.memoizedFn).toBe(currentFn)
    expect(result.current.memoizedFn()).toBe(1)
  })

  it('keeps one identity while `fn` is rebuilt on every render', async () => {
    // The inline arrow is a fresh function each render, so `fnRef` is refreshed
    // while the returned wrapper stays put — the behaviour `useCallback` cannot
    // give without the caller supplying deps.
    const { result, rerender } = await renderHook((n: number = 0) => useMemoizedFn(() => n))

    const first = result.current
    expect(first()).toBe(0)

    await rerender(1)

    expect(result.current).toBe(first)
    expect(result.current()).toBe(1)
  })

  it('forwards the caller\'s `this` to the latest `fn`', async () => {
    const { result } = await renderHook(() =>
      useMemoizedFn(function (this: { tag: string }) {
        return this.tag
      }),
    )

    expect(result.current.call({ tag: 'forwarded' })).toBe('forwarded')
  })

  it('passes arguments through and returns what `fn` returned', async () => {
    const { result } = await renderHook(() => useMemoizedFn((a: number, b: string) => `${a}:${b}`))

    expect(result.current(1, 'x')).toBe('1:x')
  })

  it('returns a different reference from `fn` and inherits none of its properties', async () => {
    // Upstream's FAQ: the wrapper is built from scratch, so properties attached
    // to `fn` are not carried over — reach for `useCallback` when they matter.
    const fn = Object.assign(() => 'called', { meta: 'kept only on `fn`' })
    const { result } = await renderHook(() => useMemoizedFn(fn))

    expect(result.current).not.toBe(fn)
    expect(result.current()).toBe('called')
    expect((result.current as unknown as { meta?: string }).meta).toBeUndefined()
  })

  it('reports a non-function argument through `console.error` in dev', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      // A JS caller can pass anything. Both assertions pin the dev gate: the
      // bundler replaced `process.env.NODE_ENV` (here `test`) with a literal
      // while defining no `process` object, so this file imported the hook
      // without a ReferenceError and the guard still ran.
      expect(process.env.NODE_ENV).not.toBe('production')
      expect(typeof process).toBe('undefined')

      await renderHook(() => useMemoizedFn('nope' as unknown as () => void))
      expect(errorMessages(error)).toContain(NON_FUNCTION_MESSAGE)

      // …and it stays quiet for a real function.
      const before = errorMessages(error)
      await renderHook(() => useMemoizedFn(() => 'fine'))
      expect(errorMessages(error)).toEqual(before)
    }
    finally {
      error.mockRestore()
    }
  })

  it('is SSR-safe: server rendering returns the wrapper without warning or throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    function Probe() {
      const show = useMemoizedFn(() => 'never called during SSR')

      return <span>{typeof show}</span>
    }

    const html = renderToString(<Probe />)

    expect(html).toContain('function')
    expect([...errorMessages(error), ...errorMessages(warn)]).toEqual([])

    error.mockRestore()
    warn.mockRestore()
  })
})
