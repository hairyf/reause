import type { IpcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { resolveIpcRenderer } from '../_resolve'

/**
 * Returns `T | null` — the response from the main process once the asynchronous `invoke` call
 * resolves.
 *
 * Send a message to the main process via channel and expect a result asynchronously.
 *
 * You need to provide `ipcRenderer` to this function.
 *
 * Map from @vueuse/electron `useIpcRendererInvoke`
 * (`source/vueuse/packages/electron/useIpcRendererInvoke/`).
 *
 * React deviations:
 * - upstream returns a `ShallowRef<T | null>`; a React hook cannot return a Vue
 *   ref, so this port returns the plain value `T | null` (same non-tuple
 *   precedent as `useQRCode`'s plain `string`);
 * - the invoke runs in an effect, so changing `channel` / `args` re-invokes
 *   (upstream runs once per setup). The result is unmount-safe: a late
 *   resolution after unmount does not update state;
 * - upstream leaves rejections unhandled and so does this port (no `.catch`).
 *   Callers that need error handling should call `ipcRenderer.invoke` directly,
 *   or use `useIpcRenderer().invoke`, which returns the raw `Promise<T>`.
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
 * Returns `T | null` — the response from the main process once the asynchronous `invoke` call
 * resolves.
 *
 * Send a message to the main process via channel and expect a result asynchronously.
 *
 * `ipcRenderer` will be automatically gotten (`window.require('electron')`, i.e.
 * `nodeIntegration`).
 *
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
