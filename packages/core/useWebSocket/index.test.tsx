import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useWebSocket } from '../useWebSocket'

// A WebSocket substitute deterministically constructible in chromium: a plain
// constructor function whose instances are EventTarget-less objects that only
// carry whatever the hook assigns (`onopen`/`onclose`/`onerror`/`onmessage`)
// plus the prototype `send`/`close` spies.
const mockWebSocket = vi.fn<(host: string) => WebSocket>()

function installWebSocketStub() {
  Object.defineProperty(window, 'WebSocket', { configurable: true, writable: true, value: mockWebSocket })
  mockWebSocket.mockClear()
  mockWebSocket.prototype.send = vi.fn()
  mockWebSocket.prototype.close = vi.fn()
}

const nativeWebSocketDescriptor = Object.getOwnPropertyDescriptor(window, 'WebSocket')

afterEach(() => {
  if (nativeWebSocketDescriptor)
    Object.defineProperty(window, 'WebSocket', nativeWebSocketDescriptor)
  else
    Reflect.deleteProperty(window, 'WebSocket')
  vi.useRealTimers()
})

/**
 * Plain `{ pause, resume }` interval scheduler mirroring upstream's
 * `useIntervalFn` test schedulers (reause's `useIntervalFn` is a React hook,
 * so it cannot be created lazily inside a scheduler callback).
 */
function intervalScheduler(interval: number) {
  return (cb: () => void) => {
    let id: ReturnType<typeof setInterval> | undefined
    const start = () => {
      if (id != null)
        return
      id = setInterval(cb, interval)
    }
    const stop = () => {
      if (id != null) {
        clearInterval(id)
        id = undefined
      }
    }
    start()
    return { pause: stop, resume: start }
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    installWebSocketStub()
    vi.useFakeTimers()
  })

  it('should be defined', () => {
    expect(useWebSocket).toBeDefined()
  })

  it('should initialise web socket', async () => {
    const { result } = await renderHook(() => useWebSocket('ws://localhost'))

    expect(result.current.data).toBe(null)
    expect(result.current.status).toBe('CONNECTING')
    expect(mockWebSocket).toBeCalledWith('ws://localhost', [])
    expect(result.current.close).toBeDefined()
    expect(result.current.send).toBeDefined()
    expect(result.current.open).toBeDefined()
    expect(result.current.ws).toBeDefined()
  })

  it('should reconnect if URL changes', async () => {
    const { result, rerender } = await renderHook(
      (url: string = 'ws://localhost') => useWebSocket(url),
      { initialProps: 'ws://localhost' },
    )

    await rerender('ws://127.0.0.1')

    expect(mockWebSocket.prototype.close).toBeCalledWith(1000, undefined)
    expect(mockWebSocket).toBeCalledWith('ws://127.0.0.1', [])
    expect(result.current.status).toBe('CONNECTING')
  })

  it('should not reconnect on URL change if immediate and autoConnect are false', async () => {
    const { result, rerender } = await renderHook(
      (url: string = 'ws://localhost') => useWebSocket(url, {
        immediate: false,
        autoConnect: false,
      }),
      { initialProps: 'ws://localhost' },
    )

    await rerender('ws://127.0.0.1')

    expect(mockWebSocket.prototype.close).not.toHaveBeenCalled()
    expect(mockWebSocket).not.toHaveBeenCalledWith('ws://127.0.0.1', [])
    expect(result.current.status).toBe('CLOSED')
  })

  it('should remain closed if immediate is false', async () => {
    const { result } = await renderHook(() => useWebSocket('ws://localhost', {
      immediate: false,
    }))

    expect(result.current.status).toBe('CLOSED')
  })

  describe('open', () => {
    it('should reconnect if called while still open', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

      expect(result.current.status).toBe('CONNECTING')
      expect(mockWebSocket).toHaveBeenCalledTimes(1)

      await act(() => {
        result.current.open()
      })

      expect(result.current.status).toBe('CONNECTING')
      expect(mockWebSocket).toHaveBeenCalledTimes(2)
    })

    it('should open socket', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        immediate: false,
      }))

      expect(result.current.status).toBe('CLOSED')
      expect(mockWebSocket).not.toHaveBeenCalled()

      await act(() => {
        result.current.open()
      })

      expect(result.current.status).toBe('CONNECTING')
      expect(mockWebSocket).toBeCalledWith('ws://localhost', [])
    })
  })

  describe('close', () => {
    it('should close socket', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

      expect(result.current.status).toBe('CONNECTING')

      await act(() => {
        result.current.close()
      })

      expect(mockWebSocket.prototype.close).toBeCalledWith(1000, undefined)
    })

    it('should sync status to CLOSED after close() when onclose fires', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

      const ws = result.current.ws
      await act(() => {
        ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')

      await act(() => {
        result.current.close()
      })

      // Real browsers fire onclose asynchronously after WebSocket.close().
      // Simulate that here: at this point close() has already nulled wsRef,
      // so the handler must still transition status to CLOSED.
      await act(() => {
        ws?.onclose?.(new CloseEvent('close'))
      })

      expect(result.current.status).toBe('CLOSED')
    })
  })

  describe('autoClose', () => {
    it('should close on unload if true', async () => {
      const { act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoClose: true,
      }))

      await act(() => {
        window.dispatchEvent(new Event('beforeunload'))
      })

      expect(mockWebSocket.prototype.close).toHaveBeenCalled()
    })

    it('should close on unmount if true', async () => {
      const { result, unmount } = await renderHook(() => useWebSocket('ws://localhost', {
        autoClose: true,
      }))

      expect(result.current.status).toBe('CONNECTING')
      await unmount()

      expect(mockWebSocket.prototype.close).toHaveBeenCalled()
    })

    it('should not close on unload if false', async () => {
      const { act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoClose: false,
      }))

      await act(() => {
        window.dispatchEvent(new Event('beforeunload'))
      })

      expect(mockWebSocket.prototype.close).not.toHaveBeenCalled()
    })
  })

  it('should set data on message', async () => {
    const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    const ev = new MessageEvent('message', {
      data: 'bleep bloop',
    })

    await act(() => {
      result.current.ws?.onmessage?.(ev)
    })

    expect(result.current.data).toBe('bleep bloop')
  })

  it('should not set data on message from a superseded socket', async () => {
    const { result, act, rerender } = await renderHook(
      (url: string = 'ws://localhost') => useWebSocket(url),
      { initialProps: 'ws://localhost' },
    )

    const ws = result.current.ws
    await act(() => {
      ws?.onopen?.(new Event('open'))
    })

    await rerender('ws://127.0.0.1')

    await act(() => {
      ws?.onmessage?.(new MessageEvent('message', {
        data: 'bleep bloop',
      }))
    })

    expect(result.current.data).toBe(null)
  })

  it('should call onMessage on message', async () => {
    const onMessage = vi.fn()

    const { result, act } = await renderHook(() => useWebSocket('ws://localhost', { onMessage }))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    const ev = new MessageEvent('message', {
      data: 'bleep bloop',
    })

    await act(() => {
      result.current.ws?.onmessage?.(ev)
    })

    expect(onMessage).toBeCalledWith(result.current.ws, ev)
  })

  it('should call onError on error', async () => {
    const onError = vi.fn()

    const { result, act } = await renderHook(() => useWebSocket('ws://localhost', { onError }))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    const ev = new Event('error')

    await act(() => {
      result.current.ws?.onerror?.(ev)
    })

    expect(onError).toBeCalledWith(result.current.ws, ev)
  })

  it('should call onDisconnected on close', async () => {
    const onDisconnected = vi.fn()

    const { result, act } = await renderHook(() => useWebSocket('ws://localhost', { onDisconnected }))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    const ev = new CloseEvent('close')

    await act(() => {
      result.current.ws?.onclose?.(ev)
    })

    expect(onDisconnected).toBeCalledWith(result.current.ws, ev)
  })

  it('should be CLOSED on close', async () => {
    const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    expect(result.current.status).toBe('OPEN')

    await act(() => {
      result.current.ws?.onclose?.(new CloseEvent('close'))
    })

    expect(result.current.status).toBe('CLOSED')
  })

  it('should be OPEN on open', async () => {
    const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    expect(result.current.status).toBe('OPEN')
  })

  it('should call onConnected on open', async () => {
    const onConnected = vi.fn()

    const { result, act } = await renderHook(() => useWebSocket('ws://localhost', { onConnected }))

    await act(() => {
      result.current.ws?.onopen?.(new Event('open'))
    })

    expect(onConnected).toBeCalledWith(result.current.ws)
  })

  describe('send', () => {
    it('should buffer data until connect if buffer=true', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

      await act(() => {
        result.current.send('bleep bloop', true)
      })

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      expect(mockWebSocket.prototype.send).toBeCalledWith('bleep bloop')
    })

    it('should send data', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost'))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      await act(() => {
        result.current.send('bleep bloop')
      })

      expect(mockWebSocket.prototype.send).toBeCalledWith('bleep bloop')
    })
  })

  describe('heartbeat', () => {
    it('should send a heartbeat if heartbeat=true', async () => {
      const { result, act } = await renderHook(() => useWebSocket('wss://server.example.com', {
        heartbeat: {
          scheduler: intervalScheduler(500),
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(mockWebSocket.prototype.send).toBeCalledWith('ping')
    })

    it('should not send heartbeats or force-close before the socket opens with the default scheduler', async () => {
      const { result, act } = await renderHook(() => useWebSocket('wss://server.example.com', {
        heartbeat: true,
      }))

      expect(result.current.status).toBe('CONNECTING')
      mockWebSocket.prototype.send.mockClear()
      mockWebSocket.prototype.close.mockClear()

      // upstream's default `useIntervalFn(cb, 1000, { immediate: false })`
      // stays inert until `ws.onopen` calls `resume()` — a never-opening
      // socket must not ping nor hit the pong-timeout force-close
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(mockWebSocket.prototype.send).not.toHaveBeenCalled()
      expect(mockWebSocket.prototype.close).not.toHaveBeenCalled()
      expect(result.current.status).toBe('CONNECTING')

      // once the socket opens, the default heartbeat resumes
      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(mockWebSocket.prototype.send).toBeCalledWith('ping')
    })

    it('should resolve a responseMessage factory on every tick', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        heartbeat: {
          // reause keeps the message-factory arm of upstream's `MaybeRefOrGetter`
          // and drops the ref arm — a `{ current }` object is not unwrapped
          responseMessage: () => 'pong',
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      const ev = new MessageEvent('message', {
        data: 'pong',
      })

      await act(() => {
        result.current.ws?.onmessage?.(ev)
      })

      expect(result.current.data).toBe(null)
    })

    it('should not send a heartbeat if heartbeat=false', async () => {
      const { result, act } = await renderHook(() => useWebSocket('wss://server.example.com', {
        heartbeat: false,
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(mockWebSocket.prototype.send).not.toHaveBeenCalled()
    })

    it('should call close on pongTimeout', async () => {
      const { result, act } = await renderHook(() => useWebSocket('wss://server.example.com', {
        heartbeat: {
          scheduler: intervalScheduler(500),
          pongTimeout: 1000,
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')
      mockWebSocket.prototype.close.mockClear()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1499)
      })
      expect(mockWebSocket.prototype.close).not.toHaveBeenCalled()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(mockWebSocket.prototype.close).toHaveBeenCalledOnce()
    })

    it('should not call close on pongTimeout if connection already closed', async () => {
      const { result, act } = await renderHook(() => useWebSocket('wss://server.example.com', {
        heartbeat: {
          message: 'ping',
          scheduler: intervalScheduler(500),
          pongTimeout: 1000,
        },
      }))
      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')
      const ev = new CloseEvent('close')
      await act(() => {
        result.current.ws?.onclose?.(ev)
      })
      expect(result.current.status).toBe('CLOSED')
      mockWebSocket.prototype.close.mockClear()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500)
      })
      expect(mockWebSocket.prototype.close).not.toHaveBeenCalled()
    })

    it('should not send a heartbeat if the connection is closed', async () => {
      const messageSpy = vi.fn(() => 'ping')
      const { result, act } = await renderHook(() => useWebSocket('wss://server.example.com', {
        heartbeat: {
          message: messageSpy,
          scheduler: intervalScheduler(500),
          pongTimeout: 1000,
        },
      }))
      expect(result.current.status).toBe('CONNECTING')
      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(messageSpy).toHaveBeenCalledTimes(1)
      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })
      expect(result.current.status).toBe('CLOSED')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500)
      })
      expect(messageSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('autoReconnect', () => {
    const AUTO_RECONNECT_DELAY = 1000

    it('should reconnect if autoReconnect is true', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: true,
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })
      expect(result.current.status).toBe('CLOSED')
      await act(() => {
        vi.advanceTimersByTime(AUTO_RECONNECT_DELAY)
      })

      expect(result.current.status).toBe('CONNECTING')
    })

    it('should not reconnect if autoReconnect is false', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: false,
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })
      expect(result.current.status).toBe('CLOSED')
      await act(() => {
        vi.advanceTimersByTime(AUTO_RECONNECT_DELAY)
      })

      expect(result.current.status).toBe('CLOSED')
    })

    it('should call onFailed if autoReconnect is not false', async () => {
      const onFailed = vi.fn()
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: {
          retries: () => false,
          onFailed,
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })

      expect(onFailed).toHaveBeenCalled()
      expect(result.current.status).toBe('CLOSED')
    })

    it('should reconnect if autoReconnect.retries is number', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: {
          retries: 2,
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })
      expect(result.current.status).toBe('CLOSED')
      await act(() => {
        vi.advanceTimersByTime(AUTO_RECONNECT_DELAY)
      })

      expect(result.current.status).toBe('CONNECTING')
    })

    it('should reconnect if autoReconnect.retries is function', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: {
          retries: retried => retried < 1,
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })

      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })
      expect(result.current.status).toBe('CLOSED')
      await act(() => {
        vi.advanceTimersByTime(AUTO_RECONNECT_DELAY)
      })

      expect(result.current.status).toBe('CONNECTING')
    })

    it('should not update status from stale websocket on open', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        immediate: true,
      }))

      const oldWs = result.current.ws

      await act(() => {
        result.current.open()
      })

      expect(result.current.ws).not.toBe(oldWs)
      expect(result.current.status).toBe('CONNECTING')

      // Simulate stale websocket opening after new connection was created
      await act(() => {
        oldWs?.onopen?.(new Event('open'))
      })

      expect(result.current.status).toBe('CONNECTING')

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')
    })

    it('should not update status from stale websocket on close', async () => {
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        immediate: true,
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')

      const oldWs = result.current.ws

      await act(() => {
        result.current.open()
      })

      expect(result.current.ws).not.toBe(oldWs)
      expect(result.current.status).toBe('CONNECTING')

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      expect(result.current.status).toBe('OPEN')

      // Simulate stale websocket closing after new connection is open
      await act(() => {
        oldWs?.onclose?.(new CloseEvent('close'))
      })

      expect(result.current.status).toBe('OPEN')
    })

    it('should support delay as a number', async () => {
      const DELAY_TIME = 2500

      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: {
          retries: 2,
          delay: DELAY_TIME,
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })

      expect(result.current.status).toBe('CLOSED')

      await act(() => {
        vi.advanceTimersByTime(DELAY_TIME)
      })
      expect(result.current.status).toBe('CONNECTING')
    })

    it('should support delay as a function', async () => {
      const delayFn = vi.fn((retries: number) => retries * 1000)
      const { result, act } = await renderHook(() => useWebSocket('ws://localhost', {
        autoReconnect: {
          retries: 2,
          delay: delayFn,
        },
      }))

      await act(() => {
        result.current.ws?.onopen?.(new Event('open'))
      })
      await act(() => {
        result.current.ws?.onclose?.(new CloseEvent('close'))
      })

      expect(delayFn).toHaveBeenCalledWith(1)
      expect(result.current.status).toBe('CLOSED')

      const returnedDelay = delayFn.mock.results[0].value
      await act(() => {
        vi.advanceTimersByTime(returnedDelay)
      })
      expect(result.current.status).toBe('CONNECTING')
    })
  })
})
