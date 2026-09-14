import type { Mock } from 'vitest'
import { useListener } from '@reause/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useDevicesList } from '../useDevicesList'

type Restore = () => void

const restores: Restore[] = []

afterEach(() => {
  restores.splice(0).forEach(restore => restore())
})

const camera1: MediaDeviceInfo = { deviceId: 'cam-1', kind: 'videoinput', label: 'Camera 1', groupId: 'g-1' } as MediaDeviceInfo
const camera2: MediaDeviceInfo = { deviceId: 'cam-2', kind: 'videoinput', label: 'Camera 2', groupId: 'g-1' } as MediaDeviceInfo
const mic1: MediaDeviceInfo = { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1', groupId: 'g-2' } as MediaDeviceInfo
const speaker1: MediaDeviceInfo = { deviceId: 'spk-1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'g-3' } as MediaDeviceInfo

const allDevices = [camera1, mic1, speaker1]

function createFakeStream(): { stream: MediaStream, stops: Mock[] } {
  const stops: Mock[] = []
  const tracks = ['video', 'audio'].map((kind) => {
    const stop = vi.fn()
    stops.push(stop)
    return { kind, stop }
  })
  const stream = {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter(track => track.kind === 'video'),
    getAudioTracks: () => tracks.filter(track => track.kind === 'audio'),
  } as unknown as MediaStream
  return { stream, stops }
}

/**
 * Headless chromium has no real media devices, so `navigator.mediaDevices`
 * is stubbed with a configurable own property (`mediaDevices` normally lives
 * on `Navigator.prototype` — dropping the own property restores the native
 * getter). `addEventListener`/`removeEventListener` keep the `devicechange`
 * listeners registered by the hook so tests can fire the event.
 */
function stubMediaDevices(overrides: {
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>
  getUserMedia?: () => Promise<MediaStream>
} = {}) {
  const deviceChangeListeners = new Set<() => void>()
  const mediaDevices = {
    enumerateDevices: vi.fn(overrides.enumerateDevices ?? (async () => [])),
    ...(overrides.getUserMedia ? { getUserMedia: vi.fn(overrides.getUserMedia) } : {}),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === 'devicechange')
        deviceChangeListeners.add(listener)
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === 'devicechange')
        deviceChangeListeners.delete(listener)
    }),
  }
  const original = navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices,
  })
  restores.push(() => {
    if (original === undefined)
      Reflect.deleteProperty(navigator, 'mediaDevices')
    else
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original })
  })
  return {
    mediaDevices,
    emitDeviceChange: () => {
      deviceChangeListeners.forEach(listener => listener())
    },
  }
}

function createPermissionStatus(state: PermissionState): PermissionStatus {
  const listeners = new Set<EventListener>()
  return {
    name: 'camera' as PermissionName,
    state,
    onchange: null,
    addEventListener: (_type: string, listener: EventListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: EventListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  } as unknown as PermissionStatus
}

/**
 * Stub `navigator.permissions.query` (used by the composed `usePermission`
 * hook) — `permissions` normally lives on `Navigator.prototype`, so the own
 * property is dropped on restore.
 */
function stubPermissionQuery(queryImpl: (descriptor: PermissionDescriptor) => Promise<PermissionStatus>) {
  const query = vi.fn(queryImpl)
  const original = navigator.permissions
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query },
  })
  restores.push(() => {
    if (original === undefined)
      Reflect.deleteProperty(navigator, 'permissions')
    else
      Object.defineProperty(navigator, 'permissions', { configurable: true, value: original })
  })
  return query
}

describe('useDevicesList', () => {
  it('should be defined', () => {
    expect(useDevicesList).toBeDefined()
  })

  it('reports isSupported false and keeps defaults when mediaDevices is unavailable', async () => {
    const original = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    restores.push(() => {
      if (original === undefined)
        Reflect.deleteProperty(navigator, 'mediaDevices')
      else
        Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original })
    })

    const { result } = await renderHook(() => useDevicesList())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.devices).toEqual([])
    expect(result.current.videoInputs).toEqual([])
    expect(result.current.audioInputs).toEqual([])
    expect(result.current.audioOutputs).toEqual([])
    expect(result.current.permissionGranted).toBe(false)
    await expect(result.current.ensurePermissions()).resolves.toBe(false)
  })

  it('enumerates devices and filters them by kind', async () => {
    stubMediaDevices({ enumerateDevices: async () => allDevices })
    const { result } = await renderHook(() => useDevicesList())

    await expect.poll(() => result.current.devices).toEqual(allDevices)
    expect(result.current.isSupported).toBe(true)
    expect(result.current.videoInputs).toEqual([camera1])
    expect(result.current.audioInputs).toEqual([mic1])
    expect(result.current.audioOutputs).toEqual([speaker1])
  })

  it('refreshes devices on the devicechange event', async () => {
    let current = [...allDevices]
    const enumerateDevices = vi.fn(async () => current)
    const { emitDeviceChange } = stubMediaDevices({ enumerateDevices })

    const { result } = await renderHook(() => useDevicesList())
    await expect.poll(() => result.current.devices).toEqual(allDevices)

    current = [...allDevices, camera2]
    emitDeviceChange()
    await expect.poll(() => result.current.devices).toEqual(current)

    expect(enumerateDevices).toHaveBeenCalledTimes(2)
  })

  it('removes the devicechange listener on unmount', async () => {
    const { mediaDevices, emitDeviceChange } = stubMediaDevices({ enumerateDevices: async () => allDevices })

    const { result, unmount } = await renderHook(() => useDevicesList())
    await expect.poll(() => result.current.devices).toEqual(allDevices)

    unmount()
    emitDeviceChange()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mediaDevices.removeEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
  })

  it('onUpdated registers a listener fired after each enumeration and unsubscribes via off', async () => {
    const { emitDeviceChange } = stubMediaDevices({ enumerateDevices: async () => allDevices })
    const { result, act } = await renderHook(() => useDevicesList())
    await expect.poll(() => result.current.devices).toEqual(allDevices)

    const calls: MediaDeviceInfo[][] = []
    const off = result.current.onUpdated(next => calls.push(next))
    expect(calls).toHaveLength(0)

    emitDeviceChange()
    await expect.poll(() => calls).toHaveLength(1)
    expect(calls[0]).toEqual(allDevices)

    off()
    emitDeviceChange()
    await act(async () => {})
    expect(calls).toHaveLength(1)
  })

  it('fires the onUpdated option after each enumeration', async () => {
    const { emitDeviceChange } = stubMediaDevices({ enumerateDevices: async () => allDevices })
    const onUpdated = vi.fn()

    const { result } = await renderHook(() => useDevicesList({ onUpdated }))

    // mount enumeration fires it once, like upstream's `onUpdated?.(...)`
    await expect.poll(() => onUpdated).toHaveBeenCalledTimes(1)
    expect(onUpdated).toHaveBeenLastCalledWith(allDevices)
    await expect.poll(() => result.current.devices).toEqual(allDevices)

    emitDeviceChange()
    await expect.poll(() => onUpdated).toHaveBeenCalledTimes(2)
    expect(onUpdated).toHaveBeenLastCalledWith(allDevices)
  })

  it('useListener(onUpdated, cb) fires on enumeration and unsubscribes on unmount', async () => {
    const { emitDeviceChange } = stubMediaDevices({ enumerateDevices: async () => allDevices })

    const calls: MediaDeviceInfo[][] = []
    const { unmount } = await renderHook(() => {
      const list = useDevicesList()
      useListener(list.onUpdated, (next) => {
        calls.push(next)
      })
      return list
    })

    // the listener registers before the initial enumeration resolves, so the
    // mount update fires it once
    await expect.poll(() => calls).toHaveLength(1)
    expect(calls[0]).toEqual(allDevices)

    // a devicechange fires it again
    emitDeviceChange()
    await expect.poll(() => calls).toHaveLength(2)

    // after unmount the listener no longer fires
    unmount()
    emitDeviceChange()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(calls).toHaveLength(2)
  })

  it('ensurePermissions returns true when permission is already granted', async () => {
    const enumerateDevices = vi.fn(async () => allDevices)
    stubMediaDevices({ enumerateDevices })
    stubPermissionQuery(async () => createPermissionStatus('granted'))

    const { result } = await renderHook(() => useDevicesList())
    await expect.poll(() => result.current.isSupported).toBe(true)

    await expect(result.current.ensurePermissions()).resolves.toBe(true)
    await expect.poll(() => result.current.permissionGranted).toBe(true)
    expect(enumerateDevices).toHaveBeenCalledTimes(1)
  })

  it('ensurePermissions requests getUserMedia when permission is not granted', async () => {
    const { stream } = createFakeStream()
    const getUserMedia = vi.fn(async () => stream)
    stubMediaDevices({ enumerateDevices: async () => allDevices, getUserMedia })
    stubPermissionQuery(async () => createPermissionStatus('prompt'))

    const { result } = await renderHook(() => useDevicesList())

    await expect(result.current.ensurePermissions()).resolves.toBe(true)
    await expect.poll(() => result.current.permissionGranted).toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: true })
  })

  it('passes the full constraints object to getUserMedia', async () => {
    const { stream } = createFakeStream()
    const getUserMedia = vi.fn(async () => stream)
    stubMediaDevices({ enumerateDevices: async () => allDevices, getUserMedia })
    stubPermissionQuery(async () => createPermissionStatus('prompt'))

    const { result } = await renderHook(() => useDevicesList({
      constraints: { video: { width: 640 }, audio: false },
    }))

    await expect(result.current.ensurePermissions()).resolves.toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({ video: { width: 640 }, audio: false })
  })

  it('disables video/audio in getUserMedia when no matching device exists', async () => {
    const { stream } = createFakeStream()
    const getUserMedia = vi.fn(async () => stream)
    // no videoinput device → the camera branch of the rebuilt constraints
    stubMediaDevices({ enumerateDevices: async () => [mic1, speaker1], getUserMedia })
    stubPermissionQuery(async () => createPermissionStatus('prompt'))

    const { result } = await renderHook(() => useDevicesList())

    await expect(result.current.ensurePermissions()).resolves.toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({ video: false, audio: true })
  })

  it('still requests getUserMedia when the permissions API is absent', async () => {
    const { stream } = createFakeStream()
    const getUserMedia = vi.fn(async () => stream)
    stubMediaDevices({ enumerateDevices: async () => allDevices, getUserMedia })
    // no `navigator.permissions` stub — the inline query yields undefined and
    // the flow falls through to the getUserMedia prompt
    const original = navigator.permissions
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined })
    restores.push(() => {
      if (original === undefined)
        Reflect.deleteProperty(navigator, 'permissions')
      else
        Object.defineProperty(navigator, 'permissions', { configurable: true, value: original })
    })

    const { result } = await renderHook(() => useDevicesList())

    await expect(result.current.ensurePermissions()).resolves.toBe(true)
    await expect.poll(() => result.current.permissionGranted).toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: true })
  })

  it('ensurePermissions returns false when getUserMedia fails', async () => {
    const getUserMedia = vi.fn(async () => {
      throw new DOMException('Permission denied', 'NotAllowedError')
    })
    stubMediaDevices({ enumerateDevices: async () => allDevices, getUserMedia })
    stubPermissionQuery(async () => createPermissionStatus('prompt'))

    const { result } = await renderHook(() => useDevicesList())

    await expect(result.current.ensurePermissions()).resolves.toBe(false)
    await expect.poll(() => result.current.permissionGranted).toBe(false)
  })

  it('requests permissions on mount when requestPermissions is true', async () => {
    const { stream } = createFakeStream()
    const getUserMedia = vi.fn(async () => stream)
    stubMediaDevices({ enumerateDevices: async () => allDevices, getUserMedia })
    stubPermissionQuery(async () => createPermissionStatus('prompt'))

    const { result } = await renderHook(() => useDevicesList({ requestPermissions: true }))

    await expect.poll(() => result.current.permissionGranted).toBe(true)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('supports a custom navigator option', async () => {
    const enumerateDevices = vi.fn(async () => allDevices)
    const fakeNavigator = {
      mediaDevices: {
        enumerateDevices,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    } as unknown as Navigator

    const { result } = await renderHook(() => useDevicesList({ navigator: fakeNavigator }))

    await expect.poll(() => result.current.devices).toEqual(allDevices)
    expect(result.current.isSupported).toBe(true)
    expect(enumerateDevices).toHaveBeenCalledTimes(1)
  })
})
