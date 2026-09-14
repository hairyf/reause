import Fuse from 'fuse.js'
import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useFuse } from '../useFuse'

interface DataItem {
  name: string
}

// the plain-string example from the issue / upstream `index.md`
const names = ['John Smith', 'John Doe', 'Jane Doe', 'Phillip Green', 'Peter Brown']

describe('useFuse', () => {
  it('updates results when data changes', async () => {
    let data: DataItem[] = [{ name: 'foo' }]
    const { result, rerender } = await renderHook(() => useFuse('', data, { matchAllWhenSearchEmpty: true }))

    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].item.name).toBe('foo')

    data = [{ name: 'bar' }, { name: 'baz' }]
    await rerender()

    expect(result.current.results).toHaveLength(2)
    expect(result.current.results[0].item.name).toBe('bar')
    expect(result.current.results[1].item.name).toBe('baz')
  })

  it('searches updated data', async () => {
    let data: DataItem[] = [{ name: 'foo' }]
    const { result, rerender } = await renderHook(() => useFuse('bar', data, { fuseOptions: { keys: ['name'] } }))

    expect(result.current.results).toHaveLength(0)

    data = [{ name: 'bar' }]
    await rerender()

    expect(result.current.results).toHaveLength(1)
    expect(result.current.results[0].item.name).toBe('bar')
  })

  it('limits results with resultLimit', async () => {
    let resultLimit: number | undefined
    const { result, rerender } = await renderHook(() => useFuse('John', names, { resultLimit }))

    expect(result.current.results.length).toBeGreaterThan(2)

    resultLimit = 2
    await rerender()

    expect(result.current.results).toHaveLength(2)
    expect(result.current.results.map(r => r.item)).toEqual(['John Smith', 'John Doe'])
  })

  it('re-reads a changed plain options object on re-render', async () => {
    let options = { resultLimit: 1 }

    const { result, rerender } = await renderHook(() => useFuse('John', names, options))

    expect(result.current.results).toHaveLength(1)

    options = { resultLimit: 3 }
    await rerender()

    expect(result.current.results).toHaveLength(3)
  })

  it('orders plain string results like the upstream example', async () => {
    const { result } = await renderHook(() => useFuse('Jhon D', names))

    expect(result.current.results).toHaveLength(3)
    expect(result.current.results.map(r => r.item)).toEqual(['John Doe', 'John Smith', 'Jane Doe'])
    expect(result.current.results.map(r => r.refIndex)).toEqual([1, 0, 2])
  })

  it('exposes the live Fuse instance', async () => {
    const { result } = await renderHook(() => useFuse('', names, { matchAllWhenSearchEmpty: true }))

    expect(result.current.fuse).toBeInstanceOf(Fuse)
    expect(result.current.fuse.search('John Doe')[0].item).toBe('John Doe')
  })
})
