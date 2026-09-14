---
category: Network
---

# useEventSource

An [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) or [Server-Sent-Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) instance opens a persistent connection to an HTTP server, which sends events in text/event-stream format.

## Usage

```tsx
import { useEventSource } from '@reause/core'

const { status, data, error, close } = useEventSource('https://event-source-url')
```

### Source Forms

`url` is a read-only value source and takes a plain `string | URL | undefined` (upstream:
`MaybeRefOrGetter`). Resolve a React ref or state value at the call site:

```tsx
const [url, setUrl] = useState('https://event-source-url')

useEventSource(url) // reconnects when `url` changes (with `autoConnect`)
useEventSource(urlRef.current) // resolve a React ref at the call site
```

### Return Values

| Property      | Type                                 | Description                             |
| ------------- | ------------------------------------ | --------------------------------------- |
| `data`        | `Data \| null`                       | Latest data received                    |
| `status`      | `'CONNECTING' \| 'OPEN' \| 'CLOSED'` | Connection status                       |
| `event`       | `Events[number] \| null`             | Latest named event                      |
| `error`       | `Event \| null`                      | Current error                           |
| `eventSource` | `EventSource \| null`                | EventSource instance (null when closed) |
| `lastEventId` | `string \| null`                     | Last event ID string                    |
| `open`        | `() => void`                         | Open/reopen the connection              |
| `close`       | `() => void`                         | Close the connection                    |

### Named Events

You can define named events with the second parameter:

```tsx
import { useEventSource } from '@reause/core'

const { event, data } = useEventSource(
  'https://event-source-url',
  ['notice', 'update'],
)
```

### immediate

Enable by default.

Establish the connection immediately when the hook is called.

### autoConnect

Enable by default.

If the URL is provided as a React ref object, when the URL changes the hook will automatically reconnect to the new URL.

### Auto Reconnection on Errors

Reconnect on errors automatically (disabled by default).

```tsx
import { useEventSource } from '@reause/core'

const { status, data, close } = useEventSource(
  'https://event-source-url',
  [],
  {
    autoReconnect: true,
  },
)
```

Or with more controls over its behavior:

```tsx
import { useEventSource } from '@reause/core'

const { status, data, close } = useEventSource(
  'https://event-source-url',
  [],
  {
    autoReconnect: {
      retries: 3,
      delay: 1000,
      onFailed() {
        alert('Failed to connect EventSource after 3 retries')
      },
    },
  },
)
```

### Data Serialization

Apply custom transformations to incoming data using a serialization function.

```tsx
import { useEventSource } from '@reause/core'

const { data } = useEventSource(
  'https://event-source-url',
  [],
  {
    serializer: {
      read: rawData => JSON.parse(rawData),
    },
  },
)

// If server sends: '{"name":"John","age":30}'
// data will be: { name: 'John', age: 30 }
```

## Type Declarations

```ts
export type EventSourceStatus = "CONNECTING" | "OPEN" | "CLOSED"
export interface UseEventSourceOptions<Data> extends EventSourceInit {
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
/**
 * Map from @vueuse/core `useEventSource`
 * (`source/vueuse/packages/core/useEventSource/`).
 *
 * @example
 * const { status, data, error, close } = useEventSource('https://event-source-url')
 *
 * @see https://vueuse.org/core/useEventSource/
 */
export declare function useEventSource<Events extends string[], Data = any>(
  url: string | URL | undefined,
  events?: Events,
  options?: UseEventSourceOptions<Data>,
): UseEventSourceReturn<Events, Data>
```
