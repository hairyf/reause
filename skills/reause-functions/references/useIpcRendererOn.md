---
category: '@Electron'
---

# useIpcRendererOn

Use [ipcRenderer.on](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener) with ease and [ipcRenderer.removeListener](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener) automatically on unmounted.

## Usage

```tsx
import { useIpcRendererOn } from '@reause/electron'

// enable nodeIntegration if you don't provide ipcRenderer explicitly
// see: https://www.electronjs.org/docs/api/webview-tag#nodeintegration
// remove listener automatically on unmounted
useIpcRendererOn('custom-event', (event, ...args) => {
  console.log(args)
})
```

## Type Declarations

```ts
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
export declare function useIpcRendererOn(
  ipcRenderer: IpcRenderer,
  channel: string,
  listener: IpcRendererListener,
): IpcRenderer
/**
 * Map from @vueuse/electron `useIpcRendererOn`
 * (`source/vueuse/packages/electron/useIpcRendererOn/`).
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener
 * @see https://vueuse.org/useIpcRendererOn
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function useIpcRendererOn(
  channel: string,
  listener: IpcRendererListener,
): IpcRenderer
```
