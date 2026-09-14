import type { IpcRenderer } from 'electron'
import type { IpcRendererListener } from '../_types'
import { useEffect } from 'react'
import { resolveIpcRenderer } from '../_resolve'

/**
 * Map from @vueuse/electron `useIpcRendererOn`
 * (`source/vueuse/packages/electron/useIpcRendererOn/`).
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
