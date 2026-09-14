---
category: Browser
---

# useWebSocket

Reactive [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) client

## Usage

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, send, open, close, ws } = useWebSocket('ws://websocketurl')
```

### Return Values

| Property | Type                                 | Description                          |
| -------- | ------------------------------------ | ------------------------------------ |
| `data`   | `T \| null`                          | Latest received data                 |
| `status` | `'OPEN' \| 'CONNECTING' \| 'CLOSED'` | Connection status                    |
| `ws`     | `WebSocket \| undefined`             | WebSocket instance                   |
| `send`   | `(data, useBuffer?) => boolean`      | Send data (buffers if not connected) |
| `open`   | `() => void`                         | Open/reconnect the connection        |
| `close`  | `(code?, reason?) => void`           | Close the connection                 |

### Callbacks

```tsx
const { data } = useWebSocket('ws://websocketurl', {
  onConnected(ws) {
    console.log('Connected!')
  },
  onDisconnected(ws, event) {
    console.log('Disconnected!', event.code)
  },
  onError(ws, event) {
    console.error('Error:', event)
  },
  onMessage(ws, event) {
    console.log('Message:', event.data)
  },
})
```

### immediate

Enable by default.

Establish the connection immediately when the hook is called.

### autoConnect

Enable by default.

If the URL changes between renders (plain value or React ref), it will automatically reconnect to the new URL.

### autoClose

Enable by default.

This will call `close()` automatically when the `beforeunload` event is triggered or the component unmounts.

### autoReconnect

Reconnect on errors automatically (disabled by default).

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, close } = useWebSocket('ws://websocketurl', {
  autoReconnect: true,
})
```

Or with more controls over its behavior:

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, close } = useWebSocket('ws://websocketurl', {
  autoReconnect: {
    retries: 3,
    delay: 1000,
    onFailed() {
      alert('Failed to connect WebSocket after 3 retries')
    },
  },
})
```

You can also pass a function to `delay` to calculate the delay based on the number of retries. This is useful for implementing exponential backoff:

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, close } = useWebSocket('ws://websocketurl', {
  autoReconnect: {
    retries: 5,
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    delay: retries => Math.min(1000 * 2 ** (retries - 1), 30000),
  },
})
```

Explicitly calling `close()` won't trigger the auto reconnection.

### heartbeat

It's common practice to send a small message (heartbeat) for every given time passed to keep the connection active. In this function we provide a convenient helper to do it:

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, close } = useWebSocket('ws://websocketurl', {
  heartbeat: true,
})
```

Or with more controls:

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, close } = useWebSocket('ws://websocketurl', {
  heartbeat: {
    message: 'ping',
    scheduler: (cb) => {
      // any timer wiring returning `{ pause, resume }` works
      let id = setInterval(cb, 2000)
      return {
        pause: () => clearInterval(id),
        resume: () => { id = setInterval(cb, 2000) },
      }
    },
    pongTimeout: 1000,
  },
})
```

### Sub-protocols

List of one or more subprotocols to use, in this case SOAP and WAMP.

```tsx
import { useWebSocket } from '@reause/core'

const { status, data, send, open, close } = useWebSocket('ws://websocketurl', {
  protocols: ['soap'], // ['soap', 'wamp']
})
```

## Type Declarations

```ts
export type WebSocketStatus = "OPEN" | "CONNECTING" | "CLOSED"
export type WebSocketHeartbeatMessage =
  string | ArrayBuffer | Blob | (() => string | ArrayBuffer | Blob)
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
  heartbeat?:
    | boolean
    | {
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
         * Custom scheduler wiring the heartbeat callback to a timer, returning
         * `pause`/`resume` controls (upstream defaults to `useIntervalFn`).
         */
        scheduler?: (fn: () => void) => {
          pause: () => void
          resume: () => void
        }
      }
  /**
   * Enabled auto reconnect
   *
   * @default false
   */
  autoReconnect?:
    | boolean
    | {
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
   * Latest data received via the websocket; `null` until the first message
   * arrives.
   */
  data: T | null
  /**
   * The current websocket status, can be only one of:
   * 'OPEN', 'CONNECTING', 'CLOSED'
   */
  status: WebSocketStatus
  /**
   * Closes the websocket connection gracefully.
   */
  close: WebSocket["close"]
  /**
   * Reopen the websocket connection.
   * If there the current one is active, will close it before opening a new one.
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
/**
 * React port of VueUse's `useWebSocket`.
 *
 * Map from @vueuse/core `useWebSocket`
 * (`source/vueuse/packages/core/useWebSocket/`), a reactive
 * [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket)
 * client: it wraps the browser `WebSocket` constructor and exposes the current
 * instance, the connection status, the latest received message and `open` /
 * `close` / `send` shortcuts, with optional auto-reconnect, heartbeat pings and
 * URL-driven reconnection.
 *
 * React divergences:
 * - the Vue `ShallowRef` returns become plain state: `data`, `status` and `ws`
 *   are `useState` values, updated when a message arrives or the socket is
 *   (re)created;
 * - the socket is created in a mount `useEffect` instead of during setup
 *   (upstream opens synchronously behind an `if (isClient)` check), so SSR
 *   renders the initial `CLOSED`/`null`/`undefined` values without ever
 *   touching `WebSocket` — SSR-safe;
 * - `open`, `close` and `send` are stable callbacks reading the mounted socket
 *   and status through latest-value refs (upstream: closures over the same
 *   refs), and `close()` runs on unmount when `autoClose` is on (upstream:
 *   `tryOnScopeDispose`), including the `beforeunload` listener;
 * - `url` accepts a plain value or a ref-like `{ current }` object
 *   (upstream: `MaybeRefOrGetter`); when `autoConnect` is on, a URL change between
 *   renders reconnects, mirroring upstream's `watch(urlRef, open)` — the
 *   initial connection is still only opened once by `immediate`;
 * - `heartbeat.message` / `responseMessage` accept a plain value, a ref-like
 *   `{ current }` object or a message factory function, resolved on every
 *   tick via `toValue` (upstream: `MaybeRefOrGetter`); the default scheduler is a
 *   local `setInterval`-based `{ pause, resume }` pair instead of upstream's
 *   `useIntervalFn` default (which is a hook and cannot be created lazily),
 *   and — like upstream's `{ immediate: false }` default — it stays inert
 *   until the socket opens (`ws.onopen` calls `resume`), so no pings (or the
 *   pong-timeout force-close) fire while the socket is still `CONNECTING`;
 *   a custom `scheduler` option returns the same `{ pause, resume }`
 *   controls.
 *
 * @example
 * const { status, data, send, open, close, ws } = useWebSocket('ws://websocketurl')
 *
 * @see https://vueuse.org/core/useWebSocket/
 */
export declare function useWebSocket<Data = any>(
  url: WebSocketUrl,
  options?: UseWebSocketOptions,
): UseWebSocketReturn<Data>
```
