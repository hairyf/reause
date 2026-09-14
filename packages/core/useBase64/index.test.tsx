import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useBase64 } from '../useBase64'

describe('useBase64', () => {
  it('should be defined', () => {
    expect(useBase64).toBeDefined()
  })

  it('should work with record', async () => {
    const template = { test: 5 }

    const { result } = await renderHook(() => useBase64(template))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:application/json;base64,eyJ0ZXN0Ijo1fQ==')
  })

  it('should work with map and default serialize function', async () => {
    const map = new Map([['test', 1]])

    const { result } = await renderHook(() => useBase64(map))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:application/json;base64,eyJ0ZXN0IjoxfQ==')
  })

  it('should work with set', async () => {
    const set = new Set([1])

    const { result } = await renderHook(() => useBase64(set))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:application/json;base64,WzFd')
  })

  it('should work with array', async () => {
    const arr = [1, 2, 3]

    const { result } = await renderHook(() => useBase64(arr))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:application/json;base64,WzEsMiwzXQ==')
  })

  it('should work with custom serialize function', async () => {
    const arr = [1, 2, 3]

    const serializer = (array: number[]) => {
      return JSON.stringify(array.map(el => el * 2))
    }

    const { result } = await renderHook(() => useBase64(arr, { serializer }))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:application/json;base64,WzIsNCw2XQ==')
  })

  it('should work with dataUrl false', async () => {
    const arr = [1, 2, 3]

    const { result } = await renderHook(() => useBase64(arr, { dataUrl: false }))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('WzEsMiwzXQ==')
  })

  it('should work with string', async () => {
    const { result } = await renderHook(() => useBase64('hello'))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:text/plain;base64,aGVsbG8=')
  })

  it('re-transforms when the target changes across renders', async () => {
    // the target is a plain value (no ref unwrapping): a re-render carrying a
    // new value re-runs the transformation
    let source = 'one'

    const { result, rerender } = await renderHook(() => useBase64(source))

    await expect.poll(() => result.current.base64).toBe('data:text/plain;base64,b25l')

    source = 'two'
    await rerender()

    await expect.poll(() => result.current.base64).toBe('data:text/plain;base64,dHdv')
  })

  it('execute manually transforms the latest target', async () => {
    let source = 'a'

    const { result, rerender } = await renderHook(() => useBase64(source))

    await expect.poll(() => result.current.base64).toBe('data:text/plain;base64,YQ==')

    source = 'ab'
    await rerender()

    // the manual run reads the target of the latest render
    await expect(result.current.execute()).resolves.toBe('data:text/plain;base64,YWI=')
    await expect.poll(() => result.current.base64).toBe('data:text/plain;base64,YWI=')
  })

  it('exposes a promise of the current transformation', async () => {
    const arr = [1, 2, 3]

    const { result } = await renderHook(() => useBase64(arr))

    await expect.poll(() => result.current.promise).toBeDefined()
    expect(result.current.promise).toBeInstanceOf(Promise)

    await result.current.promise
    await expect.poll(() => result.current.base64).toBe('data:application/json;base64,WzEsMiwzXQ==')
  })

  it('should work with blob', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })

    const { result } = await renderHook(() => useBase64(blob))

    await result.current.promise

    await expect.poll(() => result.current.base64).toBe('data:text/plain;base64,aGVsbG8=')
  })

  it('should work with array buffer', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer

    const { result } = await renderHook(() => useBase64(buffer))

    await result.current.promise

    // the ArrayBuffer branch returns raw base64 without a data URL prefix
    await expect.poll(() => result.current.base64).toBe('AQID')
  })

  it('resolves an empty string for a nullish target', async () => {
    const { result } = await renderHook(() => useBase64(undefined))

    await expect.poll(() => result.current.promise).toBeDefined()
    expect(await result.current.promise).toBe('')
    expect(result.current.base64).toBe('')
  })
})
