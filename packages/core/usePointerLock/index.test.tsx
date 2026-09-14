import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { usePointerLock } from '../usePointerLock'

/**
 * Deterministic Pointer Lock stubbing: `document.pointerLockElement` is an
 * accessor on `Document.prototype`, so an own configurable instance property
 * shadows it and can be dropped again in `afterEach`. The stub is installed
 * in `beforeEach` so the `'pointerLockElement' in document` support check is
 * stable in every environment. `requestPointerLock`/`exitPointerLock` are
 * spied per test — no real lock is ever requested.
 */
function stubPointerLockElement(value: Element | null) {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, value })
}

beforeEach(() => {
  stubPointerLockElement(null)
})

afterEach(() => {
  // drop the instance stub so the Document.prototype accessor shines through
  delete (document as { pointerLockElement?: unknown }).pointerLockElement
  vi.restoreAllMocks()
})

function spyRequestPointerLock(target: Element) {
  return vi.spyOn(target, 'requestPointerLock').mockImplementation(() => Promise.resolve())
}

describe('usePointerLock', () => {
  it('reports isSupported and starts with nothing locked', async () => {
    const { result } = await renderHook(() => usePointerLock())

    expect(result.current.isSupported).toBe(true)
    expect(result.current.element).toBeNull()
    expect(result.current.triggerElement).toBeNull()
  })

  it('lock() requests the lock and element follows pointerlockchange', async () => {
    const { result, act } = await renderHook(() => usePointerLock())
    const target = document.createElement('div')
    const requestSpy = spyRequestPointerLock(target)

    let promise!: Promise<Element | null>
    await act(async () => {
      promise = result.current.lock({ current: target })
    })

    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(result.current.element).toBeNull()
    expect(result.current.triggerElement).toBeNull()

    stubPointerLockElement(target)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })

    await expect.poll(() => result.current.element).toBe(target)
    await expect(promise).resolves.toBe(target)
  })

  it('lock() with an event targets the event currentTarget and sets triggerElement', async () => {
    const { result, act } = await renderHook(() => usePointerLock())
    const target = document.createElement('div')
    const requestSpy = spyRequestPointerLock(target)

    let promise!: Promise<Element | null>
    target.addEventListener('mousedown', (event) => {
      promise = result.current.lock(event)
    })
    await act(() => {
      target.dispatchEvent(new MouseEvent('mousedown'))
    })

    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(result.current.triggerElement).toBe(target)

    stubPointerLockElement(target)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })

    expect(result.current.element).toBe(target)
    await expect(promise).resolves.toBe(target)
  })

  it('lock() resolves the target ref at call time (event + hook-level target)', async () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    const firstSpy = spyRequestPointerLock(first)
    const secondSpy = spyRequestPointerLock(second)
    const targetRef = { current: first as Element | null }

    const { result, act } = await renderHook(() => usePointerLock(targetRef))

    targetRef.current = second
    let promise!: Promise<Element | null>
    await act(async () => {
      promise = result.current.lock(new MouseEvent('mousedown'))
    })

    expect(secondSpy).toHaveBeenCalledTimes(1)
    expect(firstSpy).not.toHaveBeenCalled()
    expect(result.current.triggerElement).toBeNull()

    stubPointerLockElement(second)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })

    expect(result.current.element).toBe(second)
    await expect(promise).resolves.toBe(second)
  })

  it('unlock() exits the lock and clears element and triggerElement', async () => {
    const exitSpy = vi.spyOn(document, 'exitPointerLock').mockImplementation(() => {})
    const { result, act } = await renderHook(() => usePointerLock())
    const target = document.createElement('div')
    spyRequestPointerLock(target)

    // nothing locked: resolves false without touching the document
    let released!: Promise<boolean>
    await act(async () => {
      released = result.current.unlock()
    })
    await expect(released).resolves.toBe(false)
    expect(exitSpy).not.toHaveBeenCalled()

    // acquire a lock through the event path so triggerElement is set
    let locked!: Promise<Element | null>
    target.addEventListener('mousedown', (event) => {
      locked = result.current.lock(event)
    })
    await act(() => {
      target.dispatchEvent(new MouseEvent('mousedown'))
    })
    stubPointerLockElement(target)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })
    expect(result.current.element).toBe(target)
    expect(result.current.triggerElement).toBe(target)
    await expect(locked).resolves.toBe(target)

    await act(async () => {
      released = result.current.unlock()
    })
    expect(exitSpy).toHaveBeenCalledTimes(1)

    stubPointerLockElement(null)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })

    expect(result.current.element).toBeNull()
    expect(result.current.triggerElement).toBeNull()
    await expect(released).resolves.toBe(true)
  })

  it('pointerlockerror rejects the pending lock()/unlock() with the upstream message', async () => {
    const { result, act } = await renderHook(() => usePointerLock())
    const target = document.createElement('div')
    spyRequestPointerLock(target)

    // acquire failure
    let promise!: Promise<Element | null>
    await act(async () => {
      promise = result.current.lock({ current: target })
    })
    promise.catch(() => {})

    await act(() => {
      document.dispatchEvent(new Event('pointerlockerror'))
    })
    await expect(promise).rejects.toThrow('Failed to acquire pointer lock.')

    // release failure: the lock is still held when the error fires
    stubPointerLockElement(target)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })

    let released!: Promise<boolean>
    await act(async () => {
      released = result.current.unlock()
    })
    released.catch(() => {})

    await act(() => {
      document.dispatchEvent(new Event('pointerlockerror'))
    })
    await expect(released).rejects.toThrow('Failed to release pointer lock.')
  })

  it('supports a custom document option', async () => {
    const listeners: Record<string, Array<(event: Event) => void>> = {}
    const fakeDocument = {
      pointerLockElement: null,
      addEventListener: (type: string, listener: (event: Event) => void) => {
        (listeners[type] ??= []).push(listener)
      },
      removeEventListener: () => {},
      exitPointerLock: () => {},
    } as unknown as Document
    const exitSpy = vi.spyOn(fakeDocument, 'exitPointerLock')
    const setFakePointerLockElement = (value: Element | null) => {
      (fakeDocument as unknown as { pointerLockElement: Element | null }).pointerLockElement = value
    }

    const { result, act } = await renderHook(() => usePointerLock(undefined, { document: fakeDocument }))

    expect(result.current.isSupported).toBe(true)

    const target = document.createElement('div')
    spyRequestPointerLock(target)
    let locked!: Promise<Element | null>
    await act(async () => {
      locked = result.current.lock({ current: target })
    })
    expect(result.current.element).toBeNull()

    setFakePointerLockElement(target)
    await act(() => {
      listeners.pointerlockchange.forEach(listener => listener(new Event('pointerlockchange')))
    })
    expect(result.current.element).toBe(target)
    await expect(locked).resolves.toBe(target)

    let released!: Promise<boolean>
    await act(async () => {
      released = result.current.unlock()
    })
    expect(exitSpy).toHaveBeenCalledTimes(1)

    setFakePointerLockElement(null)
    await act(() => {
      listeners.pointerlockchange.forEach(listener => listener(new Event('pointerlockchange')))
    })
    expect(result.current.element).toBeNull()
    await expect(released).resolves.toBe(true)
  })

  it('reports isSupported false and lock() rejects on documents without the Pointer Lock API', async () => {
    const fakeDocument = {
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Document

    const { result, act } = await renderHook(() => usePointerLock(undefined, { document: fakeDocument }))

    expect(result.current.isSupported).toBe(false)
    expect(result.current.element).toBeNull()

    let promise!: Promise<Element | null>
    await act(async () => {
      promise = result.current.lock({ current: document.createElement('div') })
    })
    await expect(promise).rejects.toThrow('Pointer Lock API is not supported by your browser.')
  })

  it('removes its document listeners on unmount without releasing the lock', async () => {
    const exitSpy = vi.spyOn(document, 'exitPointerLock').mockImplementation(() => {})
    const { result, act, unmount } = await renderHook(() => usePointerLock())
    const target = document.createElement('div')
    spyRequestPointerLock(target)

    let locked!: Promise<Element | null>
    await act(async () => {
      locked = result.current.lock({ current: target })
    })
    stubPointerLockElement(target)
    await act(() => {
      document.dispatchEvent(new Event('pointerlockchange'))
    })
    await expect(locked).resolves.toBe(target)
    expect(result.current.element).toBe(target)

    // upstream never unlocks on scope dispose — only the listeners go away
    unmount()
    expect(exitSpy).not.toHaveBeenCalled()

    stubPointerLockElement(null)
    document.dispatchEvent(new Event('pointerlockchange'))
    expect(result.current.element).toBe(target)
  })

  it('keeps lock/unlock stable across rerenders', async () => {
    const { result, rerender } = await renderHook(() => usePointerLock())
    const first = result.current

    rerender()

    expect(result.current.lock).toBe(first.lock)
    expect(result.current.unlock).toBe(first.unlock)
  })
})
