import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useWebNotification } from '../useWebNotification'

type NotificationEventType = 'click' | 'show' | 'error' | 'close'

/**
 * Deterministic Notification replacement (jsdom/chromium have no real
 * notification service in CI): EventTarget-based, records constructed
 * instances and close() calls, exposes the `on*` handler props the hook
 * wires, and can fire events at those handlers.
 */
class FakeNotification extends EventTarget {
  static instances: FakeNotification[] = []
  static permission: NotificationPermission = 'default'
  static requestPermission: (...args: unknown[]) => Promise<NotificationPermission> = vi.fn(async (): Promise<NotificationPermission> => 'granted')

  title: string
  options: Record<string, unknown>
  closeCalls = 0
  onclick: ((event: Event) => void) | null = null
  onshow: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: Event) => void) | null = null

  constructor(title = '', options?: Record<string, unknown>) {
    super()
    this.title = title
    this.options = options ?? {}
    FakeNotification.instances.push(this)
  }

  close(): void {
    this.closeCalls++
    this.fire('close')
  }

  fire(type: NotificationEventType): void {
    const handler = this[`on${type}` as `on${NotificationEventType}`]
    handler?.(new Event(type))
  }
}

/** Android Chrome quirk: the Notification constructor itself throws. */
class ThrowingNotification {
  constructor() {
    throw new TypeError('Failed to construct \'Notification\': Illegal constructor')
  }
}

const nativeNotificationDescriptor = Object.getOwnPropertyDescriptor(window, 'Notification')

function installNotificationStub(permission: NotificationPermission = 'default', ctor: unknown = FakeNotification) {
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: ctor })
  FakeNotification.instances = []
  FakeNotification.permission = permission
  FakeNotification.requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'granted')
}

function asFake(instance: Notification | null | undefined): FakeNotification {
  return instance as unknown as FakeNotification
}

afterEach(() => {
  if (nativeNotificationDescriptor)
    Object.defineProperty(window, 'Notification', nativeNotificationDescriptor)
  else
    Reflect.deleteProperty(window, 'Notification')
  Reflect.deleteProperty(document, 'visibilityState')
  vi.restoreAllMocks()
})

describe('useWebNotification', () => {
  it('reports isSupported and skips the request when permission is already granted', async () => {
    installNotificationStub('granted')

    const { result } = await renderHook(() => useWebNotification())

    expect(result.current.isSupported).toBe(true)
    expect(result.current.permissionGranted).toBe(true)
    // Granted permission short-circuits the constructability probe:
    expect(FakeNotification.instances).toHaveLength(0)
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  })

  it('probes constructability and auto-requests permission when permission is default', async () => {
    installNotificationStub('default')

    const { result } = await renderHook(() => useWebNotification())

    expect(result.current.isSupported).toBe(true)
    // The mount probe constructed one (empty) Notification:
    expect(FakeNotification.instances).toHaveLength(1)
    await expect.poll(() => result.current.permissionGranted).toBe(true)
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('reports isSupported=false when the Notification constructor throws TypeError', async () => {
    installNotificationStub('default', ThrowingNotification)

    const { result } = await renderHook(() => useWebNotification())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.permissionGranted).toBe(false)
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  })

  it('reports isSupported=false when window has no Notification', async () => {
    installNotificationStub('default')
    Reflect.deleteProperty(window, 'Notification')

    const { result } = await renderHook(() => useWebNotification())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.permissionGranted).toBe(false)
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  })

  it('does not request permissions on mount when requestPermissions: false', async () => {
    installNotificationStub('default')

    const { result } = await renderHook(() => useWebNotification({ requestPermissions: false }))

    expect(result.current.isSupported).toBe(true)
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
    expect(result.current.permissionGranted).toBe(false)
  })

  it('ensurePermissions requests and resolves true when the user grants', async () => {
    installNotificationStub('default')

    const { result, act } = await renderHook(() => useWebNotification({ requestPermissions: false }))
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()

    let granted: boolean | undefined
    await act(async () => {
      granted = await result.current.ensurePermissions()
    })

    expect(granted).toBe(true)
    expect(result.current.permissionGranted).toBe(true)
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('ensurePermissions does not request and resolves false when permission is denied', async () => {
    installNotificationStub('denied')

    const { result, act } = await renderHook(() => useWebNotification({ requestPermissions: false }))

    let granted: boolean | undefined
    await act(async () => {
      granted = await result.current.ensurePermissions()
    })

    expect(granted).toBe(false)
    expect(result.current.permissionGranted).toBe(false)
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  })

  it('ensurePermissions resolves false without flipping state when the request stays default', async () => {
    installNotificationStub('default')
    FakeNotification.requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'default')

    const { result, act } = await renderHook(() => useWebNotification({ requestPermissions: false }))

    let granted: boolean | undefined
    await act(async () => {
      granted = await result.current.ensurePermissions()
    })

    expect(granted).toBe(false)
    expect(result.current.permissionGranted).toBe(false)
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('ensurePermissions resolves undefined when unsupported', async () => {
    installNotificationStub('default')
    Reflect.deleteProperty(window, 'Notification')

    const { result, act } = await renderHook(() => useWebNotification())

    let granted: boolean | undefined = true
    await act(async () => {
      granted = await result.current.ensurePermissions()
    })

    expect(granted).toBeUndefined()
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  })

  it('show creates a Notification from the merged options and sets notification', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification({ title: 'Hello', body: 'base', dir: 'auto', tag: 'base' }))

    let shown: Notification | undefined
    await act(async () => {
      shown = await result.current.show({ body: 'override', tag: 'override' })
    })

    expect(shown).toBeInstanceOf(FakeNotification)
    expect(result.current.notification).toBe(shown)
    expect(FakeNotification.instances).toHaveLength(1)
    expect(asFake(shown).title).toBe('Hello')
    expect(asFake(shown).options).toMatchObject({ title: 'Hello', body: 'override', dir: 'auto', tag: 'override' })
  })

  it('show defaults the constructor title to an empty string', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification())

    let shown: Notification | undefined
    await act(async () => {
      shown = await result.current.show()
    })

    expect(asFake(shown).title).toBe('')
  })

  it('show does nothing when permission has not been granted', async () => {
    installNotificationStub('default')

    const { result, act } = await renderHook(() => useWebNotification({ requestPermissions: false }))
    const probeCount = FakeNotification.instances.length

    let shown: Notification | undefined
    await act(async () => {
      shown = await result.current.show()
    })

    expect(shown).toBeUndefined()
    expect(result.current.notification).toBeNull()
    expect(FakeNotification.instances).toHaveLength(probeCount)
  })

  it('wires the notification click/show/error/close events to the on* hooks', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification())
    const clicked: string[] = []
    const shown: string[] = []
    const errored: string[] = []
    const closed: string[] = []
    result.current.onClick(event => clicked.push(event.type))
    result.current.onShow(event => shown.push(event.type))
    result.current.onError(event => errored.push(event.type))
    result.current.onClose(event => closed.push(event.type))

    let instance: Notification | undefined
    await act(async () => {
      instance = await result.current.show()
    })

    asFake(instance).fire('click')
    asFake(instance).fire('show')
    asFake(instance).fire('error')
    asFake(instance).fire('close')

    expect(clicked).toEqual(['click'])
    expect(shown).toEqual(['show'])
    expect(errored).toEqual(['error'])
    expect(closed).toEqual(['close'])
  })

  it('the returned off function unsubscribes a hook callback', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification())
    const clicked: string[] = []
    const off = result.current.onClick(event => clicked.push(event.type))

    let instance: Notification | undefined
    await act(async () => {
      instance = await result.current.show()
    })

    off()
    asFake(instance).fire('click')

    expect(clicked).toEqual([])
  })

  it('show replaces the current notification without closing the previous one', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification({ tag: 'n' }))

    let first: Notification | undefined
    let second: Notification | undefined
    await act(async () => {
      first = await result.current.show({ tag: 'one' })
    })
    await act(async () => {
      second = await result.current.show({ tag: 'two' })
    })

    expect(FakeNotification.instances).toHaveLength(2)
    expect(asFake(first).closeCalls).toBe(0)
    expect(asFake(first).options.tag).toBe('one')
    expect(asFake(second).options.tag).toBe('two')
    expect(result.current.notification).toBe(second)
  })

  it('close closes the current notification and resets it', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification())

    let instance: Notification | undefined
    await act(async () => {
      instance = await result.current.show()
    })
    const closed: string[] = []
    result.current.onClose(event => closed.push(event.type))

    act(() => {
      result.current.close()
    })

    expect(asFake(instance).closeCalls).toBe(1)
    expect(result.current.notification).toBeNull()
    // Notification.close() fires the close event, so the onClose hook runs:
    expect(closed).toEqual(['close'])
  })

  it('closes the current notification on unmount', async () => {
    installNotificationStub('granted')

    const { result, act, unmount } = await renderHook(() => useWebNotification())

    let instance: Notification | undefined
    await act(async () => {
      instance = await result.current.show()
    })

    unmount()

    expect(asFake(instance).closeCalls).toBe(1)
  })

  it('clears event subscriptions on unmount', async () => {
    installNotificationStub('granted')

    const { result, act, unmount } = await renderHook(() => useWebNotification())
    const clicked: string[] = []
    result.current.onClick(event => clicked.push(event.type))

    let instance: Notification | undefined
    await act(async () => {
      instance = await result.current.show()
    })

    unmount()
    asFake(instance).fire('click')

    expect(clicked).toEqual([])
  })

  it('closes the stale notification on visibilitychange when the tab becomes visible', async () => {
    installNotificationStub('granted')

    const { result, act } = await renderHook(() => useWebNotification())

    let first: Notification | undefined
    await act(async () => {
      first = await result.current.show()
    })
    await act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(asFake(first).closeCalls).toBe(1)

    let second: Notification | undefined
    await act(async () => {
      second = await result.current.show()
    })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    await act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(asFake(second).closeCalls).toBe(0)
  })

  it('keeps identity of show/close/ensurePermissions stable across renders', async () => {
    installNotificationStub('granted')

    const { result, rerender } = await renderHook(() => useWebNotification({ tag: 'stable' }))
    const first = { show: result.current.show, close: result.current.close, ensurePermissions: result.current.ensurePermissions }

    rerender()

    expect(result.current.show).toBe(first.show)
    expect(result.current.close).toBe(first.close)
    expect(result.current.ensurePermissions).toBe(first.ensurePermissions)
    expect(result.current.onClick).toBeTypeOf('function')
  })
})
