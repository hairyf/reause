---
category: Browser
---

# usePermission

Reactive [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) state

## Usage

```tsx
import { usePermission } from '@reause/core'

const microphoneAccess = usePermission('microphone') // 'granted' | 'denied' | 'prompt'
```

## Type Declarations

```ts
type DescriptorNamePolyfill =
  | "accelerometer"
  | "accessibility-events"
  | "ambient-light-sensor"
  | "background-sync"
  | "camera"
  | "clipboard-read"
  | "clipboard-write"
  | "gyroscope"
  | "magnetometer"
  | "microphone"
  | "notifications"
  | "payment-handler"
  | "persistent-storage"
  | "push"
  | "speaker"
  | "local-fonts"
export type GeneralPermissionDescriptor =
  | PermissionDescriptor
  | {
      name: DescriptorNamePolyfill
    }
export interface UsePermissionOptions<Controls extends boolean = false> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Specify a custom `navigator` instance (upstream `ConfigurableNavigator`), e.g. when the
   * Permissions API should be queried against an iframe or a testing environment instead of the
   * global `navigator`. Defaults to the global `navigator`; substitution only happens for
   * `undefined`.
   */
  navigator?: Navigator
}
export type UsePermissionReturn = PermissionState
export interface UsePermissionReturnWithControls {
  state: UsePermissionReturn
  isSupported: boolean
  query: () => Promise<PermissionStatus | undefined>
}
/**
 * Map from @vueuse/core `usePermission`
 * (`source/vueuse/packages/core/usePermission/`).
 *
 * @example
 * const microphoneAccess = usePermission('microphone')
 */
export declare function usePermission(
  permissionDesc:
    GeneralPermissionDescriptor | GeneralPermissionDescriptor["name"],
  options?: UsePermissionOptions<false>,
): UsePermissionReturn
export declare function usePermission(
  permissionDesc:
    GeneralPermissionDescriptor | GeneralPermissionDescriptor["name"],
  options: UsePermissionOptions<true>,
): UsePermissionReturnWithControls
```
