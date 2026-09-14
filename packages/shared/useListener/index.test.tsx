import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useListener } from '../useListener'

type Cb = (value: string) => void

function createEventHook<T extends (...args: any[]) => void>() {
  const fns = new Set<T>()
  return {
    on: (fn: T) => {
      fns.add(fn)
      return () => fns.delete(fn)
    },
    trigger: (...args: Parameters<T>) => {
      fns.forEach(fn => fn(...args))
    },
    size: () => fns.size,
  }
}

describe('useListener', () => {
  it('should be defined', () => {
    expect(useListener).toBeDefined()
  })

  it('registers the callback on mount and triggers it', async () => {
    const hook = createEventHook<Cb>()
    const calls: string[] = []

    await renderHook(() => useListener(hook.on, (value) => {
      calls.push(value)
    }))

    await expect.poll(() => hook.size()).toBe(1)
    hook.trigger('hello')
    expect(calls).toEqual(['hello'])
  })

  it('forwards multiple callback arguments to the registered listener', async () => {
    type MultiCb = (a: number, b: string) => void
    const hook = createEventHook<MultiCb>()
    const calls: Array<[number, string]> = []

    await renderHook(() => useListener(hook.on, (a, b) => {
      calls.push([a, b])
    }))

    await expect.poll(() => hook.size()).toBe(1)
    hook.trigger(1, 'two')
    hook.trigger(3, 'four')
    expect(calls).toEqual([[1, 'two'], [3, 'four']])
  })

  it('unregisters the callback on unmount', async () => {
    const hook = createEventHook<Cb>()
    const calls: string[] = []

    const { unmount } = await renderHook(() => useListener(hook.on, (value) => {
      calls.push(value)
    }))

    await expect.poll(() => hook.size()).toBe(1)
    await unmount()
    expect(hook.size()).toBe(0)
    hook.trigger('after-unmount')
    expect(calls).toEqual([])
  })

  it('uses the latest callback without re-registering', async () => {
    const hook = createEventHook<Cb>()
    const calls: string[] = []

    const { rerender } = await renderHook((props?: { suffix?: string }) =>
      useListener(hook.on, (value) => {
        calls.push(`${value}${props?.suffix ?? ''}`)
      }), { initialProps: { suffix: '!' } })

    await expect.poll(() => hook.size()).toBe(1)
    hook.trigger('a')
    expect(calls).toEqual(['a!'])
    // changing the callback should not grow the registered listener set
    expect(hook.size()).toBe(1)

    await rerender({ suffix: '?' })
    hook.trigger('b')
    expect(calls).toEqual(['a!', 'b?'])
    expect(hook.size()).toBe(1)
  })

  it('re-registers when the on function changes', async () => {
    const hookA = createEventHook<Cb>()
    const hookB = createEventHook<Cb>()
    const calls: string[] = []

    const { rerender } = await renderHook((props?: { on?: (fn: Cb) => () => boolean }) =>
      useListener(props?.on as any, (value) => {
        calls.push(value)
      }), { initialProps: { on: hookA.on } })

    await expect.poll(() => hookA.size()).toBe(1)
    hookA.trigger('from-a')
    expect(calls).toEqual(['from-a'])

    await rerender({ on: hookB.on })
    // old registration should be cleaned up
    expect(hookA.size()).toBe(0)
    await expect.poll(() => hookB.size()).toBe(1)

    hookB.trigger('from-b')
    expect(calls).toEqual(['from-a', 'from-b'])
  })

  it('does not throw when on returns nothing', async () => {
    const on = (_fn: Cb) => undefined

    await expect(renderHook(() => useListener(on, () => {}))).resolves.toBeDefined()
  })

  it('accepts an event hook object exposing `on` and unregisters on unmount', async () => {
    const hook = createEventHook<Cb>()
    const calls: string[] = []

    const { unmount } = await renderHook(() => useListener(hook, (value) => {
      calls.push(value)
    }))

    await expect.poll(() => hook.size()).toBe(1)
    hook.trigger('from-hook')
    expect(calls).toEqual(['from-hook'])

    await unmount()
    expect(hook.size()).toBe(0)
    hook.trigger('after-unmount')
    expect(calls).toEqual(['from-hook'])
  })

  it('accepts a createEventHook() result directly', async () => {
    const resultEvent = createEventHook<Cb>()
    const calls: string[] = []

    await renderHook(() => useListener(resultEvent, response => calls.push(response)))

    await expect.poll(() => resultEvent.size()).toBe(1)
    resultEvent.trigger('response')
    expect(calls).toEqual(['response'])
  })

  it('ignores an object without a usable on member', async () => {
    await expect(renderHook(() => useListener({} as any, () => {}))).resolves.toBeDefined()
  })

  it('does not register when on is not a function', async () => {
    await expect(renderHook(() => useListener(undefined as any, () => {}))).resolves.toBeDefined()
  })

  it('supports component-state callbacks (integration)', async () => {
    const hook = createEventHook<Cb>()

    const { rerender } = await renderHook((props?: { count?: number }) => {
      const [local, setLocal] = useState(0)
      useEffect(() => {
        if ((props?.count ?? 0) > 0)
          setLocal((props?.count ?? 0) * 2)
      }, [props?.count])

      useListener(hook.on, () => {
        void local
      })

      return { local, count: props?.count ?? 0 }
    }, { initialProps: { count: 0 } })

    await expect.poll(() => hook.size()).toBe(1)
    await rerender({ count: 5 })
    expect(hook.size()).toBe(1)
  })
})
