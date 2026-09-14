import { useListener } from '@reause/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useBroadcastChannel } from '../useBroadcastChannel'

/**
 * A BroadcastChannel substitute deterministically constructible in chromium:
 * a plain class that records the registered listeners so tests can dispatch
 * events into the hook (the real API delivers messages across contexts).
 * `close()` mirrors the native API: it flips a closed flag, fires the `close`
 * event and makes a later `postMessage` throw `InvalidStateError`.
 */
class MockBroadcastChannel {
  readonly name: string
  readonly listeners: Record<string, Array<(event: Event) => void>> = {}
  closed = false
  postMessage = vi.fn(() => {
    if (this.closed)
      throw new DOMException('Cannot post message to a closed channel', 'InvalidStateError')
  })

  close = vi.fn(() => {
    this.closed = true
    this.emit('close', new Event('close'))
  })

  constructor(name: string) {
    this.name = name
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    if (!this.listeners[type])
      this.listeners[type] = []
    this.listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners[type]
    if (!listeners)
      return
    const index = listeners.indexOf(listener)
    if (index >= 0)
      listeners.splice(index, 1)
  }

  emit(type: string, event: Event) {
    this.listeners[type]?.slice().forEach(listener => listener(event))
  }
}

const mockBroadcastChannel = vi.fn<(name: string) => MockBroadcastChannel>()

// a regular (non-arrow) function so `new BroadcastChannel(name)` works — the
// arrow shorthand cannot be invoked as a constructor
function createMockBroadcastChannel(name: string): MockBroadcastChannel {
  return new MockBroadcastChannel(name)
}

function installBroadcastChannelStub() {
  mockBroadcastChannel.mockClear()
  mockBroadcastChannel.mockImplementation(createMockBroadcastChannel)
  Object.defineProperty(window, 'BroadcastChannel', { configurable: true, writable: true, value: mockBroadcastChannel })
}

const nativeBroadcastChannelDescriptor = Object.getOwnPropertyDescriptor(window, 'BroadcastChannel')

// The hook returns the channel typed as `BroadcastChannel`, but at runtime it
// is the mock instance — cast through `unknown` to reach the mock helpers.
function mockChannel(channel: BroadcastChannel | undefined): MockBroadcastChannel {
  return channel as unknown as MockBroadcastChannel
}

afterEach(() => {
  if (nativeBroadcastChannelDescriptor)
    Object.defineProperty(window, 'BroadcastChannel', nativeBroadcastChannelDescriptor)
  else
    Reflect.deleteProperty(window, 'BroadcastChannel')
})

describe('useBroadcastChannel', () => {
  beforeEach(() => {
    installBroadcastChannelStub()
  })

  it('should be defined', () => {
    expect(useBroadcastChannel).toBeDefined()
  })

  it('should create a channel with the given name on mount', async () => {
    const { result } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))

    expect(result.current.isSupported).toBe(true)
    expect(result.current.channel).toBeInstanceOf(MockBroadcastChannel)
    expect(result.current.channel?.name).toBe('test-channel')
    expect(mockBroadcastChannel).toHaveBeenCalledWith('test-channel')
  })

  it('should start with error === null and isClosed === false on mount', async () => {
    const { result } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))

    expect(result.current.error).toBeNull()
    expect(result.current.isClosed).toBe(false)
  })

  it('should use the configured `window` option for support detection', async () => {
    const customWindow = { BroadcastChannel: mockBroadcastChannel } as unknown as Window

    const { result } = await renderHook(() => useBroadcastChannel({ name: 'test-channel', window: customWindow }))

    expect(result.current.isSupported).toBe(true)
    expect(mockBroadcastChannel).toHaveBeenCalledWith('test-channel')
    expect(result.current.channel).toBeInstanceOf(MockBroadcastChannel)
  })

  it('should not create a channel when the configured `window` lacks BroadcastChannel', async () => {
    const customWindow = {} as unknown as Window

    const { result } = await renderHook(() => useBroadcastChannel({ name: 'test-channel', window: customWindow }))

    expect(result.current.isSupported).toBe(false)
    expect(result.current.channel).toBeUndefined()
    expect(mockBroadcastChannel).not.toHaveBeenCalled()
  })

  it('should post a message to the channel', async () => {
    const { result, act } = await renderHook(() => useBroadcastChannel<string, string>({ name: 'test-channel' }))

    await act(() => {
      result.current.post('Hello, World!')
    })

    expect(result.current.channel?.postMessage).toHaveBeenCalledWith('Hello, World!')
  })

  it('should update data on message', async () => {
    const { result, act } = await renderHook(() => useBroadcastChannel<string, string>({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)

    await act(() => {
      channel.emit('message', new MessageEvent('message', { data: 'Hello, World!' }))
    })

    expect(result.current.data).toBe('Hello, World!')
  })

  it('should set error on messageerror', async () => {
    const { result, act } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)
    const event = new MessageEvent('messageerror')

    await act(() => {
      channel.emit('messageerror', event)
    })

    expect(result.current.error).toBe(event)
  })

  it('should fire onMessage listeners with the message event', async () => {
    const onMessage = vi.fn()

    const { result, act } = await renderHook(() => useBroadcastChannel<string, string>({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)
    result.current.onMessage(onMessage)

    const event = new MessageEvent('message', { data: 'Hello' })
    await act(() => {
      channel.emit('message', event)
    })

    expect(onMessage).toHaveBeenCalledWith(event)
    expect(result.current.data).toBe('Hello')
  })

  it('should fire onMessageError listeners with the error event', async () => {
    const onMessageError = vi.fn()

    const { result, act } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)
    result.current.onMessageError(onMessageError)

    const event = new MessageEvent('messageerror')
    await act(() => {
      channel.emit('messageerror', event)
    })

    expect(onMessageError).toHaveBeenCalledWith(event)
    expect(result.current.error).toBe(event)
  })

  it('the returned `off` function unsubscribes the listener', async () => {
    const onMessage = vi.fn()

    const { result, act } = await renderHook(() => useBroadcastChannel<string, string>({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)

    const off = result.current.onMessage(onMessage)

    await act(() => {
      channel.emit('message', new MessageEvent('message', { data: 1 }))
    })
    expect(onMessage).toHaveBeenCalledTimes(1)

    off()

    await act(() => {
      channel.emit('message', new MessageEvent('message', { data: 2 }))
    })
    expect(onMessage).toHaveBeenCalledTimes(1)
  })

  it('should close the channel, keep the instance and mark isClosed', async () => {
    const { result, act } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)

    expect(result.current.isClosed).toBe(false)

    await act(() => {
      result.current.close()
    })

    expect(channel.close).toHaveBeenCalled()
    // upstream keeps `channel.value` after close — no longer released
    expect(result.current.channel).toBe(channel)
    expect(result.current.isClosed).toBe(true)
  })

  it('should post to the retained channel after close and throw InvalidStateError', async () => {
    const { result, act } = await renderHook(() => useBroadcastChannel<string, string>({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)

    await act(() => {
      result.current.close()
    })
    expect(result.current.channel).toBe(channel)

    expect(() => result.current.post('nope')).toThrowError(
      expect.objectContaining({ name: 'InvalidStateError' }),
    )
    expect(channel.postMessage).toHaveBeenCalledWith('nope')
  })

  it('should mark isClosed when the native close event fires', async () => {
    const { result, act } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)

    expect(result.current.isClosed).toBe(false)

    await act(() => {
      channel.emit('close', new Event('close'))
    })

    expect(result.current.isClosed).toBe(true)
    expect(channel.close).not.toHaveBeenCalled()
  })

  it('should close the channel on unmount', async () => {
    const { result, unmount } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))
    const channel = mockChannel(result.current.channel)

    await unmount()

    expect(channel.close).toHaveBeenCalled()
  })

  it('should not create a channel and not throw when BroadcastChannel is missing (SSR-safe)', async () => {
    Reflect.deleteProperty(window, 'BroadcastChannel')

    const { result } = await renderHook(() => useBroadcastChannel({ name: 'test-channel' }))

    expect(result.current.isSupported).toBe(false)
    expect(result.current.channel).toBeUndefined()
    expect(mockBroadcastChannel).not.toHaveBeenCalled()
  })

  it('useListener(onMessage, cb) fires on message and stops after unmount', async () => {
    const calls = vi.fn()

    const { result, act, unmount } = await renderHook(() => {
      const broadcastChannel = useBroadcastChannel<string, string>({ name: 'test-channel' })
      useListener(broadcastChannel.onMessage, (event) => {
        calls(event.data)
      })
      return broadcastChannel
    })
    const channel = mockChannel(result.current.channel)

    await act(() => {
      channel.emit('message', new MessageEvent('message', { data: 'Hello' }))
    })
    expect(calls).toHaveBeenCalledWith('Hello')

    await unmount()

    await act(() => {
      channel.emit('message', new MessageEvent('message', { data: 'Again' }))
    })
    expect(calls).toHaveBeenCalledTimes(1)
  })
})
