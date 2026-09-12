import { useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useLatest } from '../useLatest'

describe('useLatest', () => {
  it('returns the ref object itself, holding the initial value', async () => {
    const { result } = await renderHook(() => useLatest('first'))

    // the public contract: the ref container, not a `[ref]` tuple
    expect(result.current).toHaveProperty('current')
    expect(Array.isArray(result.current)).toBe(false)
    expect(result.current.current).toBe('first')
  })

  it('holds the latest value after a render with a new value', async () => {
    let value = 'first'
    const { result, rerender } = await renderHook(() => useLatest(value))

    expect(result.current.current).toBe('first')

    value = 'second'
    await rerender()
    expect(result.current.current).toBe('second')

    value = 'third'
    await rerender()
    expect(result.current.current).toBe('third')
  })

  it('returns the same ref object identity across re-renders', async () => {
    let value = 0
    const { result, rerender } = await renderHook(() => useLatest(value))

    const ref = result.current

    value = 1
    await rerender()
    expect(result.current).toBe(ref)

    value = 2
    await rerender()
    await rerender()
    expect(result.current).toBe(ref)
    expect(ref.current).toBe(2)
  })

  it('lets an async callback captured during an earlier render read the freshest value', async () => {
    let value = 'first'
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const seen: string[] = []

    const { rerender } = await renderHook(() => {
      const latest = useLatest(value)

      // async callback captured on the *first* render: it closes over the ref
      // object, whose identity never changes, and only runs when released
      useEffect(() => {
        void gate.then(() => seen.push(latest.current))
      }, [latest])

      return latest
    })

    // the callback is already pending against render #1's ref object;
    // change the value on a later render before it runs
    value = 'second'
    await rerender()

    release()
    await vi.waitFor(() => expect(seen).toEqual(['second']))
  })

  it('stores undefined and falsy values faithfully (not truthiness-gated)', async () => {
    let value: string | null | undefined | 0 | false = 'defined'
    const { result, rerender } = await renderHook(() => useLatest(value))

    expect(result.current.current).toBe('defined')

    value = undefined
    await rerender()
    expect(result.current.current).toBeUndefined()

    value = null
    await rerender()
    expect(result.current.current).toBeNull()

    value = 0
    await rerender()
    expect(result.current.current).toBe(0)

    value = false
    await rerender()
    expect(result.current.current).toBe(false)

    value = ''
    await rerender()
    expect(result.current.current).toBe('')
  })
})

describe('useLatest (component)', () => {
  function LatestDemo() {
    const [value, setValue] = useState('a')
    const latest = useLatest(value)
    const [read, setRead] = useState('(none)')

    useEffect(() => {
      // both callbacks are created on the *first* render, while `value` is
      // still 'a', and close over the same stable ref object. The second one
      // runs after the value has been changed on a later render, so it reads
      // the freshest value — the whole point of the hook.
      const change = setTimeout(() => {
        setValue('b')
      }, 50)
      // note: this callback must stay block-bodied. `e18e/prefer-timer-args`
      // autofixes a concise `setTimeout(() => fn(arg), delay)` into
      // `setTimeout(fn, delay, arg)`, which evaluates `latest.current`
      // eagerly and would therefore read a stale value — the exact opposite
      // of what this test asserts.
      const readLater = setTimeout(() => {
        setRead(latest.current)
      }, 200)
      return () => {
        clearTimeout(change)
        clearTimeout(readLater)
      }
      // `latest` identity never changes, so this schedules exactly once
    }, [latest])

    return (
      <div>
        <span>{`value: ${value}`}</span>
        <span>{`async read: ${read}`}</span>
      </div>
    )
  }

  it('reads the value from a later render inside a setTimeout scheduled on the first render', async () => {
    const screen = await render(<LatestDemo />)

    await expect.element(screen.getByText('value: b')).toBeVisible()
    // the callback captured on the first render observed the later 'b'
    await expect.element(screen.getByText('async read: b')).toBeVisible()
  })
})
