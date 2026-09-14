import type { Predicate } from '../usePreviousDistinct'
import { StrictMode, useRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { usePreviousDistinct } from '../usePreviousDistinct'

// ---------------------------------------------------------------------------
// The oracle: a line-for-line copy of the pin, NOT the port.
//
// `usePreviousDistinct` adopts the shared `useIsFirstRender` in place of the
// pin's private `useFirstMountState` helper, so the tests below need an
// independent reference to measure that substitution against. These two
// functions are that reference, transcribed from
// `source/react-use/src/useFirstMountState.ts` and
// `source/react-use/src/usePreviousDistinct.ts` — the same 13 + 22 lines, with
// only the pin's removed zero-argument `useRef()` overload adapted to
// `@types/react` 19. They are intentionally *not* imported from the package:
// importing the port's own helpers would make the probe compare the port with
// itself.
// ---------------------------------------------------------------------------

/** The pin's `useFirstMountState`. */
function useFirstMountState(): boolean {
  const isFirst = useRef(true)

  if (isFirst.current) {
    isFirst.current = false

    return true
  }

  return isFirst.current
}

/** The pin's `usePreviousDistinct`, built on the pin's own helper. */
function usePreviousDistinctReference<T>(
  value: T,
  compare: Predicate<T> = (prev, next) => prev === next,
): T | undefined {
  const prevRef = useRef<T | undefined>(undefined)
  const curRef = useRef<T>(value)
  const isFirstMount = useFirstMountState()

  if (!isFirstMount && !compare(curRef.current, value)) {
    prevRef.current = curRef.current
    curRef.current = value
  }

  return prevRef.current
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

it('returns undefined on the first render', async () => {
  const { result } = await renderHook(() => usePreviousDistinct(0))

  expect(result.current).toBeUndefined()
})

it('first-render short circuit holds even for a comparator that always reports a change', async () => {
  // The mount pass is skipped *before* `compare` is consulted, so a comparator
  // that answers "different" for every pair — including the very first pair,
  // where both arguments are the same value — must still yield `undefined`.
  const calls: Array<[number | undefined, number]> = []

  const { result } = await renderHook(() =>
    usePreviousDistinct(7, (prev, next) => {
      calls.push([prev, next])
      return false
    }))

  expect(result.current).toBeUndefined()
  // `&&` short-circuits on the mount flag: the comparator never runs on mount
  expect(calls).toEqual([])
})

it('reports the previous value when the default comparator sees a change', async () => {
  const { result, rerender } = await renderHook(
    (props: { value: number } = { value: 1 }) => usePreviousDistinct(props.value),
  )

  expect(result.current).toBeUndefined()

  await rerender({ value: 2 })
  expect(result.current).toBe(1)

  await rerender({ value: 3 })
  expect(result.current).toBe(2)
})

it('an unchanged re-render does not move the reported value', async () => {
  const { result, rerender } = await renderHook(
    (props: { value: number, label: string } = { value: 1, label: 'a' }) =>
      usePreviousDistinct(props.value),
  )

  expect(result.current).toBeUndefined()

  // re-rendered twice without the value moving: strict equality says "no change"
  await rerender({ value: 1, label: 'b' })
  expect(result.current).toBeUndefined()
  await rerender({ value: 1, label: 'c' })
  expect(result.current).toBeUndefined()

  await rerender({ value: 2, label: 'c' })
  expect(result.current).toBe(1)

  // and holding the new value steady must not let the hook report it as its own
  // predecessor
  await rerender({ value: 2, label: 'd' })
  expect(result.current).toBe(1)
})

it('calls the comparator with the last accepted value, not the value it returned', async () => {
  const calls: Array<[number | undefined, number]> = []

  const { rerender } = await renderHook(
    (props: { value: number } = { value: 1 }) =>
      usePreviousDistinct(props.value, (prev, next) => {
        calls.push([prev, next])
        return prev === next
      }),
  )

  await rerender({ value: 2 })
  await rerender({ value: 2 })
  await rerender({ value: 3 })

  // The tracked value is the last one the comparator *accepted as distinct*, not
  // the value the hook last returned. On the 1 → 2 pass it is still the mount
  // value 1; on the second 2 pass the hook reports 1 but the tracked value is 2;
  // on the 3 pass the comparator's first argument is therefore 2 (tracked), not
  // 1 (reported).
  expect(calls).toEqual([[1, 2], [2, 2], [2, 3]])
})

it('a custom comparator only shifts the reported value when it reports a difference', async () => {
  const { result, rerender } = await renderHook(
    (props: { value: number } = { value: 1 }) =>
      usePreviousDistinct(props.value, (prev, next) =>
        Math.round((prev ?? 0) / 10) === Math.round(next / 10)),
  )

  expect(result.current).toBeUndefined()

  // same bucket as the mount value → not a change, and the tracked value stays 1
  await rerender({ value: 4 })
  expect(result.current).toBeUndefined()

  await rerender({ value: 11 })
  expect(result.current).toBe(1)

  // same bucket as 11 → still no change
  await rerender({ value: 12 })
  expect(result.current).toBe(1)

  // only now does a new value get accepted; 4 was never accepted, so it is not
  // the reported predecessor
  await rerender({ value: 30 })
  expect(result.current).toBe(11)
})

it('a comparator that reports every pair as equal keeps the hook at undefined', async () => {
  const { result, rerender } = await renderHook(
    (props: { value: number } = { value: 1 }) => usePreviousDistinct(props.value, () => true),
  )

  await rerender({ value: 2 })
  await rerender({ value: 3 })

  expect(result.current).toBeUndefined()
})

it('a change is already visible in the render pass that observes it', async () => {
  // The comparison runs in the render body, so the pass that sees the new value
  // is also the pass that reports the old one. An effect-driven port would
  // render `previous: undefined` on that commit and only settle on a follow-up
  // render, so the recorded pairs — not just the final DOM — are the assertion.
  const passes: Array<[number, number | undefined]> = []

  function Counter() {
    const [count, setCount] = useState(0)
    const previous = usePreviousDistinct(count)

    passes.push([count, previous])

    return (
      <div>
        <span>{`count: ${count}`}</span>
        <span>{`previous: ${String(previous)}`}</span>
        <button onClick={() => setCount(current => current + 1)}>increment</button>
      </div>
    )
  }

  const screen = await render(<Counter />)

  await expect.element(screen.getByText('previous: undefined')).toBeVisible()
  expect(passes).toEqual([[0, undefined]])

  await screen.getByRole('button', { name: 'increment' }).click()
  await expect.element(screen.getByText('previous: 0')).toBeVisible()

  // exactly two passes: the mount, then the single update. The render body
  // resolved the predecessor itself, so nothing needed a follow-up render.
  expect(passes).toEqual([[0, undefined], [1, 0]])
})

it('batched updates: only the final value of a batch is observed', async () => {
  const { result, act } = await renderHook(() => {
    const [count, setCount] = useState(0)

    return { count, previous: usePreviousDistinct(count), setCount }
  })

  expect(result.current.previous).toBeUndefined()

  await act(() => {
    result.current.setCount(current => current + 1)
    result.current.setCount(current => current + 1)
  })

  // React batches the two updates into one render, so the intermediate 1 is
  // never observed and the reported predecessor is the committed mount value.
  expect(result.current.count).toBe(2)
  expect(result.current.previous).toBe(0)
})

// ---------------------------------------------------------------------------
// Instances and lifetime
// ---------------------------------------------------------------------------

it('a fresh instance starts at undefined: no cross-instance leakage', async () => {
  const first = await renderHook(
    (props: { value: number } = { value: 1 }) => usePreviousDistinct(props.value),
  )

  await first.rerender({ value: 2 })
  expect(first.result.current).toBe(1)

  // a brand new instance is untouched by the first one's refs
  const second = await renderHook(
    (props: { value: number } = { value: 99 }) => usePreviousDistinct(props.value),
  )

  expect(second.result.current).toBeUndefined()

  await second.rerender({ value: 100 })
  expect(second.result.current).toBe(99)

  // the first instance is still independent of it
  expect(first.result.current).toBe(1)
})

it('unmount and remount starts over at undefined', async () => {
  const { result, rerender, unmount } = await renderHook(
    (props: { value: number } = { value: 1 }) => usePreviousDistinct(props.value),
  )

  await rerender({ value: 2 })
  expect(result.current).toBe(1)

  await unmount()

  const remounted = await renderHook(
    (props: { value: number } = { value: 2 }) => usePreviousDistinct(props.value),
  )

  expect(remounted.result.current).toBeUndefined()
})

// ---------------------------------------------------------------------------
// <StrictMode>
// ---------------------------------------------------------------------------

it('strictMode: the committed mount render still reports undefined', async () => {
  const passes: Array<number | undefined> = []

  function Probe() {
    const previous = usePreviousDistinct(0)

    passes.push(previous)

    return <span>{`previous: ${String(previous)}`}</span>
  }

  const screen = await render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  )

  await expect.element(screen.getByText('previous: undefined')).toBeVisible()

  // Measured lifecycle, chromium + React 19: the mount render is double-invoked
  // and both passes share the refs, so the second pass already reads the mount
  // flag as `false`. That does not disturb the first-render contract here — on
  // that pass `value` is still the same reference the tracked ref holds, so the
  // default comparator answers "equal" and neither pass records a change.
  expect(passes).toEqual([undefined, undefined])
})

// ---------------------------------------------------------------------------
// Differential probes: the port against the pin
// ---------------------------------------------------------------------------

it('differential probe: the port matches a line-for-line copy of the pin on every pass', async () => {
  const passes: Array<[number | undefined, number | undefined]> = []

  function Probe({ value }: { value: number }) {
    const reference = usePreviousDistinctReference(value, (prev, next) =>
      Math.round((prev ?? 0) / 10) === Math.round(next / 10))
    const actual = usePreviousDistinct(value, (prev, next) =>
      Math.round((prev ?? 0) / 10) === Math.round(next / 10))

    passes.push([reference, actual])

    return <span>{`previous: ${String(actual)}`}</span>
  }

  const screen = await render(<Probe value={1} />)

  for (const value of [4, 11, 12, 30, 30, 0])
    await screen.rerender(<Probe value={value} />)

  // Every pass produced the same answer from the adopted `useIsFirstRender` and
  // from the pin's own `useFirstMountState`: 1 mounts, 4 is in the same bucket,
  // 11 is accepted (so 1 becomes the predecessor), 12 is in 11's bucket, 30 is
  // accepted (11 becomes the predecessor), the repeat 30 is not a change, and 0
  // is accepted.
  expect(passes).toEqual([
    [undefined, undefined],
    [undefined, undefined],
    [1, 1],
    [1, 1],
    [11, 11],
    [11, 11],
    [30, 30],
  ])
})

it('differential probe: the adopted mount flag matches the pin for an always-different comparator', async () => {
  // With a comparator that reports every pair as different, the default
  // comparator can no longer mask the mount flag, so this isolates
  // `useIsFirstRender` against the pin's `useFirstMountState`.
  const outside: Array<[number | undefined, number | undefined]> = []

  function Probe({ record }: { record: Array<[number | undefined, number | undefined]> }) {
    const reference = usePreviousDistinctReference(0, () => false)
    const actual = usePreviousDistinct(0, () => false)

    record.push([reference, actual])

    return <span>{`previous: ${String(actual)}`}</span>
  }

  const screen = await render(<Probe record={outside} />)

  expect(outside).toEqual([[undefined, undefined]])

  await screen.unmount()

  const inside: Array<[number | undefined, number | undefined]> = []

  const strict = await render(
    <StrictMode>
      <Probe record={inside} />
    </StrictMode>,
  )

  // Measured, chromium + React 19: StrictMode double-invokes the mount render
  // and both passes share the refs, so the committed pass reads the mount flag
  // as `false` and this comparator — which never answers "equal" — commits a
  // value on it. The port and the pin agree on both passes, which is the point
  // of the probe; the `0` is upstream's behaviour for this comparator, mirrored
  // deliberately (see the hook's JSDoc).
  expect(inside).toEqual([[undefined, undefined], [0, 0]])
  await expect.element(strict.getByText('previous: 0')).toBeVisible()
})

// ---------------------------------------------------------------------------
// Runtime hygiene
// ---------------------------------------------------------------------------

it('updating, unmounting and remounting does not warn', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  const { result, rerender, unmount } = await renderHook(
    (props: { value: number } = { value: 1 }) => usePreviousDistinct(props.value),
  )

  await rerender({ value: 2 })
  expect(result.current).toBe(1)
  await unmount()

  const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
    .map(call => call.map(String).join(' '))

  expect(messages).toEqual([])

  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

it('sSR-safe: server rendering returns undefined and does not warn', async () => {
  // `useIsFirstRender` reads nothing but `useRef`, so the first server pass is
  // the mount pass and the hook has no predecessor to report.
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  function Probe() {
    return <span>{`previous: ${String(usePreviousDistinct(3))}`}</span>
  }

  const html = renderToString(<Probe />)

  const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
    .map(call => call.map(String).join(' '))

  expect(html).toContain('previous: undefined')
  expect(messages).toEqual([])

  errorSpy.mockRestore()
  warnSpy.mockRestore()
})
