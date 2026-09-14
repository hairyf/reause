---
category: '@Electron'
---

# useIpcRendererInvoke

Reactive [ipcRenderer.invoke API](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args) result. Make asynchronous operations look synchronous.

## Usage

```tsx
import { useIpcRendererInvoke } from '@reause/electron'

// enable nodeIntegration if you don't provide ipcRenderer explicitly
// see: https://www.electronjs.org/docs/api/webview-tag#nodeintegration
const result = useIpcRendererInvoke<string>('custom-channel', 'some data')
```

## Type Declarations

```ts
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
export declare function useIpcRendererInvoke<T>(
  ipcRenderer: IpcRenderer,
  channel: string,
  ...args: any[]
): T | null
/**
 * Map from @vueuse/electron `useIpcRendererInvoke`
 * (`source/vueuse/packages/electron/useIpcRendererInvoke/`).
 *
 * @see https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
 * @see https://vueuse.org/useIpcRendererInvoke
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function useIpcRendererInvoke<T>(
  channel: string,
  ...args: any[]
): T | null
```
