import type { ConfigurableWindow } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

export interface UseBroadcastChannelOptions extends ConfigurableWindow {
  /**
   * The name of the channel.
   */
  name: string
}

export interface UseBroadcastChannelReturn<D, P> {
  /**
   * Whether the `BroadcastChannel` API is supported by the browser.
   */
  isSupported: boolean

  /**
   * The current `BroadcastChannel` instance; `undefined` before the mount effect creates it (SSR).
   * The instance is retained after `close()` (upstream parity), so `post()` on a closed channel
   * reaches the native API and throws `InvalidStateError`.
   */
  channel: BroadcastChannel | undefined

  /**
   * Latest data received via the channel's `message` event.
   */
  data: D | undefined

  /**
   * Send a message to the channel. Throws the native `InvalidStateError` after the channel was
   * closed.
   */
  post: (data: P) => void

  /**
   * Close the channel and mark `isClosed` as `true`. The instance is kept (upstream parity) so a
   * later `post()` still reaches the closed channel.
   */
  close: () => void

  /**
   * The latest `messageerror` event, or `null` when none occurred.
   */
  error: Event | null

  /**
   * Whether the channel has been closed — `true` after `close()` or a native `close` event.
   */
  isClosed: boolean

  /**
   * Register a callback fired on every `message` event — `useListener` protocol `(fn) => () => void`
   * (the returned off function unsubscribes the callback).
   */
  onMessage: (fn: (event: MessageEvent<D>) => void) => () => void

  /**
   * Register a callback fired on every `messageerror` event — `useListener` protocol `(fn) => () =>
   * void`.
   */
  onMessageError: (fn: (event: MessageEvent) => void) => () => void
}

/**
 * Map from @vueuse/core `useBroadcastChannel`
 * (`source/vueuse/packages/core/useBroadcastChannel/`).
 *
 * @example
 * const { isSupported, channel, data, post, close, error, isClosed, onMessage } = useBroadcastChannel({ name: 'my-channel' })
 *
 * post('Hello, World!')
 * close()
 *
 * @see https://vueuse.org/core/useBroadcastChannel/
 */
export function useBroadcastChannel<D, P>(options: UseBroadcastChannelOptions): UseBroadcastChannelReturn<D, P> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)

  const win = optionsRef.current.window ?? (typeof window === 'undefined' ? undefined : window)
  const isSupported = useSupported(() => win && 'BroadcastChannel' in win)

  const [channel, setChannel] = useState<BroadcastChannel | undefined>(undefined)
  const [data, setData] = useState<D | undefined>(undefined)
  const [error, setError] = useState<Event | null>(null)
  const [isClosed, setIsClosed] = useState(false)

  // latest channel read by the stable `post` / `close` callbacks (upstream:
  // the `channel` ref)
  const channelRef = useRef<BroadcastChannel | undefined>(undefined)

  // `onMessage` / `onMessageError` — `useListener`-style registration
  // functions fired from the native `message` / `messageerror` listeners.
  const messageFns = useRef(new Set<(event: MessageEvent<D>) => void>())
  const messageErrorFns = useRef(new Set<(event: MessageEvent) => void>())

  const onMessage = useCallback((fn: (event: MessageEvent<D>) => void) => {
    messageFns.current.add(fn)
    return () => {
      messageFns.current.delete(fn)
    }
  }, [])

  const onMessageError = useCallback((fn: (event: MessageEvent) => void) => {
    messageErrorFns.current.add(fn)
    return () => {
      messageErrorFns.current.delete(fn)
    }
  }, [])

  // upstream: `if (channel.value) channel.value.postMessage(data)` — `close()`
  // keeps the instance, so posting to a closed channel throws the native
  // `InvalidStateError` instead of being silently ignored
  const post = useCallback((value: P) => {
    channelRef.current?.postMessage(value)
  }, [])

  // upstream: `if (channel.value) channel.value.close(); isClosed.value = true`
  // — the instance is intentionally retained (upstream parity)
  const close = useCallback(() => {
    channelRef.current?.close()
    setIsClosed(true)
  }, [])

  // upstream: `if (isSupported.value)` setup block + `tryOnScopeDispose(close)`
  // (→ close on unmount)
  useEffect(() => {
    if (!isSupported)
      return

    const { name } = optionsRef.current
    const broadcastChannel = new BroadcastChannel(name)
    channelRef.current = broadcastChannel
    setChannel(broadcastChannel)
    setError(null)
    // a fresh channel re-arms `isClosed` (React effects can re-run; upstream
    // sets it once at setup)
    setIsClosed(false)

    const onMessageEvent = (event: MessageEvent) => {
      setData(event.data as D)
      Array.from(messageFns.current).forEach(fn => fn(event as MessageEvent<D>))
    }

    const onMessageErrorEvent = (event: MessageEvent) => {
      setError(event)
      Array.from(messageErrorFns.current).forEach(fn => fn(event))
    }

    const onCloseEvent = () => {
      setIsClosed(true)
    }

    broadcastChannel.addEventListener('message', onMessageEvent, { passive: true })
    broadcastChannel.addEventListener('messageerror', onMessageErrorEvent, { passive: true })
    broadcastChannel.addEventListener('close', onCloseEvent, { passive: true })

    return () => {
      broadcastChannel.removeEventListener('message', onMessageEvent)
      broadcastChannel.removeEventListener('messageerror', onMessageErrorEvent)
      broadcastChannel.removeEventListener('close', onCloseEvent)
      if (channelRef.current === broadcastChannel)
        channelRef.current = undefined
      broadcastChannel.close()
    }
  }, [isSupported])

  return {
    isSupported,
    channel,
    data,
    post,
    close,
    error,
    isClosed,
    onMessage,
    onMessageError,
  }
}
