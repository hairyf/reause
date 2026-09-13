import { StrictMode, useEffect, useState } from 'react'
import { expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useIsFirstRender } from '../useIsFirstRender'

// Mirrors upstream `use-is-first-render.test.ts` (2 tests, `renderHook` from
// @testing-library/react). Both are reproduced verbatim in spirit below; the
// remaining cases pin the semantics the 12 upstream LOC actually carries —
// the render-phase flip, <StrictMode>, per-instance state and remount.

it('returns true on the first render', async () => {
  const { result, unmount } = await renderHook(() => useIsFirstRender())

  expect(result.current).toBe(true)

  await unmount()
})

it('returns false on every subsequent rerender', async () => {
  const { result, rerender, unmount } = await renderHook(() => useIsFirstRender())

  expect(result.current).toBe(true)

  await rerender()
  expect(result.current).toBe(false)

  await rerender()
  expect(result.current).toBe(false)

  await unmount()
})

it('returns true only for the very first render and false for every render after it', async () => {
  const observed: boolean[] = []

  const { rerender, unmount } = await renderHook((props: { value: number } = { value: 0 }) => {
    const isFirstRender = useIsFirstRender()
    observed.push(isFirstRender)
    return props.value
  })

  // the mount render observed `true`; every render after it observed `false`
  expect(observed).toEqual([true])

  await rerender({ value: 1 })
  await rerender({ value: 2 })
  expect(observed).toEqual([true, false, false])

  await unmount()
})

it('flips the flag during the render phase, not in an effect', async () => {
  // The observable difference between a render-phase flip and an effect-deferred
  // one. StrictMode double-invokes the mount render and runs NO effect between
  // the two passes, so both passes are recorded here:
  //   - render-phase flip  → pass 1 reads `true`, pass 2 reads `false`
  //   - effect-deferred flip → both passes read `true` (nothing has flipped yet)
  // `[true, false]` is therefore an absence-by-construction result for the
  // effect-deferred implementation, and is exactly what upstream's code does.
  const passes: boolean[] = []

  const { result, unmount } = await renderHook(() => {
    const isFirstRender = useIsFirstRender()
    passes.push(isFirstRender)
    return isFirstRender
  }, { wrapper: StrictMode })

  expect(passes).toEqual([true, false])

  // React commits the second pass, so the value the tree actually receives on
  // the mount render is `false`, not `true` — the `true` is discarded.
  expect(result.current).toBe(false)

  await unmount()
})

it('documents upstream\'s <StrictMode> behaviour: the mount render reports false', async () => {
  function StrictProbe() {
    const isFirstRender = useIsFirstRender()
    return <span>{`isFirstRender: ${String(isFirstRender)}`}</span>
  }

  const screen = await render(<StrictMode><StrictProbe /></StrictMode>)

  // Both mount-render passes share the same `useRef`, so the pass that commits
  // already reads the flip as `false`. The hook stays StrictMode-*safe* (the
  // flip is idempotent — no render is invented, and no state is written during
  // render), but it is not StrictMode-*invisible*: this is upstream's behaviour,
  // mirrored deliberately (facebook/react#24527). Outside StrictMode the mount
  // render reports `true` — covered by the case below.
  await expect.element(screen.getByText('isFirstRender: false')).toBeVisible()
})

it('reports true on the mount render outside <StrictMode>', async () => {
  function PlainProbe() {
    const isFirstRender = useIsFirstRender()
    return <span>{`isFirstRender: ${String(isFirstRender)}`}</span>
  }

  const screen = await render(<PlainProbe />)

  await expect.element(screen.getByText('isFirstRender: true')).toBeVisible()
})

it('keeps the flag per component instance', async () => {
  function InstanceProbe({ label }: { label: string }) {
    const isFirstRender = useIsFirstRender()
    return <span>{`${label} first: ${String(isFirstRender)}`}</span>
  }

  const screen = await render(
    <div>
      <InstanceProbe label="a" />
      <InstanceProbe label="b" />
    </div>,
  )

  // both instances are on their own first render — the flag is not module-level
  await expect.element(screen.getByText('a first: true')).toBeVisible()
  await expect.element(screen.getByText('b first: true')).toBeVisible()
})

it('starts over after an unmount and remount', async () => {
  function RemountProbe() {
    const isFirstRender = useIsFirstRender()
    return <span>{`isFirstRender: ${String(isFirstRender)}`}</span>
  }

  const first = await render(<RemountProbe />)
  await expect.element(first.getByText('isFirstRender: true')).toBeVisible()
  await first.unmount()

  // a fresh `useRef` with the new instance, so the remount is a first render again
  const second = await render(<RemountProbe />)
  await expect.element(second.getByText('isFirstRender: true')).toBeVisible()
})

it('lets a consumer skip the mount render, mirroring the upstream usage example', async () => {
  const fetched: string[] = []

  const { result, act } = await renderHook(() => {
    const [query, setQuery] = useState('a')
    const isFirstRender = useIsFirstRender()

    useEffect(() => {
      if (!isFirstRender)
        fetched.push(query)
    }, [query])

    return { query, setQuery }
  })

  // the mount render is skipped, so nothing has been fetched yet
  expect(fetched).toEqual([])

  await act(() => result.current.setQuery('b'))
  expect(fetched).toEqual(['b'])
})
