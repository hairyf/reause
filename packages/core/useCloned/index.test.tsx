import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useCloned } from '../useCloned'

describe('useCloned', () => {
  it('works with simple objects', async () => {
    const data = { test: 'test' }

    const { result, act } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(data)
      return { cloned, setCloned, isModified, sync }
    })

    expect(result.current.cloned).toEqual(data)

    result.current.cloned.test = 'failed'

    await act(() => {
      result.current.sync()
    })

    expect(result.current.cloned).toEqual(data)
  })

  it('tracks in-place mutations of the source through a getter', async () => {
    const data = { test: 'test' }

    const { result, rerender } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data)
      return { cloned, setCloned, isModified, sync }
    })

    data.test = 'success'
    await rerender()

    expect(result.current.cloned).toEqual(data)
  })

  it('works with getter function', async () => {
    const data = { value: { test: 'test' } }

    const { result, rerender } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data.value)
      return { cloned, setCloned, isModified, sync }
    })

    data.value.test = 'success'
    await rerender()

    expect(result.current.cloned).toEqual(data.value)
  })

  it('works with a state tuple source', async () => {
    const { result, rerender, act } = await renderHook(() => {
      const [value, setValue] = useState({ test: 'test' })
      const [cloned, setCloned, { isModified, sync }] = useCloned([value, setValue])
      return { cloned, setCloned, isModified, sync, setValue }
    })

    expect(result.current.cloned).toEqual({ test: 'test' })

    await act(() => {
      result.current.setValue({ test: 'success' })
    })
    await rerender()

    expect(result.current.cloned).toEqual({ test: 'success' })
  })

  it('works with a value/onChange source', async () => {
    const { result, rerender, act } = await renderHook(() => {
      const [value, setValue] = useState({ test: 'test' })
      const [cloned, setCloned, { isModified, sync }] = useCloned({ value, onChange: setValue })
      return { cloned, setCloned, isModified, sync, setValue }
    })

    expect(result.current.cloned).toEqual({ test: 'test' })

    await act(() => {
      result.current.setValue({ test: 'success' })
    })
    await rerender()

    expect(result.current.cloned).toEqual({ test: 'success' })
  })

  it('treats tuple and value/onChange sources as reactive when immediate is false', async () => {
    const tuple = await renderHook(() => {
      const [value, setValue] = useState({ test: 'test' })
      const [cloned, setCloned, { isModified, sync }] = useCloned([value, setValue], { immediate: false })
      return { cloned, setCloned, isModified, sync, setValue }
    })

    // the initial sync is skipped, exactly as for a getter source
    expect(tuple.result.current.cloned).toEqual({})

    await tuple.act(() => {
      tuple.result.current.setValue({ test: 'tuple' })
    })
    await tuple.rerender()

    expect(tuple.result.current.cloned).toEqual({ test: 'tuple' })

    const pair = await renderHook(() => {
      const [value, setValue] = useState({ test: 'test' })
      const [cloned, setCloned, { isModified, sync }] = useCloned({ value, onChange: setValue }, { immediate: false })
      return { cloned, setCloned, isModified, sync, setValue }
    })

    expect(pair.result.current.cloned).toEqual({})

    await pair.act(() => {
      pair.result.current.setValue({ test: 'pair' })
    })
    await pair.rerender()

    expect(pair.result.current.cloned).toEqual({ test: 'pair' })
  })

  it('works with a getter source and manual sync', async () => {
    const data = { test: 'test' }

    const { result, act } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data, { manual: true })
      return { cloned, setCloned, isModified, sync }
    })

    data.test = 'success'

    expect(result.current.cloned).not.toEqual(data)

    await act(() => {
      result.current.sync()
    })

    expect(result.current.cloned).toEqual(data)
  })

  it('works with custom clone function', async () => {
    const data: Record<string, any> = { test: 'test' }

    const { result, rerender } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data, {
        clone: source => ({ ...source, proxyTest: true }),
      })
      return { cloned, setCloned, isModified, sync }
    })

    data.test = 'partial'
    await rerender()

    expect(result.current.cloned.test).toBe('partial')
    expect(result.current.cloned.proxyTest).toBe(true)
  })

  it('infers source type in custom clone function', async () => {
    const data = { test: 'test' }

    await renderHook(() => useCloned(data, {
      clone: (source) => {
        expectTypeOf(source).toEqualTypeOf<{ test: string }>()
        return source
      },
    }))
  })

  it('works with watch options', async () => {
    let data = { test: 'test' }

    const { result, rerender } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data, { immediate: false, deep: false })
      return { cloned, setCloned, isModified, sync }
    })

    // test immediate: false
    expect(result.current.cloned).toEqual({})

    data.test = 'not valid'
    await rerender()

    // test deep: false
    expect(result.current.cloned).toEqual({})

    data = { test: 'valid' }
    await rerender()

    expect(result.current.cloned).toEqual(data)
  })

  it('works with use isModified', async () => {
    const data = { test: 'test' }

    const { result, rerender, act } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data)
      return { cloned, setCloned, isModified, sync }
    })

    expect(result.current.isModified).toEqual(false)

    result.current.cloned.test = 'vitest'
    await rerender()

    expect(result.current.isModified).toEqual(true)

    await act(() => {
      result.current.sync()
    })

    expect(result.current.isModified).toEqual(false)
  })

  it('setCloned updates the clone without re-syncing from the source', async () => {
    const data = { test: 'test' }

    const { result, act } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data)
      return { cloned, setCloned, isModified, sync }
    })

    expect(result.current.cloned).toEqual({ test: 'test' })
    expect(result.current.isModified).toBe(false)

    await act(() => {
      result.current.setCloned({ test: 'replaced' })
    })

    expect(result.current.cloned).toEqual({ test: 'replaced' })
    expect(result.current.isModified).toBe(true)
    // the clone was not re-cloned from the source
    expect(data).toEqual({ test: 'test' })
  })

  it('sync resets isModified after setCloned', async () => {
    const data = { test: 'test' }

    const { result, act } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data)
      return { cloned, setCloned, isModified, sync }
    })

    await act(() => {
      result.current.setCloned({ test: 'replaced' })
    })
    expect(result.current.isModified).toBe(true)

    await act(() => {
      result.current.sync()
    })

    expect(result.current.cloned).toEqual({ test: 'test' })
    expect(result.current.isModified).toBe(false)
  })

  it('setCloned accepts a functional updater', async () => {
    const data = { test: 'test', extra: 1 }

    const { result, act } = await renderHook(() => {
      const [cloned, setCloned, { isModified, sync }] = useCloned(() => data)
      return { cloned, setCloned, isModified, sync }
    })

    // consecutive updaters in one handler compose against the latest value
    await act(() => {
      result.current.setCloned(prev => ({ ...prev, extra: 2 }))
      result.current.setCloned(prev => ({ ...prev, extra: prev.extra + 1 }))
    })

    expect(result.current.cloned).toEqual({ test: 'test', extra: 3 })
    expect(result.current.isModified).toBe(true)
  })

  it('returns a React tuple [cloned, setCloned, { isModified, sync }]', async () => {
    const { result } = await renderHook(() => useCloned({ test: 'test' }))

    expectTypeOf(result.current).toEqualTypeOf<
      readonly [
        { test: string },
        Dispatch<SetStateAction<{ test: string }>>,
        { isModified: boolean, sync: () => void },
      ]
    >()
    expectTypeOf(result.current[0]).toEqualTypeOf<{ test: string }>()
    expectTypeOf(result.current[1]).toEqualTypeOf<Dispatch<SetStateAction<{ test: string }>>>()
    expectTypeOf(result.current[2].isModified).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[2].sync).toEqualTypeOf<() => void>()

    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current).toHaveLength(3)
    expect(result.current[0]).toEqual({ test: 'test' })
    expect(result.current[1]).toBeTypeOf('function')
    expect(result.current[2].isModified).toBe(false)
    expect(result.current[2].sync).toBeTypeOf('function')
  })
})
