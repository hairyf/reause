---
category: '@Electron'
---

# useIpcRenderer

Provides [ipcRenderer](https://www.electronjs.org/docs/api/ipc-renderer) and all of its APIs.

## Usage

```tsx
import { useIpcRenderer } from '@reause/electron'

// enable nodeIntegration if you don't provide ipcRenderer explicitly
// see: https://www.electronjs.org/docs/api/webview-tag#nodeintegration
const ipcRenderer = useIpcRenderer()

// Promise result (upstream returned a ShallowRef)
const result = await ipcRenderer.invoke<string>('custom-channel', 'some data')

// listeners registered through `on` are removed automatically on unmount
ipcRenderer.on('custom-event', (event, ...args) => {
  console.log(args)
})
```

### Available Methods

| Method                                     | Description                                          |
| ------------------------------------------ | ---------------------------------------------------- |
| `on(channel, listener)`                    | Listen to channel. Auto-removes listener on unmount. |
| `once(channel, listener)`                  | Listen to channel once                               |
| `removeListener(channel, listener)`        | Remove specific listener                             |
| `removeAllListeners(channel)`              | Remove all listeners for channel                     |
| `send(channel, ...args)`                   | Send async message to main process                   |
| `invoke(channel, ...args)`                 | Send message and get the response as `Promise<T>`    |
| `sendSync(channel, ...args)`               | Send sync message and get the response as `T`        |
| `postMessage(channel, message, transfer?)` | Send message with transferable objects               |
| `sendTo(webContentsId, channel, ...args)`  | Send to specific webContents                         |
| `sendToHost(channel, ...args)`             | Send to webview host                                 |

### With Custom IpcRenderer

If `nodeIntegration` is disabled, you can pass the `ipcRenderer` instance explicitly:

```tsx
import { useIpcRenderer } from '@reause/electron'
import { ipcRenderer } from 'electron'

const ipc = useIpcRenderer(ipcRenderer)
```

## Type Declarations

```ts
/**
 * Result from useIpcRenderer
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer
 */
export interface UseIpcRendererReturn {
  /**
   * Listens to channel, when a new message arrives listener would be called with listener(event,
   * args...).
   * [ipcRenderer.removeListener](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener)
   * automatically on unmounted.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener
   */
  on: (channel: string, listener: IpcRendererListener) => IpcRenderer
  /**
   * Adds a one time listener function for the event. This listener is invoked only the next time a
   * message is sent to channel, after which it is removed.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereroncechannel-listener
   */
  once: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void,
  ) => IpcRenderer
  /**
   * Removes the specified listener from the listener array for the specified channel.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener
   */
  removeListener: (
    channel: string,
    listener: (...args: any[]) => void,
  ) => IpcRenderer
  /**
   * Removes all listeners, or those of the specified channel.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovealllistenerschannel
   */
  removeAllListeners: (channel: string) => IpcRenderer
  /**
   * Send an asynchronous message to the main process via channel, along with arguments.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrenderersendchannel-args
   */
  send: (channel: string, ...args: any[]) => void
  /**
   * Returns `Promise<any>` — resolves with the response from the main process. Send a message to
   * the main process via channel and expect a result ~~asynchronously~~.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
   */
  invoke: <T>(channel: string, ...args: any[]) => Promise<T>
  /**
   * Returns `any` — the value sent back by the `ipcMain` handler. Send a message to the main
   * process via channel and expect a result synchronously.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrenderersendsyncchannel-args
   */
  sendSync: <T>(channel: string, ...args: any[]) => T
  /**
   * Send a message to the main process, optionally transferring ownership of zero or more
   * MessagePort objects.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererpostmessagechannel-message-transfer
   */
  postMessage: (channel: string, message: any, transfer?: MessagePort[]) => void
  /**
   * Sends a message to a window with webContentsId via channel.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrenderersendtowebcontentsid-channel-args
   */
  sendTo: (webContentsId: number, channel: string, ...args: any[]) => void
  /**
   * Like `ipcRenderer.send` but the event will be sent to the `<webview>` element in the host page
   * instead of the main process.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrenderersendtohostchannel-args
   */
  sendToHost: (channel: string, ...args: any[]) => void
}
/**
 * Map from @vueuse/electron `useIpcRenderer`
 * (`source/vueuse/packages/electron/useIpcRenderer/`).
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrenderersendtohostchannel-args
 * @see https://vueuse.org/useIpcRenderer
 *
 * @example
 * const ipcRenderer = useIpcRenderer()
 * ipcRenderer.on('custom-event', (event, ...args) => console.log(args))
 * const result = await ipcRenderer.invoke<string>('custom-channel', 'some data')
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function useIpcRenderer(
  ipcRenderer?: IpcRenderer,
): UseIpcRendererReturn
```
