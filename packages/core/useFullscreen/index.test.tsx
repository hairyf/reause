import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useFullscreen } from '../useFullscreen'

// The upstream package ships no tests for `useFullscreen` (only `component.ts`
// + `demo.vue` + `index.md`), so these are self-written cases covering the
// object-mirror contract: initial state, enter / exit / toggle, the
// fullscreenchange events (document + target) and SSR safety.

function setDocumentFullscreenElement(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => element,
  })
  Object.defineProperty(document, 'webkitIsFullScreen', {
    configurable: true,
    get: () => element !== null,
  })
}

function clearDocumentFullscreenElement() {
  Reflect.deleteProperty(document, 'fullscreenElement')
  Reflect.deleteProperty(document, 'webkitIsFullScreen')
}

describe('useFullscreen', () => {
  let targetEl: HTMLElement

  beforeEach(() => {
    targetEl = document.createElement('div')
    document.body.appendChild(targetEl)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearDocumentFullscreenElement()
  })

  it('initializes with isFullscreen false and resolves isSupported in a mount effect', async () => {
    const { result } = await renderHook(() => useFullscreen({ current: targetEl }))

    expect(result.current.isFullscreen).toBe(false)
    expect(result.current.enter).toBeTypeOf('function')
    expect(result.current.exit).toBeTypeOf('function')
    expect(result.current.toggle).toBeTypeOf('function')

    await vi.waitFor(() => {
      expect(result.current.isSupported).toBe(true)
    })
  })

  it('enter requests fullscreen on the target element', async () => {
    const requestFullscreen = vi.spyOn(targetEl, 'requestFullscreen').mockResolvedValue(undefined)

    const { result, act } = await renderHook(() => useFullscreen({ current: targetEl }))

    await act(async () => {
      await result.current.enter()
    })

    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(true)
  })

  it('exit leaves fullscreen via document.exitFullscreen', async () => {
    vi.spyOn(targetEl, 'requestFullscreen').mockResolvedValue(undefined)
    const exitFullscreen = vi.spyOn(document, 'exitFullscreen').mockResolvedValue(undefined)

    const { result, act } = await renderHook(() => useFullscreen({ current: targetEl }))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    await act(async () => {
      await result.current.exit()
    })

    expect(exitFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('toggle enters and then exits fullscreen', async () => {
    vi.spyOn(targetEl, 'requestFullscreen').mockResolvedValue(undefined)
    const exitFullscreen = vi.spyOn(document, 'exitFullscreen').mockResolvedValue(undefined)

    const { result, act } = await renderHook(() => useFullscreen({ current: targetEl }))

    await act(async () => {
      await result.current.toggle()
    })
    expect(result.current.isFullscreen).toBe(true)

    await act(async () => {
      await result.current.toggle()
    })
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('follows the fullscreenchange event on the document', async () => {
    const { result, act } = await renderHook(() => useFullscreen({ current: targetEl }))

    setDocumentFullscreenElement(targetEl)
    await act(async () => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)

    setDocumentFullscreenElement(null)
    await act(async () => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(false)
  })

  it('follows the fullscreenchange event on the target element', async () => {
    const { result, act } = await renderHook(() => useFullscreen({ current: targetEl }))

    setDocumentFullscreenElement(targetEl)
    await act(async () => {
      targetEl.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)
  })

  it('defaults to document.documentElement when no target is given', async () => {
    const requestFullscreen = vi.spyOn(document.documentElement, 'requestFullscreen').mockResolvedValue(undefined)

    const { result, act } = await renderHook(() => useFullscreen())

    await vi.waitFor(() => {
      expect(result.current.isSupported).toBe(true)
    })

    await act(async () => {
      await result.current.enter()
    })

    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(true)
  })

  it('reports isSupported false and no-ops controls with an unsupported document option', async () => {
    const fakeDoc = {
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Document

    const { result, act } = await renderHook(() => useFullscreen(undefined, { document: fakeDoc }))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isSupported).toBe(false)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('automatically exits fullscreen on unmount with autoExit', async () => {
    vi.spyOn(targetEl, 'requestFullscreen').mockResolvedValue(undefined)
    const exitFullscreen = vi.spyOn(document, 'exitFullscreen').mockResolvedValue(undefined)

    const { result, act, unmount } = await renderHook(() => useFullscreen({ current: targetEl }, { autoExit: true }))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    await unmount()
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('uses vendor-prefixed methods when only those are exposed', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    const target = {
      addEventListener: () => {},
      removeEventListener: () => {},
      webkitRequestFullscreen: requestFullscreen,
    } as unknown as HTMLElement
    const fakeDoc = {
      addEventListener: () => {},
      removeEventListener: () => {},
      webkitIsFullScreen: false,
      webkitExitFullscreen: exitFullscreen,
    } as unknown as Document

    const { result, act } = await renderHook(() => useFullscreen({ current: target }, { document: fakeDoc }))

    await vi.waitFor(() => {
      expect(result.current.isSupported).toBe(true)
    })

    await act(async () => {
      await result.current.enter()
    })
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(true)

    await act(async () => {
      await result.current.exit()
    })
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('falls back to the target for the prefixed exit when the document has none', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const targetExit = vi.fn().mockResolvedValue(undefined)
    const target = {
      addEventListener: () => {},
      removeEventListener: () => {},
      webkitRequestFullscreen: requestFullscreen,
      webkitExitFullscreen: targetExit,
    } as unknown as HTMLElement
    // iOS Safari: the exit method lives on the element, not the document
    const fakeDoc = {
      addEventListener: () => {},
      removeEventListener: () => {},
      webkitIsFullScreen: false,
    } as unknown as Document

    const { result, act } = await renderHook(() => useFullscreen({ current: target }, { document: fakeDoc }))

    await vi.waitFor(() => {
      expect(result.current.isSupported).toBe(true)
    })

    await act(async () => {
      await result.current.enter()
    })
    expect(requestFullscreen).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.exit()
    })
    expect(targetExit).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('keeps the SSR-safe defaults during render before the mount effect', async () => {
    const snapshots: Array<{ isSupported: boolean, isFullscreen: boolean }> = []

    function Probe() {
      const state = useFullscreen()
      snapshots.push({ isSupported: state.isSupported, isFullscreen: state.isFullscreen })
      return <div>{state.isFullscreen ? 'fullscreen' : 'windowed'}</div>
    }

    await render(<Probe />)

    expect(snapshots[0]).toEqual({ isSupported: false, isFullscreen: false })
  })
})
