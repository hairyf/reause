---
category: Sensors
---

# useNetwork

Reactive [Network status](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API). The Network Information API provides information about the system's connection in terms of general connection type (e.g., 'wifi', 'cellular', etc.). This can be used to select high definition content or low definition content based on the user's connection. The entire API consists of the addition of the NetworkInformation interface and a single property to the Navigator interface: Navigator.connection.

## Usage

```tsx
import { useNetwork } from '@reause/core'

const { isOnline, offlineAt, onlineAt, downlink, downlinkMax, effectiveType, saveData, rtt, type } = useNetwork()

console.log(isOnline)
```

## Type Declarations

```ts
export type NetworkType =
  | "bluetooth"
  | "cellular"
  | "ethernet"
  | "none"
  | "wifi"
  | "wimax"
  | "other"
  | "unknown"
export type NetworkEffectiveType = "slow-2g" | "2g" | "3g" | "4g" | undefined
export interface NetworkInformation extends EventTarget {
  readonly downlink: number
  readonly downlinkMax: number
  readonly effectiveType: NetworkEffectiveType
  readonly rtt: number
  readonly saveData: boolean
  readonly type: NetworkType
}
export interface UseNetworkOptions extends ConfigurableWindow {}
export interface UseNetworkReturn {
  /**
   * Whether the Network Information API is available in the current window.
   */
  isSupported: boolean
  /**
   * If the user is currently connected.
   */
  isOnline: boolean
  /**
   * The time since the user was last connected.
   */
  offlineAt: number | undefined
  /**
   * The time the user was last connected.
   */
  onlineAt: number | undefined
  /**
   * The download speed in Mbps.
   */
  downlink: number | undefined
  /**
   * The max reachable download speed in Mbps.
   */
  downlinkMax: number | undefined
  /**
   * The detected effective speed type.
   */
  effectiveType: NetworkEffectiveType | undefined
  /**
   * If the user activated data saver mode.
   */
  saveData: boolean | undefined
  /**
   * The estimated round-trip time in ms.
   */
  rtt: number | undefined
  /**
   * The detected connection/network type.
   */
  type: NetworkType
}
/**
 * Map from @vueuse/core `useNetwork`
 * (`source/vueuse/packages/core/useNetwork/`).
 *
 * @example
 * const { isOnline, offlineAt, onlineAt, downlink, downlinkMax, effectiveType, saveData, rtt, type } = useNetwork()
 */
export declare function useNetwork(
  options?: UseNetworkOptions,
): UseNetworkReturn
```
