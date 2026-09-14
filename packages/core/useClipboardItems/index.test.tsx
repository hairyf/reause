import type { UseClipboardItemsReturn } from '../useClipboardItems'
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useClipboardItems } from '../useClipboardItems'

const mime = 'text/plain'

function createItems(text: string): ClipboardItems {
  return [
    new ClipboardItem({ [mime]: new Blob([text], { type: mime }) }),
  ]
}

/**
 * Shadows `navigator.clipboard` with a fake whose `write` / `read` spies
 * resolve deterministically (the real API is gated behind permissions).
 * Returns the spies so tests can assert on them.
 */
function installClipboard(readResult: ClipboardItems = []) {
  const writeSpy = vi.fn(async (_items: ClipboardItems) => {})
  const readSpy = vi.fn(async (): Promise<ClipboardItems> => readResult)
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: { write: writeSpy, read: readSpy },
  })
  return { writeSpy, readSpy }
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(window.navigator, 'clipboard')
})

it('should be defined', () => {
  expect(useClipboardItems).toBeDefined()
})

it('reports support matching the resolved navigator', async () => {
  const isSupportedInEnv = typeof navigator !== 'undefined' && 'clipboard' in navigator
  const { result } = await renderHook(() => useClipboardItems())

  await expect.poll(() => result.current[2].isSupported).toBe(isSupportedInEnv)
})

it('copy() writes the items, updates content and toggles copied', async () => {
  const { writeSpy } = installClipboard()
  const { result, act } = await renderHook(() => useClipboardItems())

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  const items = createItems('hello')
  await act(async () => {
    await result.current[1](items)
  })

  expect(writeSpy).toHaveBeenCalledTimes(1)
  expect(writeSpy).toHaveBeenCalledWith(items)
  expect(result.current[2].copied).toBe(true)
  expect(result.current[0]).toEqual(items)
})

it('copy() falls back to the source option', async () => {
  const { writeSpy } = installClipboard()
  const source = createItems('from source')
  const { result, act } = await renderHook(() => useClipboardItems({ source }))

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  await act(async () => {
    await result.current[1]()
  })

  expect(writeSpy).toHaveBeenCalledWith(source)
  expect(result.current[0]).toEqual(source)
})

it('copy() reads the latest source at call time', async () => {
  const { writeSpy } = installClipboard()
  const source = createItems('from source')
  // the source is a plain value read when `copy()` runs, so a re-render with a
  // new one must still be picked up
  let latest = createItems('stale')
  const { result, act, rerender } = await renderHook(() => useClipboardItems({ source: latest }))

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  latest = source
  await rerender()

  await act(async () => {
    await result.current[1]()
  })

  expect(writeSpy).toHaveBeenCalledWith(source)
})

it('copy() rejects and keeps copied false when the write fails', async () => {
  const { writeSpy } = installClipboard()
  writeSpy.mockRejectedValueOnce(new Error('write denied'))
  const { result, act } = await renderHook(() => useClipboardItems())

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  let error: unknown
  await act(async () => {
    try {
      await result.current[1](createItems('hello'))
    }
    catch (e) {
      error = e
    }
  })

  expect(error).toBeInstanceOf(Error)
  expect(result.current[2].copied).toBe(false)
  expect(result.current[0]).toEqual([])
})

it('resets copied to false after copiedDuring', async () => {
  installClipboard()
  const { result, act } = await renderHook(() => useClipboardItems({ copiedDuring: 50 }))

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  const items = createItems('hello')
  await act(async () => {
    await result.current[1](items)
  })
  expect(result.current[2].copied).toBe(true)

  await expect.poll(() => result.current[2].copied).toBe(false)
  expect(result.current[0]).toEqual(items)
})

it('read() pulls the clipboard items into content', async () => {
  const items = createItems('from clipboard')
  const { readSpy } = installClipboard(items)
  const { result, act } = await renderHook(() => useClipboardItems())

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  await act(async () => {
    result.current[2].read()
  })

  await expect.poll(() => result.current[0]).toEqual(items)
  expect(readSpy).toHaveBeenCalledTimes(1)
})

it('listens for copy/cut events and refreshes content when read is enabled', async () => {
  const items = createItems('from event')
  const { readSpy } = installClipboard(items)
  const { result, act } = await renderHook(() => useClipboardItems({ read: true }))

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  await act(async () => {
    window.dispatchEvent(new Event('copy'))
  })
  await expect.poll(() => result.current[0]).toEqual(items)
  expect(readSpy).toHaveBeenCalledTimes(1)

  await act(async () => {
    window.dispatchEvent(new Event('cut'))
  })
  await expect.poll(() => result.current[0]).toEqual(items)
  expect(readSpy).toHaveBeenCalledTimes(2)
})

it('re-binds the copy/cut listeners when `read` toggles after mount', async () => {
  const items = createItems('from event')
  const { readSpy } = installClipboard(items)
  // upstream decides once at setup; reause keys the listener effect on
  // `read`, so the listeners follow runtime toggles (documented divergence)
  const { result, rerender, act } = await renderHook(
    ({ read }: { read: boolean } = { read: false }) => useClipboardItems({ read }),
    { initialProps: { read: false } },
  )

  await expect.poll(() => result.current[2].isSupported).toBe(true)

  // `read: false` — no listener is bound
  window.dispatchEvent(new Event('copy'))
  expect(readSpy).not.toHaveBeenCalled()

  // toggling `read` on after mount binds them
  await rerender({ read: true })
  await act(async () => {
    window.dispatchEvent(new Event('copy'))
  })
  await expect.poll(() => readSpy).toHaveBeenCalledTimes(1)
  await expect.poll(() => result.current[0]).toEqual(items)

  // toggling `read` back off removes them again
  await rerender({ read: false })
  window.dispatchEvent(new Event('cut'))
  expect(readSpy).toHaveBeenCalledTimes(1)
})

it('copy() and read() no-op when the Clipboard API is unsupported', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'clipboard')

  try {
    if (descriptor)
      Reflect.deleteProperty(Navigator.prototype, 'clipboard')

    const { result, act } = await renderHook(() => useClipboardItems())
    await expect.poll(() => result.current[2].isSupported).toBe(false)

    await act(async () => {
      await result.current[1](createItems('hello'))
    })
    expect(result.current[2].copied).toBe(false)
    expect(result.current[0]).toEqual([])

    await act(async () => {
      result.current[2].read()
    })
    expect(result.current[0]).toEqual([])
  }
  finally {
    if (descriptor)
      Object.defineProperty(Navigator.prototype, 'clipboard', descriptor)
  }
})

it('keeps SSR-safe defaults during render and resolves in a mount effect', async () => {
  installClipboard()

  const values: Array<{ isSupported: boolean, content: ClipboardItems, copied: boolean }> = []

  function Probe() {
    const [content, , { isSupported, copied }] = useClipboardItems()
    values.push({ isSupported, content, copied })

    return <div>{isSupported ? 'supported' : 'unsupported'}</div>
  }

  const screen = await render(<Probe />)

  // render-time values are the SSR-safe defaults
  expect(values[0].isSupported).toBe(false)
  expect(values[0].content).toEqual([])
  expect(values[0].copied).toBe(false)

  // the mount effect probes the Clipboard API and re-renders
  await expect.element(screen.getByText('supported')).toBeVisible()
  expect(values[values.length - 1].isSupported).toBe(true)
})

it('returns a React tuple [content, copy, { copied, isSupported, read }]', async () => {
  installClipboard()
  const { result } = await renderHook(() => useClipboardItems())

  expectTypeOf(result.current).toEqualTypeOf<UseClipboardItemsReturn<false>>()
  expectTypeOf(result.current[0]).toEqualTypeOf<ClipboardItems>()
  expectTypeOf(result.current[1]).toEqualTypeOf<(content: ClipboardItems) => Promise<void>>()
  expectTypeOf(result.current[2].copied).toEqualTypeOf<boolean>()
  expectTypeOf(result.current[2].isSupported).toEqualTypeOf<boolean>()
  expectTypeOf(result.current[2].read).toEqualTypeOf<() => void>()

  expect(Array.isArray(result.current)).toBe(true)
  expect(result.current).toHaveLength(3)
  expect(result.current[0]).toEqual([])
  expect(result.current[1]).toBeTypeOf('function')
  expect(result.current[2].copied).toBe(false)
  expect(result.current[2].read).toBeTypeOf('function')
})

it('keeps the controls object identity while its members are unchanged', async () => {
  installClipboard()
  const { result, rerender } = await renderHook(() => useClipboardItems())
  await expect.poll(() => result.current[2].isSupported).toBe(true)

  const first = result.current[2]
  await rerender()

  expect(result.current[2]).toBe(first)
})
