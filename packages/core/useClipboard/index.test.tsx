import type { UseClipboardReturn } from '../useClipboard'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useClipboard } from '../useClipboard'
import { usePermission } from '../usePermission'

/**
 * Minimal `PermissionStatus` stand-in: a `state` plus no-op `change`
 * listeners (`usePermission` only reads `state` and adds/removes listeners).
 */
function createPermissionStatus(state: PermissionState): PermissionStatus {
  return {
    state,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as PermissionStatus
}

let cleanups: Array<() => void> = []

afterEach(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
})

/**
 * Stubs `navigator.permissions` so every query resolves to `state`. The
 * Permissions API is not grantable in the chromium test env, and
 * `useClipboard` treats only `'granted'` / `'prompt'` as allowed, so
 * `'denied'` forces the `document.execCommand` legacy path.
 */
function installPermissions(state: PermissionState) {
  const original = Object.getOwnPropertyDescriptor(navigator, 'permissions')
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: vi.fn(async () => createPermissionStatus(state)) },
  })
  cleanups.push(() => {
    if (original)
      Object.defineProperty(navigator, 'permissions', original)
    else
      Reflect.deleteProperty(navigator, 'permissions')
  })
}

/** Shadows `document.execCommand` with a spy so legacy writes are observable. */
function installExecCommandSpy() {
  const spy = vi.fn(() => true)
  Object.defineProperty(document, 'execCommand', { configurable: true, writable: true, value: spy })
  cleanups.push(() => Reflect.deleteProperty(document, 'execCommand'))
  return spy
}

/** Shadows `navigator.clipboard` with spies so the native path is observable. */
function installClipboard(writeImpl: () => Promise<void> = async () => {}) {
  const write = vi.fn(writeImpl)
  const readText = vi.fn(async () => '')
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: { write, readText },
  })
  cleanups.push(() => Reflect.deleteProperty(navigator, 'clipboard'))
  return { write, readText }
}

describe('useClipboard', () => {
  it('should be defined', () => {
    expect(useClipboard).toBeDefined()
  })

  it('should be supported', async () => {
    const { result } = await renderHook(() => useClipboard())
    await expect.poll(() => result.current[2].isSupported).toBe(true)
  })

  describe('without permissions', () => {
    it('should write to legacy clipboard', async () => {
      // Deny clipboard permissions: `isAllowed` only accepts `'granted'` /
      // `'prompt'`, so a denied state makes `copy` skip the native
      // `navigator.clipboard.write` entirely and take the legacy
      // `document.execCommand('copy')` path.
      installPermissions('denied')
      const clipboard = installClipboard()
      const execCommand = installExecCommandSpy()

      const { result: writePermission } = await renderHook(() => usePermission('clipboard-write'))
      await expect.poll(() => writePermission.current).toBe('denied')

      const { result, act } = await renderHook(() => useClipboard())
      // flush the mount-time permission query into the hook's refs
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current[0]).toBe('')
      expect(result.current[2].copied).toBe(false)

      await result.current[1]('hello')

      expect(clipboard.write).not.toHaveBeenCalled()
      expect(execCommand).toHaveBeenCalledWith('copy')
      await expect.poll(() => result.current[0]).toBe('hello')
      await expect.poll(() => result.current[2].copied).toBe(true)
    })

    it('should copy text from async function', async () => {
      const { result } = await renderHook(() => useClipboard())
      expect(result.current[0]).toBe('')
      expect(result.current[2].copied).toBe(false)

      const promise = result.current[1](async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return 'async text'
      })
      await expect.poll(() => result.current[2].copyPending, { interval: 10 }).toBe(true)

      await promise

      await expect.poll(() => result.current[0]).toBe('async text')
      await expect.poll(() => result.current[2].copied).toBe(true)
    })

    it('should fall back to legacy clipboard if write fails', async () => {
      // `'prompt'` is allowed, so `copy` attempts the native write first and
      // must fall back to `execCommand` when that write rejects.
      installPermissions('prompt')
      const clipboard = installClipboard(async () => {
        throw new Error('clipboard write denied')
      })
      const execCommand = installExecCommandSpy()

      const { result } = await renderHook(() => useClipboard())
      await expect.poll(() => result.current[2].isSupported).toBe(true)

      await result.current[1]('hello')

      expect(clipboard.write).toHaveBeenCalledTimes(1)
      expect(execCommand).toHaveBeenCalledWith('copy')
      await expect.poll(() => result.current[0]).toBe('hello')
      await expect.poll(() => result.current[2].copied).toBe(true)
    })

    it.todo('should read from legacy clipboard')
  })

  describe('with permissions', () => {
    // todo: mock navigator permissions
    it.todo('should write to clipboard')

    it.todo('should read from clipboard')

    it.todo('should fall back to legacy clipboard if read fails')
  })

  it('returns a React tuple [text, copy, { copied, isSupported, copyPending }]', async () => {
    const { result } = await renderHook(() => useClipboard())

    expectTypeOf(result.current).toEqualTypeOf<UseClipboardReturn<false>>()
    expectTypeOf(result.current[0]).toEqualTypeOf<string>()
    expectTypeOf(result.current[1]).toEqualTypeOf<(text: string | (() => Promise<string | undefined>)) => Promise<void>>()
    expectTypeOf(result.current[2].copied).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[2].isSupported).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[2].copyPending).toEqualTypeOf<boolean>()

    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current).toHaveLength(3)
    expect(result.current[0]).toBe('')
    expect(result.current[1]).toBeTypeOf('function')
    expect(result.current[2].copied).toBe(false)
    expect(result.current[2].copyPending).toBe(false)
  })

  it('keeps the controls object identity while its members are unchanged', async () => {
    const { result, rerender } = await renderHook(() => useClipboard())
    await expect.poll(() => result.current[2].isSupported).toBe(true)

    const first = result.current[2]
    await rerender()

    expect(result.current[2]).toBe(first)
  })
})
