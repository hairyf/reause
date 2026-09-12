import { StrictMode, useState } from 'react'
import { expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useUpdateEffect } from '../useUpdateEffect'

it('skips the effect on the first render', async () => {
  const calls: number[] = []

  const { rerender, unmount } = await renderHook((props: { value: number } = { value: 0 }) => {
    useUpdateEffect(() => {
      calls.push(props.value)
    }, [props.value])
  })

  expect(calls).toEqual([])

  await rerender({ value: 1 })
  expect(calls).toEqual([1])

  await unmount()
})

it('runs the effect only when the deps change', async () => {
  const calls: number[] = []

  const { rerender, unmount } = await renderHook((props: { value: number, label: string } = { value: 0, label: 'a' }) => {
    useUpdateEffect(() => {
      calls.push(props.value)
    }, [props.value])
  })

  await rerender({ value: 0, label: 'b' })
  // re-rendered, but `value` did not change → still nothing
  expect(calls).toEqual([])

  await rerender({ value: 1, label: 'b' })
  expect(calls).toEqual([1])

  // a re-render that leaves the deps alone must not re-run the effect
  await rerender({ value: 1, label: 'c' })
  expect(calls).toEqual([1])

  await rerender({ value: 2, label: 'c' })
  expect(calls).toEqual([1, 2])

  await unmount()
})

it('runs after every re-render when the deps array is omitted, but never on mount', async () => {
  const calls: number[] = []

  const { result, act } = await renderHook(() => {
    const [value, setValue] = useState(0)
    // no deps array — mirrors `useEffect(effect)`
    useUpdateEffect(() => {
      calls.push(value)
    })
    return { setValue, value }
  })

  expect(calls).toEqual([])

  await act(() => result.current.setValue(1))
  expect(calls).toEqual([1])

  await act(() => result.current.setValue(2))
  expect(calls).toEqual([1, 2])
})

it('runs the cleanup before the next invocation and again on unmount', async () => {
  const events: string[] = []

  const { rerender, unmount } = await renderHook((props: { value: number } = { value: 0 }) => {
    useUpdateEffect(() => {
      events.push(`run:${props.value}`)
      return () => events.push(`cleanup:${props.value}`)
    }, [props.value])
  })

  // the skipped mount render must not have registered a cleanup either
  expect(events).toEqual([])

  await rerender({ value: 1 })
  expect(events).toEqual(['run:1'])

  // the previous cleanup runs before the next effect invocation
  await rerender({ value: 2 })
  expect(events).toEqual(['run:1', 'cleanup:1', 'run:2'])

  // and the last cleanup runs on unmount
  await unmount()
  expect(events).toEqual(['run:1', 'cleanup:1', 'run:2', 'cleanup:2'])
})

function StrictModeDemo({ calls }: { calls: number[] }) {
  const [count, setCount] = useState(0)

  useUpdateEffect(() => {
    calls.push(count)
  }, [count])

  return (
    <div>
      <span>{`count: ${count}`}</span>
      <button onClick={() => setCount(current => current + 1)}>increment</button>
    </div>
  )
}

it('documents upstream\'s <StrictMode> behaviour: the double-invoked mount render defeats the skip', async () => {
  const calls: number[] = []

  const screen = await render(
    <StrictMode>
      <StrictModeDemo calls={calls} />
    </StrictMode>,
  )

  await expect.element(screen.getByText('count: 0')).toBeVisible()
  // React StrictMode double-invokes the mount render, and both passes share the
  // ref, so the render that actually commits already reads the flip as `false`
  // — the mount is NOT skipped. StrictMode additionally double-invokes the
  // mount effect, hence two calls. This is upstream react-use's behaviour
  // (facebook/react#24527) and is mirrored deliberately: a render-phase flip
  // cannot know whether a commit has happened yet, so it cannot be made
  // StrictMode-safe without changing upstream's design.
  expect(calls).toEqual([0, 0])

  await screen.getByRole('button', { name: 'increment' }).click()
  await expect.element(screen.getByText('count: 1')).toBeVisible()
  // the first real update after mount still fires it exactly once
  expect(calls).toEqual([0, 0, 1])
})
