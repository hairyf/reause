import type { IpcRenderer } from 'electron'
import type { IpcRendererListener } from '../_types'
import { useEffect } from 'react'
import { resolveIpcRenderer } from '../_resolve'

/**
 * Listens to channel, when a new message arrives listener would be called with `listener(event,
 * args...)`.
 * [`ipcRenderer.removeListener`](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener)
 * automatically on unmounted.
 *
 * You need to provide `ipcRenderer` to this function.
 *
 * Map from @vueuse/electron `useIpcRendererOn`
 * (`source/vueuse/packages/electron/useIpcRendererOn/`).
 *
 * React deviations:
 * - upstream registers the listener at setup and removes it in
 *   `tryOnScopeDispose`; here a mount effect registers the **actual**
 *   `listener` you passed (no wrapper) and removes it by the same identity on
 *   unmount, so `removeListener(channel, listener)` always matches;
 * - because `listener` is an effect dependency, a new listener identity
 *   re-registers (remove + add). Stabilise it with `useCallback`, or use the
 *   `useListener` protocol where it fits;
 * - the instance is resolved at render, so a missing `ipcRenderer` throws
 *   synchronously instead of at effect time.
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener
 * @see https://vueuse.org/useIpcRendererOn
 *
 * @example
 * useIpcRendererOn('custom-event', (event, ...args) => {
 *   console.log(args)
 * })
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useIpcRendererOn(ipcRenderer: IpcRenderer, channel: string, listener: IpcRendererListener): IpcRenderer

/**
 * Listens to channel, when a new message arrives listener would be called with `listener(event,
 * args...)`.
 * [`ipcRenderer.removeListener`](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener)
 * automatically on unmounted.
 *
 * `ipcRenderer` will be automatically gotten (`window.require('electron')`, i.e.
 * `nodeIntegration`).
 *
 * Map from @vueuse/electron `useIpcRendererOn`
 * (`source/vueuse/packages/electron/useIpcRendererOn/`).
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener
 * @see https://vueuse.org/useIpcRendererOn
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useIpcRendererOn(channel: string, listener: IpcRendererListener): IpcRenderer

export function useIpcRendererOn(...args: any[]): IpcRenderer {
  let ipcRenderer: IpcRenderer | undefined
  let channel: string
  let listener: IpcRendererListener

  if (typeof args[0] === 'string') {
    [channel, listener] = args
  }
  else {
    [ipcRenderer, channel, listener] = args
  }

  const resolved = resolveIpcRenderer(ipcRenderer, 'please provide IpcRenderer module or enable nodeIntegration')

  useEffect(() => {
    resolved.on(channel, listener)

    return () => {
      resolved.removeListener(channel, listener)
    }
  }, [resolved, channel, listener])

  return resolved
}
