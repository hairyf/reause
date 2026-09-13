import { StrictMode, useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useUnmountedRef } from '../useUnmountedRef'

it('useUnmountedRef is false while mounted and true after unmount', async () => {
  const { result, unmount } = await renderHook(() => useUnmountedRef())

  expect(result.current.current).toBe(false)

  await unmount()
  expect(result.current.current).toBe(true)
})

it('useUnmountedRef stays false across re-renders', async () => {
  const { result, rerender } = await renderHook((count = 0) => {
    const unmountedRef = useUnmountedRef()

    return { unmountedRef, count }
  })

  await rerender(1)
  expect(result.current.unmountedRef.current).toBe(false)

  await rerender(2)
  expect(result.current.unmountedRef.current).toBe(false)
})

it('an async callback captured before unmount can read the flag afterwards', async () => {
  // The point of returning a ref rather than a boolean: the object survives the
  // component. Capture the read while mounted, evaluate it from a continuation
  // that only runs after the component is gone.
  let unmountedRef: { current: boolean } | undefined

  function Probe() {
    unmountedRef = useUnmountedRef()

    return <span>probe</span>
  }

  const screen = await render(<Probe />)
  const readAfterUnmount = () => unmountedRef!.current

  expect(readAfterUnmount()).toBe(false)

  await screen.unmount()

  // a microtask continuation resuming after the unmount
  await expect(Promise.resolve().then(readAfterUnmount)).resolves.toBe(true)
})

it('a fresh instance starts false: no cross-instance leakage', async () => {
  // Instance A unmounts and keeps reporting true …
  const first = await renderHook(() => useUnmountedRef())
  await first.unmount()
  expect(first.result.current.current).toBe(true)

  // … while a brand new instance is untouched by it.
  const second = await renderHook(() => useUnmountedRef())
  expect(second.result.current.current).toBe(false)

  await second.unmount()
  expect(second.result.current.current).toBe(true)
})

it('a timer created before unmount reads true when it fires after it', async () => {
  // The realistic shape: schedule work on mount, read the ref when the work
  // finally runs. `setTimeout` (not a microtask) guarantees the read happens
  // after the unmount has committed.
  let unmountedRef: { current: boolean } | undefined

  function Probe() {
    unmountedRef = useUnmountedRef()

    return <span>{String(unmountedRef.current)}</span>
  }

  const screen = await render(<Probe />)
  const ref = unmountedRef!

  expect(ref.current).toBe(false)

  let ranAfterUnmount: boolean | undefined

  // created while mounted, checked only after the component is gone
  const timer = setTimeout(() => {
    ranAfterUnmount = ref.current
  }, 10)

  await screen.unmount()

  await expect.poll(() => ranAfterUnmount, { timeout: 2000 }).toBe(true)
  clearTimeout(timer)
})

it('strictMode: the ref is false after the double-invoked mount, and true after a real unmount', async () => {
  // Measured lifecycle under StrictMode, chromium + React 19:
  //   render(current=false) × 2
  //   effect(current=false) -> cleanup(current=true) -> effect(current=false)
  // The second effect invocation is the mount effect re-running and resetting
  // the ref; without it the simulated cleanup would leave the app permanently
  // "unmounted".
  const states: boolean[] = []
  let identity: { current: boolean } | undefined
  const identities = new Set<{ current: boolean }>()

  function Probe() {
    const unmountedRef = useUnmountedRef()

    identity = unmountedRef
    identities.add(unmountedRef)
    states.push(unmountedRef.current)

    return <span>{String(unmountedRef.current)}</span>
  }

  const screen = await render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  )

  // StrictMode double-invokes the mount render and the mount effect, but the
  // ref object identity is stable across all of it.
  expect(identities.size).toBe(1)
  expect(states.length).toBeGreaterThanOrEqual(2)
  expect(states.every(state => state === false)).toBe(true)
  expect(identity!.current).toBe(false)

  await screen.unmount()
  expect(identity!.current).toBe(true)
})

it('a remount is a fresh instance while the old ref keeps reporting true', async () => {
  let unmountedRef: { current: boolean } | undefined

  function Child() {
    unmountedRef = useUnmountedRef()

    return <span>child</span>
  }

  const screen = await render(<Child />)
  const firstRef = unmountedRef!

  expect(firstRef.current).toBe(false)

  // remove the child from the tree
  await screen.rerender(<span>child gone</span>)
  expect(firstRef.current).toBe(true)

  // mount a new one
  await screen.rerender(<Child />)
  const secondRef = unmountedRef!

  expect(secondRef).not.toBe(firstRef)
  expect(secondRef.current).toBe(false)
  // the stale ref's answer is retained — that is what a caller holds on to
  expect(firstRef.current).toBe(true)
})

it('unmount does not warn', async () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  function Probe() {
    const unmountedRef = useUnmountedRef()

    useEffect(() => () => {
      void unmountedRef.current
    }, [])

    return <span>probe</span>
  }

  const screen = await render(<Probe />)
  await screen.unmount()

  const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
    .map(call => call.map(String).join(' '))

  expect(messages.filter(message => /unmount/i.test(message))).toEqual([])

  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

it('sSR-safe: server rendering returns false and does not warn or throw', async () => {
  // Exercise the real server render path. The hook's initial value comes from
  // `useRef(false)` alone, so first render reads neither `window` nor
  // `document` and React reports nothing.
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  function Probe() {
    const unmountedRef = useUnmountedRef()

    return <span>{String(unmountedRef.current)}</span>
  }

  const html = renderToString(<Probe />)

  const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
    .map(call => call.map(String).join(' '))

  expect(html).toContain('false')
  expect(messages).toEqual([])

  errorSpy.mockRestore()
  warnSpy.mockRestore()
})
