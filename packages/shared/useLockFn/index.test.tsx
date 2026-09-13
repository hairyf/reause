import { StrictMode, useCallback } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useLockFn } from '../useLockFn'

/**
 * Mirrors ahooks' `source/ahooks/packages/hooks/src/useLockFn/__tests__/index.spec.ts`
 * — both of its cases (the drop-while-in-flight case, and the case that the
 * wrapper's identity follows `fn`'s) are reproduced — and adds the parts of the
 * contract the issue calls out explicitly: that a dropped call **resolves to
 * `undefined`** rather than rejecting, that it settles **immediately** while the
 * in-flight call is still pending, that a **rejected** call rethrows *and*
 * releases the lock, that the lock is **per instance** rather than global, and
 * that the lock **survives a new wrapper identity** when `fn` is unstable.
 *
 * Upstream drives its cases with `@testing-library/react` and wall-clock sleeps;
 * this port uses `vitest-browser-react`, the repo's browser project, exactly as
 * the sibling ports do. Both of upstream's cases are reproduced, but **neither
 * is driven by the clock**, for two measured reasons:
 *
 * - Upstream's drop case races a 50 ms action against 30 ms probes. Measured in
 *   this runner (chromium), a pending `setTimeout(resolve, 50)` fired **11.3 ms
 *   late**, coalesced with a concurrently pending 30 ms timer, so the probe ran
 *   before* the lock was released and upstream's window (60 ms > 50 ms) is not
 *   dependable here. The case below keeps all five of upstream's drop/allow
 *   decisions and drives them with an explicit gate.
 * - Upstream's identity case moves `fn` with an internal state update wrapped in
 *   `act`. This project's browser environment is not configured for `act` —
 *   React warns "The current testing environment is not configured to support
 *   act(...)" (measured) — so the case below changes `tag`, and therefore `fn`'s
 *   identity, through a rerender prop instead, which needs no `act`.
 *
 * **One upstream statement is wrong, and the extra case measures it.** The
 * issue's mapping notes say an unstable `fn` "recreates the wrapper (and its
 * lock) every render". The wrapper is recreated — `useCallback` is keyed on
 * `[fn]` — but the lock is **not**: it lives in `useRef`, which returns the same
 * object across renders. A call started by the old wrapper is therefore still
 * in flight as far as the new wrapper is concerned, and the new wrapper drops
 * the next call. Only a remount hands out a fresh lock. The
 * `the lock survives a new wrapper identity` case below fails against any port
 * that keeps the flag in a closure variable instead of a ref.
 */
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

describe('useLockFn', () => {
  it('is defined', () => {
    expect(useLockFn).toBeDefined()
  })

  it('declares the pin\'s signature — a dropped call widens the result to `Promise<V | undefined>`', () => {
    // Type-level only; the hook is never called. `V` is `number` and the dropped
    // branch contributes `undefined`, so declaring `Promise<number>` here would
    // be the narrowing this asserts against.
    const locked = () => useLockFn(async (step: number) => step + 1)
    expectTypeOf(locked).returns.toEqualTypeOf<(...args: [number]) => Promise<number | undefined>>()

    // `P` is preserved, so the wrapper's parameters follow `fn`'s.
    const args = () => useLockFn(async (a: number, b: string) => `${a}${b}`)
    expectTypeOf(args).returns.toEqualTypeOf<(...args: [number, string]) => Promise<string | undefined>>()
  })

  it('mirrors upstream: a call made while another is in flight is dropped', async () => {
    // Upstream's own `should work` case, decision for decision: while a call is
    // pending, neither call 2 nor call 3 reaches `fn`; once the first call has
    // settled, call 4 runs; and call 5 is dropped because call 4 is still
    // running. Upstream's clock is replaced by a gate — see the note on this
    // file — but every drop/allow decision, and the argument each surviving call
    // receives, is upstream's.
    const gates = [createDeferred<void>(), createDeferred<void>()]
    const calls: number[] = []
    const fn = async (step: number) => {
      calls.push(step)
      await gates[Math.min(calls.length - 1, gates.length - 1)].promise
    }
    const { result } = await renderHook(() => useLockFn(fn))

    const first = result.current(1)
    result.current(2)
    result.current(3)
    expect(calls).toEqual([1])

    gates[0].resolve()
    await first
    // The first call has fully settled, so the lock is free again …
    const fourth = result.current(4)
    expect(calls).toEqual([1, 4])
    // … and is held for as long as the fourth call runs.
    result.current(5)
    expect(calls).toEqual([1, 4])

    gates[1].resolve()
    await fourth
    await expect(result.current(6)).resolves.toBeUndefined()
    expect(calls).toEqual([1, 4, 6])
  })

  it('mirrors upstream: the wrapper\'s identity follows `fn`\'s identity', async () => {
    // Upstream's `should same`: re-rendering without changing `fn` hands back the
    // same wrapper, and changing `fn` hands back a new one. Upstream moves `fn`
    // with an internal `useState` update wrapped in `act`; this environment is
    // not configured for `act`, so `tag` is moved by a rerender prop — the same
    // input change (`fn`'s identity), reached without `act`.
    const { result, rerender } = await renderHook((tag: boolean = false) => {
      const fn = useCallback(async () => tag, [tag])
      const locked = useLockFn(fn)

      return { locked }
    })

    const preLocked = result.current.locked
    await rerender(false)
    expect(result.current.locked).toEqual(preLocked)

    await rerender(true)
    expect(result.current.locked).not.toEqual(preLocked)
  })

  it('a dropped call resolves to `undefined` immediately — it neither queues nor rejects', async () => {
    const gate = createDeferred<number>()
    const fn = vi.fn(() => gate.promise)
    const { result } = await renderHook(() => useLockFn(fn))

    const running = result.current()
    const dropped = result.current()

    // The in-flight call consumed `fn`; the dropped call never reached it.
    expect(fn).toHaveBeenCalledTimes(1)

    // `dropped` is already settled while `running` is still pending: no queueing
    // and no awaiting the call it lost to.
    let droppedSettled = false
    let runningSettled = false
    void dropped.then(() => {
      droppedSettled = true
    })
    void running.then(() => {
      runningSettled = true
    })
    await Promise.resolve()
    expect(droppedSettled).toBe(true)
    expect(runningSettled).toBe(false)

    gate.resolve(42)
    await expect(running).resolves.toBe(42)
    // Resolved with `undefined` — not rejected. Callers distinguish "dropped"
    // from "failed" on exactly this.
    await expect(dropped).resolves.toBeUndefined()
  })

  it('rethrows the rejection and releases the lock: a failure does not deadlock the hook', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered')
    const { result } = await renderHook(() => useLockFn(fn))

    // The error reaches the caller unchanged …
    await expect(result.current()).rejects.toThrow('boom')

    // … and the `finally` has already cleared the lock. A port without the
    // `finally` leaves `lockRef.current === true` and drops this call, so the
    // hook is dead for the life of the component.
    await expect(result.current()).resolves.toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('drops the overlapping call while a to-be-rejected call is pending, then frees the lock', async () => {
    const gate = createDeferred<number>()
    const fn = vi.fn()
      .mockImplementationOnce(() => gate.promise)
      .mockResolvedValueOnce(7)
    const { result } = await renderHook(() => useLockFn(fn))

    const failing = result.current()
    const dropped = result.current()
    expect(fn).toHaveBeenCalledTimes(1)

    gate.reject(new Error('network'))
    await expect(failing).rejects.toThrow('network')
    await expect(dropped).resolves.toBeUndefined()

    // The lock was held across the whole failing call and released on its way
    // out, whatever the outcome.
    await expect(result.current()).resolves.toBe(7)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('the lock is per hook instance, not global', async () => {
    const firstGate = createDeferred<number>()
    const secondGate = createDeferred<number>()
    const first = await renderHook(() => useLockFn(() => firstGate.promise))
    const second = await renderHook(() => useLockFn(() => secondGate.promise))

    const a = first.result.current()
    const b = second.result.current()

    // A module-level lock would have dropped `b` and resolved it to `undefined`.
    firstGate.resolve(1)
    secondGate.resolve(2)
    await expect(a).resolves.toBe(1)
    await expect(b).resolves.toBe(2)
  })

  it('the lock survives a new wrapper identity: an unstable `fn` does not hand out a fresh lock', async () => {
    const gate = createDeferred<number>()
    const calls: number[] = []
    const { result, rerender } = await renderHook((tag: number = 0) => {
      const fn = useCallback(async () => {
        calls.push(tag)
        return gate.promise
      }, [tag])
      const locked = useLockFn(fn)

      return { locked }
    })

    const before = result.current.locked
    const inFlight = before()
    expect(calls).toEqual([0])

    // A new `fn` identity re-creates the wrapper on the next render …
    await rerender(1)
    const after = result.current.locked
    expect(after).not.toBe(before)

    // … but the lock lives in the `useRef`, which the new render did not touch,
    // so the *new* wrapper drops a call the *old* wrapper started. A port that
    // kept the flag in a closure would run `fn` again and record `[0, 1]`.
    const dropped = after()
    expect(calls).toEqual([0])

    gate.resolve(9)
    await expect(inFlight).resolves.toBe(9)
    await expect(dropped).resolves.toBeUndefined()
  })

  it('passes arguments through and resolves with the value `fn` produced', async () => {
    const { result } = await renderHook(() => useLockFn(async (a: number, b: string) => `${a}:${b}`))

    await expect(result.current(1, 'x')).resolves.toBe('1:x')
  })

  it('holds the lock across the double-invoked render under StrictMode', async () => {
    const gate = createDeferred<number>()
    const fn = vi.fn(() => gate.promise)
    let locked: (() => Promise<number | undefined>) | undefined

    function Probe() {
      locked = useLockFn(fn)

      return <span>probe</span>
    }

    const screen = await render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    )

    // The ref is the same object across StrictMode's double render, so the lock
    // still drops the overlapping call.
    const running = locked!()
    const dropped = locked!()
    expect(fn).toHaveBeenCalledTimes(1)

    gate.resolve(3)
    await expect(running).resolves.toBe(3)
    await expect(dropped).resolves.toBeUndefined()

    await screen.unmount()
  })

  it('sSR-safe: server rendering does not warn or throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    function Probe() {
      const locked = useLockFn(async () => 'never called during SSR')

      return <span>{typeof locked}</span>
    }

    const html = renderToString(<Probe />)
    const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .map(call => call.map(String).join(' '))

    expect(html).toContain('function')
    expect(messages).toEqual([])

    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
