import { toValue } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export type WebSocketStatus = 'OPEN' | 'CONNECTING' | 'CLOSED'
export type WebSocketHeartbeatMessage = string | ArrayBuffer | Blob | (() => string | ArrayBuffer | Blob)

const DEFAULT_PING_MESSAGE = 'ping'
const DEFAULT_HEARTBEAT_INTERVAL = 1000
const DEFAULT_PONG_TIMEOUT = 1000

export interface UseWebSocketOptions {
  onConnected?: (ws: WebSocket) => void
  onDisconnected?: (ws: WebSocket, event: CloseEvent) => void
  onError?: (ws: WebSocket, event: Event) => void
  onMessage?: (ws: WebSocket, event: MessageEvent) => void

  /**
   * Send heartbeat for every x milliseconds passed
   *
   * @default false
   */
  heartbeat?: boolean | {
    /**
     * Message for the heartbeat
     *
     * @default 'ping'
     */
    message?: WebSocketHeartbeatMessage

    /**
     * Response message for the heartbeat, if undefined the message will be used
     */
    responseMessage?: WebSocketHeartbeatMessage

    /**
     * Heartbeat response timeout, in milliseconds
     *
     * @default 1000
     */
    pongTimeout?: number

    /**
     * Custom scheduler wiring the heartbeat callback to a timer, returning `pause`/`resume`
     * controls (upstream defaults to `useIntervalFn`).
     */
    scheduler?: (fn: () => void) => { pause: () => void, resume: () => void }
  }

  /**
   * Enabled auto reconnect
   *
   * @default false
   */
  autoReconnect?: boolean | {
    /**
     * Maximum retry times.
     *
     * Or you can pass a predicate function (which returns true if you want to retry).
     *
     * @default -1
     */
    retries?: number | ((retried: number) => boolean)

    /**
     * Delay for reconnect, in milliseconds
     *
     * Or you can pass a function to calculate the delay based on the number of retries.
     *
     * @default 1000
     */
    delay?: number | ((retries: number) => number)

    /**
     * On maximum retry times reached.
     */
    onFailed?: () => void
  }

  /**
   * Immediately open the connection when calling this composable
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Automatically connect to the websocket when URL changes
   *
   * @default true
   */
  autoConnect?: boolean

  /**
   * Automatically close a connection
   *
   * @default true
   */
  autoClose?: boolean

  /**
   * List of one or more sub-protocol strings
   *
   * @default []
   */
  protocols?: string[]
}

export interface UseWebSocketReturn<T> {
  /**
   * Latest data received via the websocket; `null` until the first message arrives.
   */
  data: T | null

  /**
   * The current websocket status, can be only one of: 'OPEN', 'CONNECTING', 'CLOSED'
   */
  status: WebSocketStatus

  /**
   * Closes the websocket connection gracefully.
   */
  close: WebSocket['close']

  /**
   * Reopen the websocket connection. If there the current one is active, will close it before
   * opening a new one.
   */
  open: () => void

  /**
   * Sends data through the websocket connection.
   *
   * @param data
   * @param useBuffer when the socket is not yet open, store the data into the buffer and sent them one connected. Default to true.
   */
  send: (data: string | ArrayBuffer | Blob, useBuffer?: boolean) => boolean

  /**
   * The WebSocket instance, `undefined` until the connection effect created it.
   */
  ws: WebSocket | undefined
}

type WebSocketUrl = string | URL | undefined

function resolveNestedOptions<T>(options: T | true): T {
  if (options === true)
    return {} as T
  return options
}

/**
 * Fallback heartbeat scheduler used when the `heartbeat.scheduler` option is not provided — mirrors
 * upstream's default `useIntervalFn(cb, 1000, { immediate: false })`: the interval stays inert
 * until `resume()` is called (on `ws.onopen`), and `pause`/`resume` stop/restart it.
 */
function defaultScheduler(fn: () => void): { pause: () => void, resume: () => void } {
  let timer: ReturnType<typeof setInterval> | undefined

  const start = () => {
    if (timer != null)
      return
    timer = setInterval(fn, DEFAULT_HEARTBEAT_INTERVAL)
  }

  const stop = () => {
    if (timer != null) {
      clearInterval(timer)
      timer = undefined
    }
  }

  return { pause: stop, resume: start }
}

/**
 * Map from @vueuse/core `useWebSocket`
 * (`source/vueuse/packages/core/useWebSocket/`).
 *
 * @example
 * const { status, data, send, open, close, ws } = useWebSocket('ws://websocketurl')
 *
 * @see https://vueuse.org/core/useWebSocket/
 */
export function useWebSocket<Data = any>(
  url: WebSocketUrl,
  options: UseWebSocketOptions = {},
): UseWebSocketReturn<Data> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)

  const [data, setData] = useState<Data | null>(null)
  const [status, setStatus] = useState<WebSocketStatus>('CLOSED')
  const [ws, setWs] = useState<WebSocket | undefined>(undefined)

  // latest values read by the stable callbacks below (upstream: same refs)
  const wsRef = useRef<WebSocket | undefined>(undefined)
  const statusRef = useRef<WebSocketStatus>(status)
  statusRef.current = status
  const resolvedUrl = url
  const urlRef = useRef<WebSocketUrl>(resolvedUrl)
  urlRef.current = resolvedUrl

  const explicitlyClosedRef = useRef(false)
  const retriedRef = useRef(0)
  const bufferedDataRef = useRef<(string | ArrayBuffer | Blob)[]>([])
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pongTimeoutWaitRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const heartbeatPauseRef = useRef<(() => void) | undefined>(undefined)
  const heartbeatResumeRef = useRef<(() => void) | undefined>(undefined)

  const resetRetry = useCallback(() => {
    if (retryTimeoutRef.current != null) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = undefined
    }
  }, [])

  const resetHeartbeat = useCallback(() => {
    clearTimeout(pongTimeoutWaitRef.current)
    pongTimeoutWaitRef.current = undefined
  }, [])

  const _sendBuffer = useCallback(() => {
    if (bufferedDataRef.current.length && wsRef.current && statusRef.current === 'OPEN') {
      for (const buffer of bufferedDataRef.current)
        wsRef.current.send(buffer)
      bufferedDataRef.current = []
    }
  }, [])

  // Status code 1000 -> Normal Closure https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
  const close = useCallback<WebSocket['close']>((code = 1000, reason) => {
    resetRetry()
    if (typeof window === 'undefined' || !wsRef.current)
      return
    explicitlyClosedRef.current = true
    resetHeartbeat()
    heartbeatPauseRef.current?.()
    wsRef.current.close(code, reason)
    wsRef.current = undefined
    setWs(undefined)
    statusRef.current = 'CLOSED'
    setStatus('CLOSED')
  }, [resetRetry, resetHeartbeat])

  const send = useCallback((data: string | ArrayBuffer | Blob, useBuffer = true) => {
    if (!wsRef.current || statusRef.current !== 'OPEN') {
      if (useBuffer)
        bufferedDataRef.current.push(data)
      return false
    }
    _sendBuffer()
    wsRef.current.send(data)
    return true
  }, [_sendBuffer])

  const _init = useCallback(() => {
    if (explicitlyClosedRef.current || urlRef.current === undefined)
      return

    const { protocols = [] } = optionsRef.current
    const socket = new WebSocket(urlRef.current, protocols)
    wsRef.current = socket
    setWs(socket)
    statusRef.current = 'CONNECTING'
    setStatus('CONNECTING')

    socket.onopen = () => {
      if (wsRef.current !== socket)
        return

      statusRef.current = 'OPEN'
      setStatus('OPEN')
      retriedRef.current = 0
      optionsRef.current.onConnected?.(socket)
      heartbeatResumeRef.current?.()
      _sendBuffer()
    }

    socket.onclose = (ev) => {
      if (wsRef.current === socket) {
        statusRef.current = 'CLOSED'
        setStatus('CLOSED')
      }

      resetHeartbeat()
      heartbeatPauseRef.current?.()
      optionsRef.current.onDisconnected?.(socket, ev)

      if (!explicitlyClosedRef.current && optionsRef.current.autoReconnect && (wsRef.current == null || socket === wsRef.current)) {
        const {
          retries = -1,
          delay = 1000,
          onFailed,
        } = resolveNestedOptions(optionsRef.current.autoReconnect)

        const checkRetries = typeof retries === 'function'
          ? retries
          : () => typeof retries === 'number' && (retries < 0 || retriedRef.current < retries)

        if (checkRetries(retriedRef.current)) {
          retriedRef.current += 1
          const delayTime = typeof delay === 'function' ? delay(retriedRef.current) : delay
          retryTimeoutRef.current = setTimeout(_init, delayTime)
        }
        else {
          onFailed?.()
        }
      }
    }

    socket.onerror = (e) => {
      optionsRef.current.onError?.(socket, e)
    }

    socket.onmessage = (e: MessageEvent) => {
      if (wsRef.current !== socket)
        return

      if (optionsRef.current.heartbeat) {
        resetHeartbeat()
        const {
          message = DEFAULT_PING_MESSAGE,
          responseMessage = message,
        } = resolveNestedOptions(optionsRef.current.heartbeat)
        if (e.data === toValue(responseMessage))
          return
      }

      setData(e.data as Data)
      optionsRef.current.onMessage?.(socket, e)
    }
  }, [_sendBuffer, resetHeartbeat])

  const open = useCallback(() => {
    if (typeof window === 'undefined')
      return

    close()
    explicitlyClosedRef.current = false
    retriedRef.current = 0
    _init()
  }, [close, _init])

  // heartbeat — mirrors upstream's one-time scheduler setup; the heartbeat is
  // created even while closed, upstream's `send()` no-ops when not `OPEN`
  useEffect(() => {
    if (!optionsRef.current.heartbeat)
      return

    const {
      message = DEFAULT_PING_MESSAGE,
      scheduler,
      pongTimeout = DEFAULT_PONG_TIMEOUT,
    } = resolveNestedOptions(optionsRef.current.heartbeat)

    const { pause, resume } = (scheduler ?? defaultScheduler)(() => {
      send(toValue(message), false)
      if (pongTimeoutWaitRef.current != null)
        return
      pongTimeoutWaitRef.current = setTimeout(() => {
        // auto-reconnect will be triggered with ws.onclose()
        close()
        explicitlyClosedRef.current = false
      }, pongTimeout)
    })

    heartbeatPauseRef.current = pause
    heartbeatResumeRef.current = resume

    return () => {
      pause()
      clearTimeout(pongTimeoutWaitRef.current)
      pongTimeoutWaitRef.current = undefined
    }
  }, [send, close])

  // upstream: `if (immediate) open()` plus, when `autoClose`, a `beforeunload`
  // listener and `tryOnScopeDispose(close)` (→ close on unmount)
  useEffect(() => {
    const { immediate = true, autoClose = true } = optionsRef.current

    if (immediate)
      open()

    if (!autoClose)
      return

    const onBeforeUnload = () => close()
    window.addEventListener('beforeunload', onBeforeUnload, { passive: true })
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      close()
    }
  }, [open, close])

  // upstream: `watch(urlRef, open)` — reconnect when the resolved URL changes;
  // the initial mount run is skipped (immediate already opened the connection)
  const didMountRef = useRef(false)
  useEffect(() => {
    const { autoConnect = true } = optionsRef.current
    if (!autoConnect)
      return
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    open()
  }, [open, resolvedUrl])

  return {
    data,
    status,
    close,
    send,
    open,
    ws,
  }
}
