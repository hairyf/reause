import { StrictMode, useState } from 'react'
import { expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useEffectOnce } from '../useEffectOnce'

it('runs the effect exactly once after mount', async () => {
  const runs: string[] = []

  function Demo() {
    useEffectOnce(() => {
      runs.push('run')
    })
    return <span>subscribed</span>
  }

  const screen = await render(<Demo />)
  expect(runs).toEqual(['run'])

  await screen.unmount()
  expect(runs).toEqual(['run'])
})

it('forwards the returned cleanup, which runs on unmount (the `useMount` boundary)', async () => {
  const events: string[] = []

  function Demo() {
    useEffectOnce(() => {
      events.push('run')
      return () => {
        events.push('cleanup')
      }
    })
    return <span>subscribed</span>
  }

  const screen = await render(<Demo />)
  expect(events).toEqual(['run'])

  await screen.unmount()
  // `useMount` swallows the returned cleanup and would leave this as ['run'] —
  // forwarding it is the entire reason `useEffectOnce` exists next to it.
  expect(events).toEqual(['run', 'cleanup'])
})

it('does not re-run the effect, or clean it up, on re-renders with changed props and state', async () => {
  const events: string[] = []

  const { result, rerender, act, unmount } = await renderHook((props: { label: string } = { label: 'a' }) => {
    const [count, setCount] = useState(0)
    useEffectOnce(() => {
      events.push(`run:${props.label}`)
      return () => {
        events.push('cleanup')
      }
    })
    return { count, setCount }
  })

  expect(events).toEqual(['run:a'])

  // changed prop, same effect (the dependency array is empty)
  await rerender({ label: 'b' })
  expect(events).toEqual(['run:a'])

  // changed state, same effect
  await act(() => result.current.setCount(1))
  expect(events).toEqual(['run:a'])
  expect(result.current.count).toBe(1)

  // and the cleanup still runs exactly once, on unmount only
  await unmount()
  expect(events).toEqual(['run:a', 'cleanup'])
})

it('observes the mount-time order: run at mount, then cleanup at unmount, nothing in between', async () => {
  const events: string[] = []

  function Demo({ label }: { label: string }) {
    useEffectOnce(() => {
      events.push(`run:${label}`)
      return () => {
        events.push(`cleanup:${label}`)
      }
    })
    return <span>{label}</span>
  }

  const screen = await render(<Demo label="first" />)
  expect(events).toEqual(['run:first'])

  // a re-render (new props) provokes neither a second run nor a cleanup
  await screen.rerender(<Demo label="second" />)
  expect(events).toEqual(['run:first'])

  await screen.unmount()
  expect(events).toEqual(['run:first', 'cleanup:first'])
})

it('under <StrictMode> observes the dev double-invoked mount effect (React remounts it: run, cleanup, run)', async () => {
  const events: string[] = []

  function Demo() {
    useEffectOnce(() => {
      events.push('run')
      return () => {
        events.push('cleanup')
      }
    })
    return <span>subscribed</span>
  }

  const screen = await render(
    <StrictMode>
      <Demo />
    </StrictMode>,
  )

  // React 19 StrictMode intentionally double-invokes mount effects in
  // development: effect → cleanup → effect. This hook forwards the cleanup
  // verbatim, so it observes that cycle too; it claims no StrictMode safety.
  expect(events).toEqual(['run', 'cleanup', 'run'])

  await screen.unmount()
  expect(events).toEqual(['run', 'cleanup', 'run', 'cleanup'])
})
