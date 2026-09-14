import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { createEventHook } from '../createEventHook'
import { useListener } from '../useListener'

describe('createEventHook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should be defined', () => {
    expect(createEventHook).toBeDefined()
  })

  it('should trigger event', () => {
    let message = ''

    const myFunction = () => {
      const resultEvent = createEventHook<string>()
      const exec = () => resultEvent.trigger('Hello World')
      return {
        exec,
        onResult: resultEvent.on,
      }
    }

    const { exec, onResult } = myFunction()
    onResult((result) => {
      message = result
    })
    exec()

    expect(message).toBe('Hello World')
  })

  it('should trigger event with no params', () => {
    let timesFired = 0

    const { on: onResult, trigger } = createEventHook()

    onResult(() => timesFired++)
    trigger()
    trigger()

    expect(timesFired).toBe(2)
  })

  it('should trigger event and pass falsy values', () => {
    let timesFired = 0

    type Falsy = false | 0 | '' | null | undefined
    const { on: onResult, trigger } = createEventHook<Falsy>()

    const values: Falsy[] = [false, 0, '', null, undefined]
    const results: Falsy[] = []
    onResult((value: Falsy) => {
      timesFired++
      results.push(value)
    })
    for (const value of values)
      trigger(value)

    expect(timesFired).toBe(values.length)
    expect(results).toMatchObject(values)
  })

  it('should add and remove event listener', () => {
    const listener = vi.fn()
    const { on, off, trigger } = createEventHook<string>()

    on(listener)

    trigger('xxx')

    expect(listener).toHaveBeenCalledTimes(1)

    off(listener)

    trigger('xxx')

    expect(listener).toHaveBeenCalledTimes(1)

    const remove = on(listener)

    trigger('xxx')

    expect(listener).toHaveBeenCalledTimes(2)

    remove()

    trigger('xxx')

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('should add and remove all event listener', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    const listener3 = vi.fn()

    const { on, clear, trigger } = createEventHook<string>()

    on(listener1)
    on(listener2)
    on(listener3)

    trigger('xxx')

    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
    expect(listener3).toHaveBeenCalledTimes(1)

    clear()

    trigger('xxx')

    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
    expect(listener3).toHaveBeenCalledTimes(1)
  })

  it('should await trigger', async () => {
    let message = ''

    const myFunction = () => {
      const resultEvent = createEventHook<string>()
      const exec = () => resultEvent.trigger('Hello World')
      return {
        exec,
        onResult: resultEvent.on,
      }
    }

    const { exec, onResult } = myFunction()
    onResult(result => new Promise<number>((resolve) => {
      setTimeout(() => {
        message = result
        resolve(2)
      }, 100)
      vi.advanceTimersByTime(100)
    }))
    const result = await exec()

    expect(message).toBe('Hello World')
    expect(result).toEqual([2])
  })

  it('should pass union type', () => {
    let count = 0

    const { on: onResult, trigger } = createEventHook<number | string>()

    // union type should be inferred
    onResult(() => {
      count = 2
    })
    trigger(1)
    trigger(2)

    expect(count).toBe(2)
  })

  it('the same listener should fire only once', () => {
    const listener = vi.fn()
    const { on, trigger, off } = createEventHook<string>()
    on(listener)
    on(listener)
    trigger('xxx')
    off(listener)
    expect(listener).toBeCalledTimes(1)
  })

  it('multiple parameters on trigger with types', () => {
    let id = ''
    const list: unknown[] = []
    const { on: onResult, trigger } = createEventHook<string>()

    onResult((_id) => {
      id = _id
    })
    onResult((str, ...rest) => {
      list.push(str, ...rest)
    })

    trigger('foo', 1, true, 'bar')

    expect(id).toEqual('foo')
    expect(list).toEqual(['foo', 1, true, 'bar'])
  })

  it('a synchronous listener error propagates and aborts the remaining listeners', () => {
    const calls: string[] = []
    const { on, trigger } = createEventHook<string>()

    on(() => {
      throw new Error('listener boom')
    })
    on(value => calls.push(value))

    // upstream parity: `Promise.all(fns.map(fn => fn(...args)))` has no
    // per-listener guard — the sync throw escapes `trigger` and the second
    // listener never runs
    expect(() => trigger('xxx')).toThrowError('listener boom')
    expect(calls).toEqual([])
  })

  it('integrates with useListener (registers on mount, off on unmount)', async () => {
    const { on, trigger } = createEventHook<string>()
    const calls: string[] = []

    const { unmount } = await renderHook(() => useListener(on, (value) => {
      calls.push(value)
    }))

    trigger('hello')
    expect(calls).toEqual(['hello'])

    await unmount()
    trigger('after-unmount')
    expect(calls).toEqual(['hello'])
  })

  it('integrates with useListener when the event hook object is passed directly', async () => {
    const resultEvent = createEventHook<string>()
    const calls: string[] = []

    const { unmount } = await renderHook(() => useListener(resultEvent, (value) => {
      calls.push(value)
    }))

    resultEvent.trigger('hello')
    expect(calls).toEqual(['hello'])

    await unmount()
    resultEvent.trigger('after-unmount')
    expect(calls).toEqual(['hello'])
  })

  it('the off function returned by `on` unsubscribes the listener', () => {
    const listener = vi.fn()
    const { on, trigger } = createEventHook<string>()

    const off = on(listener)

    trigger('xxx')
    expect(listener).toHaveBeenCalledTimes(1)

    off()
    off()

    trigger('xxx')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
