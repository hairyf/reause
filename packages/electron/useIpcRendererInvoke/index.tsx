import type { IpcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { resolveIpcRenderer } from '../_resolve'

/**
 * Map from @vueuse/electron `useIpcRendererInvoke`
 * (`source/vueuse/packages/electron/useIpcRendererInvoke/`).
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
 * @see https://vueuse.org/useIpcRendererInvoke
 *
 * @example
 * const result = useIpcRendererInvoke<string>('custom-channel', 'some data')
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useIpcRendererInvoke<T>(ipcRenderer: IpcRenderer, channel: string, ...args: any[]): T | null

/**
 * Map from @vueuse/electron `useIpcRendererInvoke`
 * (`source/vueuse/packages/electron/useIpcRendererInvoke/`).
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
 * @see https://vueuse.org/useIpcRendererInvoke
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useIpcRendererInvoke<T>(channel: string, ...args: any[]): T | null

export function useIpcRendererInvoke<T>(...args: any[]): T | null {
  let ipcRenderer: IpcRenderer | undefined
  let channel: string
  let invokeArgs: any[]

  if (typeof args[0] === 'string') {
    [channel, ...invokeArgs] = args
  }
  else {
    [ipcRenderer, channel, ...invokeArgs] = args
  }

  const resolved = resolveIpcRenderer(ipcRenderer, 'please provide IpcRenderer module or enable nodeIntegration')

  const [result, setResult] = useState<T | null>(null)

  // dependency array as a variable: `[...invokeArgs]` inline would make the
  // deps length vary per render without a statically checkable literal
  const effectDeps = [resolved, channel, ...invokeArgs]

  useEffect(() => {
    let cancelled = false

    resolved.invoke(channel, ...invokeArgs).then((response) => {
      if (!cancelled)
        setResult(response as T)
    })

    return () => {
      cancelled = true
    }
  }, effectDeps)

  return result
}
