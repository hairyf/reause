import type { IpcRenderer, IpcRendererEvent } from 'electron'
import type { IpcRendererListener } from '../_types'
import { useEffect, useRef } from 'react'
import { resolveIpcRenderer } from '../_resolve'

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
  once: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => IpcRenderer

  /**
   * Removes the specified listener from the listener array for the specified channel.
   *
   * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener
   */
  removeListener: (channel: string, listener: (...args: any[]) => void) => IpcRenderer

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
 * Get the `ipcRenderer` module with all APIs.
 *
 * Map from @vueuse/electron `useIpcRenderer`
 * (`source/vueuse/packages/electron/useIpcRenderer/`).
 *
 * React deviations:
 * - upstream implements `on` by calling the `useIpcRendererOn` composable
 *   inside the method. Hooks cannot be called from callbacks, so `on`
 *   registers directly and tracks `{ ipc, channel, listener }` pairs; a mount
 *   effect's cleanup removes every tracked listener from **its captured
 *   instance** on unmount (the same auto-cleanup guarantee upstream gets from
 *   the effect scope). Like upstream, listeners are not re-registered when the
 *   instance changes — each stays on the instance it was registered with;
 * - upstream `invoke` returns a `ShallowRef<T | null>`; this port returns the
 *   raw `Promise<T>`. Declarative async state is the job of the
 *   `useIpcRendererInvoke` hook — a method on a returned object cannot own
 *   component state;
 * - upstream `sendSync` wraps the synchronous return in a `ShallowRef`; this
 *   port returns the value `T` directly.
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
export function useIpcRenderer(ipcRenderer?: IpcRenderer): UseIpcRendererReturn {
  const resolved = resolveIpcRenderer(ipcRenderer)

  // listeners registered through `on`, removed by the unmount effect's cleanup.
  // Each pair captures the instance it was registered with, so an instance
  // swap never drops or re-registers listeners (upstream scope-dispose
  // semantics): every tracked listener is removed only on unmount, from the
  // instance that actually owns it.
  const trackedRef = useRef<{ ipc: IpcRenderer, channel: string, listener: IpcRendererListener }[]>([])

  useEffect(() => {
    return () => {
      trackedRef.current.forEach(({ ipc, channel, listener }) => {
        ipc.removeListener(channel, listener)
      })
      trackedRef.current = []
    }
  }, [])

  return {
    on: (channel: string, listener: IpcRendererListener) => {
      resolved.on(channel, listener)
      trackedRef.current.push({ ipc: resolved, channel, listener })
      return resolved
    },
    once: resolved.once.bind(resolved),
    removeListener: resolved.removeListener.bind(resolved),
    removeAllListeners: resolved.removeAllListeners.bind(resolved),
    send: resolved.send,
    invoke: <T,>(channel: string, ...args: any[]) => resolved.invoke(channel, ...args) as Promise<T>,
    sendSync: <T,>(channel: string, ...args: any[]) => resolved.sendSync(channel, ...args) as T,
    postMessage: resolved.postMessage,
    sendTo: resolved.sendTo,
    sendToHost: resolved.sendToHost,
  }
}
