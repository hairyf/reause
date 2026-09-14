import { useCallback, useEffect, useRef, useState } from 'react'

export type EventSourceStatus = 'CONNECTING' | 'OPEN' | 'CLOSED'

export interface UseEventSourceOptions<Data> extends EventSourceInit {
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
    retries?: number | (() => boolean)

    /**
     * Delay for reconnect, in milliseconds
     *
     * @default 1000
     */
    delay?: number

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
   * Automatically connect to the EventSource when URL changes
   *
   * @default true
   */
  autoConnect?: boolean

  /**
   * Custom data serialization
   */
  serializer?: {
    read: (v?: string) => Data
  }
}

export interface UseEventSourceReturn<Events extends string[], Data = any> {
  /**
   * Reference to the latest data received via the EventSource, can be watched to respond to
   * incoming messages
   */
  data: Data | null

  /**
   * The current state of the connection, can be only one of: 'CONNECTING', 'OPEN' 'CLOSED'
   */
  status: EventSourceStatus

  /**
   * The latest named event
   */
  event: Events[number] | null

  /**
   * The current error
   */
  error: Event | null

  /**
   * Closes the EventSource connection gracefully.
   */
  close: () => void

  /**
   * Reopen the EventSource connection. If there the current one is active, will close it before
   * opening a new one.
   */
  open: () => void

  /**
   * Reference to the current EventSource instance.
   */
  eventSource: EventSource | null

  /**
   * The last event ID string, for server-sent events.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/lastEventId
   */
  lastEventId: string | null
}

function resolveNestedOptions<T>(options: T | true): T {
  if (options === true)
    return {} as T
  return options
}

const DEFAULT_EVENT = 'message'

/**
 * Reactive wrapper for EventSource.
 *
 * Map from @vueuse/core `useEventSource`
 * (`source/vueuse/packages/core/useEventSource/`), a reactive wrapper around
 * the browser
 * [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource)
 * (Server-Sent Events) client: it opens a persistent connection to an HTTP server, exposes the
 * current instance, the connection status, the latest received data / named event / last event ID,
 * and `open` / `close` shortcuts, with optional auto-reconnect and custom data serialization.
 *
 * React divergences:
 * - the EventSource is created in a mount `useEffect` instead of during setup
 *   (upstream opens synchronously behind an `if (isClient)` check), so SSR
 *   renders the initial `CONNECTING`/`null` values without ever touching
 *   `EventSource` — SSR-safe;
 * - `open`, `close` are stable callbacks reading the mounted EventSource through a latest-value
 * ref, and `close()` runs on unmount;
 * - `url` is a read-only value source and takes a plain `string | URL | undefined`; when
 * `autoConnect` is on, a URL change between renders reconnects, mirroring upstream's `watch(urlRef,
 * open)` — the initial connection is still only opened once by `immediate`;
 * - the per-event message listeners are registered with the raw `addEventListener` inside the
 * connection effect and are cleaned up together with the EventSource on close/unmount.
 *
 * @example
 * const { status, data, error, close } = useEventSource('https://event-source-url')
 *
 * @see https://vueuse.org/core/useEventSource/
 */
export function useEventSource<Events extends string[], Data = any>(
  url: string | URL | undefined,
  events: Events = [] as unknown as Events,
  options: UseEventSourceOptions<Data> = {},
): UseEventSourceReturn<Events, Data> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)

  const [event, setEvent] = useState<Events[number] | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [status, setStatus] = useState<EventSourceStatus>('CONNECTING')
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [error, setError] = useState<Event | null>(null)
  const [lastEventId, setLastEventId] = useState<string | null>(null)

  // latest values read by the stable callbacks below (upstream: same refs)
  const eventSourceRef = useRef<EventSource | null>(null)
  const resolvedUrl = url
  const urlRef = useRef<string | URL | undefined>(resolvedUrl)
  urlRef.current = resolvedUrl
  const eventsRef = useRef<Events>(events)
  eventsRef.current = events

  const explicitlyClosedRef = useRef(false)
  const retriedRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = useCallback(() => {
    if (typeof window === 'undefined' || !eventSourceRef.current)
      return

    if (retryTimeoutRef.current != null) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = undefined
    }
    eventSourceRef.current.close()
    eventSourceRef.current = null
    setEventSource(null)
    setStatus('CLOSED')
    explicitlyClosedRef.current = true
  }, [])

  const _init = useCallback(() => {
    if (explicitlyClosedRef.current || urlRef.current === undefined)
      return

    const {
      withCredentials = false,
      serializer = {
        read: (v?: string) => v as Data,
      },
    } = optionsRef.current

    const es = new EventSource(urlRef.current, { withCredentials })
    eventSourceRef.current = es
    setEventSource(es)
    setStatus('CONNECTING')

    es.onopen = () => {
      if (eventSourceRef.current !== es)
        return

      setStatus('OPEN')
      setError(null)
    }

    es.onerror = (e) => {
      if (eventSourceRef.current !== es)
        return

      setStatus('CLOSED')
      setError(e)

      // only reconnect if EventSource isn't reconnecting by itself
      // this is the case when the connection is closed (readyState is 2)
      if (es.readyState === 2 && !explicitlyClosedRef.current && optionsRef.current.autoReconnect) {
        es.close()
        const {
          retries = -1,
          delay = 1000,
          onFailed,
        } = resolveNestedOptions(optionsRef.current.autoReconnect)
        retriedRef.current += 1

        if (typeof retries === 'number' && (retries < 0 || retriedRef.current < retries))
          retryTimeoutRef.current = setTimeout(_init, delay)
        else if (typeof retries === 'function' && retries())
          retryTimeoutRef.current = setTimeout(_init, delay)
        else
          onFailed?.()
      }
    }

    const names = eventsRef.current.length > 0 ? eventsRef.current : ([DEFAULT_EVENT] as unknown as Events)
    for (const event_name of names) {
      es.addEventListener(event_name, (e: Event & { data?: string, lastEventId?: string }) => {
        if (eventSourceRef.current !== es)
          return

        setEvent(event_name)
        setData(serializer.read(e.data) ?? null)
        setLastEventId(e.lastEventId ?? null)
      }, { passive: true })
    }
  }, [])

  const open = useCallback(() => {
    if (typeof window === 'undefined')
      return

    close()
    explicitlyClosedRef.current = false
    retriedRef.current = 0
    _init()
  }, [close, _init])

  // upstream: `if (immediate) open()` plus `tryOnScopeDispose(close)` (→ close
  // on unmount)
  useEffect(() => {
    const { immediate = true } = optionsRef.current

    if (immediate)
      open()

    return () => {
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
    eventSource,
    event,
    data,
    status,
    error,
    open,
    close,
    lastEventId,
  }
}
