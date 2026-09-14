import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useDebounceFn } from '../useDebounceFn'

describe('useDebounceFn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays the call until the debounce interval elapses', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n * 2
      }, 100))

    await act(async () => {
      pending = result.current(21)
    })
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(calls).toEqual([21])
    expect(await pending).toBe(42)
  })

  it('collapses a burst into one trailing call with the latest args', async () => {
    const calls: string[] = []
    let first!: Promise<unknown>
    let second!: Promise<unknown>
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useDebounceFn((v: string) => {
        calls.push(v)
        return v
      }, 100))

    await act(async () => {
      first = result.current('a')
      second = result.current('b')
      pending = result.current('c')
    })
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual(['c'])
    // superseded calls settle without invoking
    expect(await first).toBe(undefined)
    expect(await second).toBe(undefined)
    expect(await pending).toBe('c')
  })

  it('re-reads ms from the latest render on every call', async () => {
    const calls: number[] = []
    let first!: Promise<unknown>
    let pending!: Promise<unknown>
    const { result, act, rerender } = await renderHook(
      ({ ms }: { ms: number } = { ms: 100 }) => useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, ms),
      { initialProps: { ms: 100 } },
    )

    await act(async () => {
      first = result.current(1)
    })
    await rerender({ ms: 300 })
    await act(async () => {
      pending = result.current(2)
    })

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([])
    expect(await first).toBe(undefined)

    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(calls).toEqual([2])
    expect(await pending).toBe(2)
  })

  it('re-arms the pending call with the ms of the latest render', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act, rerender } = await renderHook(
      ({ ms }: { ms: number } = { ms: 50 }) => useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, ms),
      { initialProps: { ms: 50 } },
    )

    await act(async () => {
      pending = result.current(1)
    })

    await rerender({ ms: 500 })
    await act(async () => {
      pending = result.current(2)
    })

    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(450)
    })
    expect(calls).toEqual([2])
    expect(await pending).toBe(2)
  })

  it('keeps a stable identity across re-renders', async () => {
    const { result, rerender } = await renderHook(() => useDebounceFn(vi.fn(), 100))
    const first = result.current

    await rerender()

    expect(result.current).toBe(first)
    expect(result.current.cancel).toBe(first.cancel)
    expect(result.current.flush).toBe(first.flush)
  })

  it('clears the pending timer on unmount', async () => {
    const calls: number[] = []
    const { result, act, unmount } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, 100))

    await act(async () => {
      result.current(1)
    })
    await unmount()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([])
  })

  it('cancel() drops the pending call and settles its promise', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, 100))

    await act(async () => {
      pending = result.current(1)
      result.current.cancel()
    })
    expect(result.current.isPending).toBe(false)
    expect(await pending).toBe(undefined)

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([])
  })

  it('flush() invokes the pending call immediately', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, 100))

    await act(async () => {
      pending = result.current(7)
      result.current.flush()
    })
    expect(calls).toEqual([7])
    expect(result.current.isPending).toBe(false)
    expect(await pending).toBe(7)

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([7])
  })

  it('forces the pending call when maxWait elapses', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, 100, { maxWait: 250 }))

    await act(async () => {
      pending = result.current(1)
    })
    await act(async () => {
      vi.advanceTimersByTime(50)
      pending = result.current(2)
    })
    await act(async () => {
      vi.advanceTimersByTime(50)
      pending = result.current(3)
    })
    await act(async () => {
      vi.advanceTimersByTime(50)
      pending = result.current(4)
    })
    expect(calls).toEqual([])

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(calls).toEqual([4])
    // upstream maxWait settles the pending promise via `lastRejector` —
    // undefined (or a rejection with rejectOnCancel), not the fn result
    expect(await pending).toBe(undefined)
    expect(result.current.isPending).toBe(false)
  })

  it('rejects the pending promise on cancel with rejectOnCancel', async () => {
    const calls: number[] = []
    let outcome!: Promise<string>
    const { result, act } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, 100, { rejectOnCancel: true }))

    await act(async () => {
      outcome = result.current(1).then(() => 'resolved', () => 'rejected')
      result.current.cancel()
    })
    expect(await outcome).toBe('rejected')

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(calls).toEqual([])
  })

  it('rejects a superseded call with rejectOnCancel', async () => {
    const { result, act } = await renderHook(() =>
      useDebounceFn((a: number, b: number) => a + b, 500, { rejectOnCancel: true }))

    let first!: Promise<unknown>
    let second!: Promise<unknown>
    await act(async () => {
      first = result.current(2, 3)
      vi.advanceTimersByTime(200)
      second = result.current(4, 5)
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    // the superseded call settles with a rejection, the trailing one resolves
    await expect(first).rejects.toBeUndefined()
    await expect(second).resolves.toBe(9)
  })

  it('rejects instead of throwing synchronously when ms is 0 and the fn throws', async () => {
    let outcome!: string
    const { result, act } = await renderHook(() =>
      useDebounceFn(() => {
        throw new Error('boom')
      }, 0))

    await act(async () => {
      outcome = await result.current().then(() => 'resolved', (error: Error) => `rejected:${error.message}`)
    })
    expect(outcome).toBe('rejected:boom')
  })

  it('invokes immediately when ms is 0', async () => {
    const calls: number[] = []
    let pending!: Promise<unknown>
    const { result, act } = await renderHook(() =>
      useDebounceFn((n: number) => {
        calls.push(n)
        return n
      }, 0))

    await act(async () => {
      pending = result.current(3)
    })
    expect(calls).toEqual([3])
    expect(await pending).toBe(3)
    expect(result.current.isPending).toBe(false)
  })

  it('tracks isPending across the debounce lifecycle', async () => {
    const { result, act } = await renderHook(() => useDebounceFn(vi.fn(), 100))

    expect(result.current.isPending).toBe(false)

    await act(async () => {
      result.current()
    })
    expect(result.current.isPending).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.isPending).toBe(false)
  })
})

describe('useDebounceFn (component)', () => {
  function UseDebounceFnDemo() {
    const [clicked, setClicked] = useState(0)
    const [updated, setUpdated] = useState(0)
    const debouncedFn = useDebounceFn(() => setUpdated(v => v + 1), 500)

    return (
      <div>
        <button onClick={() => {
          setClicked(c => c + 1)
          debouncedFn()
        }}
        >
          Smash me!
        </button>
        <p>
          Button clicked:
          {' '}
          {clicked}
        </p>
        <p>
          Event handler called:
          {' '}
          {updated}
        </p>
      </div>
    )
  }

  it('debounces a burst of clicks into a single update', async () => {
    const screen = await render(<UseDebounceFnDemo />)
    const smash = screen.getByRole('button', { name: 'Smash me!' })

    await smash.click()
    await smash.click()
    await smash.click()

    await expect.element(screen.getByText('Button clicked: 3')).toBeVisible()
    await expect.element(screen.getByText('Event handler called: 1')).toBeVisible()
  })
})
