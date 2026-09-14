import type { IpcRenderer, WebFrame } from 'electron'

/**
 * Resolve an `ipcRenderer` instance from the explicit argument or, when `nodeIntegration` is
 * enabled, from `window.require('electron')`.
 *
 * Internal helper (not exported from `index.ts`). Resolution happens at render time — not inside an
 * effect — so a missing instance throws synchronously, exactly like upstream.
 *
 * Each caller passes its own upstream-verbatim error message, because upstream `useIpcRenderer` and
 * the `useIpcRendererInvoke` / `useIpcRendererOn` pair word it differently.
 */
export function resolveIpcRenderer(
  ipcRenderer?: IpcRenderer,
  message = 'provide IpcRenderer module or enable nodeIntegration',
): IpcRenderer {
  if (ipcRenderer)
    return ipcRenderer

  const resolved = typeof window !== 'undefined' && typeof (window as any).require === 'function'
    ? (window as any).require('electron')?.ipcRenderer
    : undefined

  if (!resolved)
    throw new Error(message)

  return resolved
}

/**
 * Resolve a `webFrame` instance from the explicit argument or, when `nodeIntegration` is enabled,
 * from `window.require('electron')`.
 *
 * Internal helper (not exported from `index.ts`), reserved for the zoom hooks (`useZoomFactor` /
 * `useZoomLevel`, #256 / #257).
 */
export function resolveWebFrame(
  webFrame?: WebFrame,
  message = 'provide WebFrame module or enable nodeIntegration',
): WebFrame {
  if (webFrame)
    return webFrame

  const resolved = typeof window !== 'undefined' && typeof (window as any).require === 'function'
    ? (window as any).require('electron')?.webFrame
    : undefined

  if (!resolved)
    throw new Error(message)

  return resolved
}
