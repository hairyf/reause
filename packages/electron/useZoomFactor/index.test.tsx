import type { WebFrame } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useZoomFactor } from '../useZoomFactor'

// upstream resolves the runtime instance via `window.require('electron')`, so
// a plain fake `webFrame` object is enough — `electron` is only ever imported
// as a type and must not be mocked.
function createWebFrame(initialFactor = 1, initialLevel = 0) {
  return {
    getZoomFactor: vi.fn(() => initialFactor),
    setZoomFactor: vi.fn(),
    getZoomLevel: vi.fn(() => initialLevel),
    setZoomLevel: vi.fn(),
  }
}

type FakeWebFrame = ReturnType<typeof createWebFrame>

function asWebFrame(webFrame: FakeWebFrame): WebFrame {
  return webFrame as unknown as WebFrame
}

beforeEach(() => {
  // no nodeIntegration in the browser test environment: the fallback lookup
  // must fail with the upstream message
  delete (window as any).require
})

describe('useZoomFactor', () => {
  it('reads the current factor from webFrame when no factor is passed', async () => {
    const webFrame = createWebFrame(1.5)

    const { result } = await renderHook(() => useZoomFactor(asWebFrame(webFrame)))

    expect(result.current[0]).toBe(1.5)
    expect(webFrame.getZoomFactor).toHaveBeenCalledTimes(1)
    expect(webFrame.setZoomFactor).not.toHaveBeenCalled()
  })

  it('applies an explicit factor on mount', async () => {
    const webFrame = createWebFrame(1)

    const { result } = await renderHook(() => useZoomFactor(asWebFrame(webFrame), 2))

    expect(result.current[0]).toBe(2)
    expect(webFrame.setZoomFactor).toHaveBeenCalledTimes(1)
    expect(webFrame.setZoomFactor).toHaveBeenCalledWith(2)
  })

  it('re-applies the factor when the external value changes', async () => {
    const webFrame = createWebFrame(1)

    const { result, rerender } = await renderHook(
      (props?: { factor?: number }) => useZoomFactor(asWebFrame(webFrame), props?.factor),
      { initialProps: { factor: 2 } },
    )

    expect(result.current[0]).toBe(2)
    expect(webFrame.setZoomFactor).toHaveBeenCalledTimes(1)

    await rerender({ factor: 3 })

    expect(result.current[0]).toBe(3)
    expect(webFrame.setZoomFactor).toHaveBeenCalledTimes(2)
    expect(webFrame.setZoomFactor).toHaveBeenLastCalledWith(3)
  })

  it('accepts a plain-number factor source', async () => {
    const webFrame = createWebFrame(1)

    const { result, rerender } = await renderHook(
      ({ factor }: { factor: number } = { factor: 2 }) => useZoomFactor(asWebFrame(webFrame), factor),
      { initialProps: { factor: 2 } },
    )

    expect(result.current[0]).toBe(2)
    expect(webFrame.setZoomFactor).toHaveBeenCalledWith(2)

    await rerender({ factor: 3 })

    expect(result.current[0]).toBe(3)
    expect(webFrame.setZoomFactor).toHaveBeenLastCalledWith(3)
  })

  it('setter writes to webFrame and updates the returned value', async () => {
    const webFrame = createWebFrame(1)

    const { result, act } = await renderHook(() => useZoomFactor(asWebFrame(webFrame)))

    await act(() => result.current[1](2.5))

    expect(result.current[0]).toBe(2.5)
    expect(webFrame.setZoomFactor).toHaveBeenCalledTimes(1)
    expect(webFrame.setZoomFactor).toHaveBeenCalledWith(2.5)
  })

  it('keeps the setter identity stable across renders', async () => {
    const webFrame = createWebFrame(1)

    const { result, rerender } = await renderHook(
      (props?: { factor?: number }) => useZoomFactor(asWebFrame(webFrame), props?.factor),
      { initialProps: { factor: 2 } },
    )

    const setFactor = result.current[1]

    await rerender({ factor: 3 })

    expect(result.current[1]).toBe(setFactor)
  })

  it('does not re-write the same factor on a redundant render', async () => {
    const webFrame = createWebFrame(1)

    const { rerender } = await renderHook(
      (props?: { factor?: number }) => useZoomFactor(asWebFrame(webFrame), props?.factor),
      { initialProps: { factor: 2 } },
    )

    expect(webFrame.setZoomFactor).toHaveBeenCalledTimes(1)

    await rerender({ factor: 2 })

    expect(webFrame.setZoomFactor).toHaveBeenCalledTimes(1)
  })

  it('throws the upstream message for an explicit factor of 0', async () => {
    const webFrame = createWebFrame(1)

    await expect(renderHook(() => useZoomFactor(asWebFrame(webFrame), 0)))
      .rejects
      .toThrow('the factor must be greater than 0.0.')
  })

  it('throws when a plain-number factor transitions to 0 mid-flight', async () => {
    const webFrame = createWebFrame(1)

    const { result, rerender } = await renderHook(
      ({ factor }: { factor: number } = { factor: 2 }) => useZoomFactor(asWebFrame(webFrame), factor),
      { initialProps: { factor: 2 } },
    )

    expect(result.current[0]).toBe(2)
    expect(webFrame.setZoomFactor).toHaveBeenCalledWith(2)

    // the render-time guard rejects on the next render, before any write
    await expect(rerender({ factor: 0 })).rejects.toThrow('the factor must be greater than 0.0.')
  })

  it('throws the upstream message when the setter is called with 0', async () => {
    const webFrame = createWebFrame(1)

    const { result, act } = await renderHook(() => useZoomFactor(asWebFrame(webFrame)))

    await expect(act(() => result.current[1](0)))
      .rejects
      .toThrow('the factor must be greater than 0.0.')

    expect(webFrame.setZoomFactor).not.toHaveBeenCalled()
    expect(result.current[0]).toBe(1)
  })

  it('throws when no webFrame is available and nodeIntegration is off', async () => {
    await expect(renderHook(() => useZoomFactor()))
      .rejects
      .toThrow('provide WebFrame module or enable nodeIntegration')
  })
})
