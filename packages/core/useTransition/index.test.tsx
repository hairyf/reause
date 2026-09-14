import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { TransitionPresets, useTransition } from '../useTransition'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// WebKit's React `act` keeps draining the act queue for as long as the
// rAF-driven transition enqueues frames, so an awaited `rerender(...)` runs the
// whole animation inside that `act` there and the intermediate frames are never
// observable (chromium returns between two frames). Tests that assert on a
// mid-flight value therefore drive the source through component state and call
// the setter outside `act` — vitest-browser-react only enables the act
// environment while an `act` call is in flight — so the transition runs on
// React's ordinary scheduling and `expect.poll` observes every frame in both
// engines.
async function renderTransition<S, R extends object>(
  initial: S,
  useTransitionOf: (source: S) => R,
) {
  return renderHook(() => {
    const [source, setSource] = useState(initial)
    return { setSource, ...useTransitionOf(source) }
  })
}

it('useTransition tweens between numbers', async () => {
  const onStarted = vi.fn()
  const onFinished = vi.fn()
  const { result } = await renderTransition(0, n => ({
    value: useTransition(n, { duration: 500, onStarted, onFinished }),
  }))

  expect(result.current.value).toBe(0)
  expect(onStarted).not.toHaveBeenCalled()

  result.current.setSource(100)

  await expect
    .poll(() => result.current.value, { interval: 10, timeout: 200 })
    .toBeGreaterThan(0)

  expect(onStarted).toHaveBeenCalledTimes(1)
  expect(onFinished).not.toHaveBeenCalled()
  expect(result.current.value).toBeLessThan(100)

  await expect
    .poll(() => result.current.value, { interval: 25, timeout: 2000 })
    .toBe(100)

  expect(onStarted).toHaveBeenCalledTimes(1)
  expect(onFinished).toHaveBeenCalledTimes(1)
})

it('useTransition tweens between arrays of numbers', async () => {
  const { result } = await renderTransition([0, 0], v => ({
    value: useTransition(v, { duration: 500 }),
  }))

  expect(result.current.value).toEqual([0, 0])

  result.current.setSource([100, -50])

  await expect
    .poll(() => result.current.value[0], { interval: 10, timeout: 200 })
    .toBeGreaterThan(0)

  expect(result.current.value[0]).toBeLessThan(100)
  expect(result.current.value[1]).toBeLessThan(0)
  expect(result.current.value[1]).toBeGreaterThan(-50)

  await expect
    .poll(() => result.current.value, { interval: 25, timeout: 2000 })
    .toEqual([100, -50])
})

it('useTransition follows the current source on re-render', async () => {
  const { result, rerender } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 100 }),
    { initialProps: { n: 5 } },
  )

  expect(result.current).toBe(5)

  await rerender({ n: 42 })

  await expect
    .poll(() => result.current, { interval: 25, timeout: 2000 })
    .toBe(42)
})

it('useTransition supports cubic bezier curves', async () => {
  const { result } = await renderTransition(0, n => ({
    values: [
      useTransition(n, { duration: 2000, easing: [0, 2, 0, 1] }),
      useTransition(n, { duration: 2000, easing: [1, 0, 1, -1] }),
    ],
  }))

  result.current.setSource(1)

  // easeOutBack overshoots above the target, easeInBack undershoots below it
  await expect
    .poll(() => result.current.values[0] > 1 && result.current.values[1] < 0, { interval: 25, timeout: 1500 })
    .toBe(true)

  await expect.poll(() => result.current.values[0], { interval: 50, timeout: 3000 }).toBe(1)
  await expect.poll(() => result.current.values[1], { interval: 50, timeout: 1000 }).toBe(1)
})

it('useTransition supports custom easing functions', async () => {
  const easeInQuad = vi.fn((n: number) => n * n)
  const { result } = await renderTransition(0, n => ({
    value: useTransition(n, { duration: 300, easing: easeInQuad }),
  }))

  expect(easeInQuad).not.toHaveBeenCalled()

  result.current.setSource(100)

  await expect
    .poll(() => easeInQuad, { interval: 10, timeout: 500 })
    .toHaveBeenCalled()

  await expect
    .poll(() => result.current.value, { interval: 10, timeout: 200 })
    .toBeGreaterThan(0)

  expect(result.current.value).toBeLessThan(100)

  await expect
    .poll(() => result.current.value, { interval: 25, timeout: 2000 })
    .toBe(100)
})

it('useTransition applies the easing function to the transition progress', async () => {
  const { result } = await renderTransition(0, n => ({
    value: useTransition(n, { duration: 2000, easing: () => 0.5 }),
  }))

  result.current.setSource(100)

  // a constant easing of 0.5 lands exactly halfway on the first frame
  await expect
    .poll(() => result.current.value, { interval: 10, timeout: 500 })
    .toBe(50)

  await expect
    .poll(() => result.current.value, { interval: 50, timeout: 3000 })
    .toBe(100)
})

it('useTransition accepts TransitionPresets easing', async () => {
  const { result, rerender } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 100, easing: TransitionPresets.linear }),
    { initialProps: { n: 0 } },
  )

  await rerender({ n: 25 })

  await expect
    .poll(() => result.current, { interval: 25, timeout: 2000 })
    .toBe(25)
})

it('useTransition supports delayed transitions', async () => {
  const onStarted = vi.fn()
  const { result, rerender } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 100, delay: 300, onStarted }),
    { initialProps: { n: 0 } },
  )

  await rerender({ n: 100 })

  expect(result.current).toBe(0)
  expect(onStarted).not.toHaveBeenCalled()

  await expect
    .poll(() => result.current, { interval: 25, timeout: 2000 })
    .toBe(100)

  expect(onStarted).toHaveBeenCalledTimes(1)
})

it('useTransition clears a pending delayed transition when the source changes', async () => {
  const onStarted = vi.fn()
  const onFinished = vi.fn()
  const { result, rerender } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 100, delay: 300, onStarted, onFinished }),
    { initialProps: { n: 0 } },
  )

  await rerender({ n: 1 })
  await sleep(50)
  await rerender({ n: 2 })

  await expect
    .poll(() => result.current, { interval: 25, timeout: 2000 })
    .toBe(2)

  expect(onStarted).toHaveBeenCalledTimes(1)
  expect(onFinished).toHaveBeenCalledTimes(1)
})

it('useTransition can be disabled for synchronous changes', async () => {
  const onStarted = vi.fn()
  const { result, rerender } = await renderHook(
    ({ n, disabled }: { n: number, disabled?: boolean } = { n: 0 }) => useTransition(n, { duration: 100, disabled, onStarted }),
    { initialProps: { n: 0, disabled: true } },
  )

  await rerender({ n: 100, disabled: true })

  expect(result.current).toBe(100)

  await sleep(150)
  expect(onStarted).not.toHaveBeenCalled()
  expect(result.current).toBe(100)

  await rerender({ n: 100, disabled: false })

  expect(result.current).toBe(100)
  expect(onStarted).not.toHaveBeenCalled()
})

it('useTransition starts a new transition from the interrupted position', async () => {
  const { result } = await renderTransition(0, n => ({
    value: useTransition(n, { duration: 3000 }),
  }))

  result.current.setSource(100)

  await expect
    .poll(() => result.current.value, { interval: 25, timeout: 1800 })
    .toBeGreaterThanOrEqual(40)

  result.current.setSource(0)

  await sleep(200)

  // still tweening down from the interrupted value, never reset to the target
  expect(result.current.value).toBeGreaterThan(20)
  expect(result.current.value).toBeLessThan(70)

  await expect
    .poll(() => result.current.value, { interval: 100, timeout: 4000 })
    .toBe(0)
})

it('useTransition stops updating after unmount', async () => {
  const onFinished = vi.fn()
  const { result, unmount } = await renderTransition(0, n => ({
    value: useTransition(n, { duration: 1000, onFinished }),
  }))

  result.current.setSource(100)

  await expect
    .poll(() => result.current.value, { interval: 10, timeout: 300 })
    .toBeGreaterThan(0)

  await unmount()

  // longer than the rest of the transition — an un-cancelled loop would have
  // reached the target and fired `onFinished` by now
  await sleep(1200)
  expect(onFinished).not.toHaveBeenCalled()
})

it('useTransition fires onFinished when a transition is superseded mid-flight', async () => {
  const onFinished = vi.fn()
  const { result, rerender } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 1000, onFinished }),
    { initialProps: { n: 0 } },
  )

  await rerender({ n: 100 })
  await expect
    .poll(() => result.current, { interval: 10, timeout: 300 })
    .toBeGreaterThan(0)

  // a newer source change supersedes the running transition — upstream's
  // aborted `transition` promise resolves and its watcher fires `onFinished`
  await rerender({ n: 0 })
  expect(onFinished).toHaveBeenCalledTimes(1)

  // the follow-up transition completes normally and fires it again
  await expect
    .poll(() => result.current, { interval: 25, timeout: 2000 })
    .toBe(0)
  expect(onFinished).toHaveBeenCalledTimes(2)
})

it('useTransition aborts mid-flight via the abort option and fires onFinished', async () => {
  const onFinished = vi.fn()
  let abort = false
  const { result, rerender } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 2000, abort: () => abort, onFinished }),
    { initialProps: { n: 0 } },
  )

  await rerender({ n: 100 })
  await expect
    .poll(() => result.current, { interval: 10, timeout: 300 })
    .toBeGreaterThan(0)

  abort = true
  const mid = result.current

  await sleep(100)
  expect(onFinished).toHaveBeenCalledTimes(1)
  // the abort stops the loop without snapping to the target
  expect(result.current).toBe(mid)
})

it('useTransition drives the rAF loop on a custom window option', async () => {
  const rafCbs: FrameRequestCallback[] = []
  const cancelSpy = vi.fn()
  const customWindow = {
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      rafCbs.push(cb)
      return rafCbs.length
    },
    cancelAnimationFrame: cancelSpy,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout,
  } as unknown as Window

  const { rerender, unmount } = await renderHook(
    ({ n }: { n: number } = { n: 0 }) => useTransition(n, { duration: 1000, window: customWindow }),
    { initialProps: { n: 0 } },
  )

  await rerender({ n: 100 })

  // the first frame was requested on the custom window, and each frame
  // re-arms the loop through it
  expect(rafCbs.length).toBe(1)
  rafCbs[0](0)
  expect(rafCbs.length).toBe(2)

  unmount()
  expect(cancelSpy).toHaveBeenCalled()
})

it('useTransition does not transition on mount', async () => {
  const onStarted = vi.fn()
  const onFinished = vi.fn()
  const { result } = await renderHook(() => useTransition(7, { duration: 50, onStarted, onFinished }))

  expect(result.current).toBe(7)

  await sleep(150)
  expect(result.current).toBe(7)
  expect(onStarted).not.toHaveBeenCalled()
  expect(onFinished).not.toHaveBeenCalled()
})

it('useTransition snaps when the source array length changes', async () => {
  const { result, rerender } = await renderHook(
    ({ v }: { v: number[] } = { v: [0] }) => useTransition(v, { duration: 100 }),
    { initialProps: { v: [0, 0] } },
  )

  await rerender({ v: [10] })

  await expect
    .poll(() => result.current, { interval: 25, timeout: 1000 })
    .toEqual([10])
})
