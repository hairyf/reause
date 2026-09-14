import type { ConfigurableNavigator } from '../useUserMedia'
import { useEffect, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

// Events listened to on the battery manager once acquired, mirroring
// upstream `useEventListener(battery, events, ...)`.
const batteryEvents = ['chargingchange', 'chargingtimechange', 'dischargingtimechange', 'levelchange'] as const

/**
 * Options for `useBattery`.
 */
export interface UseBatteryOptions extends ConfigurableNavigator {
}

/**
 * Return type of `useBattery`.
 */
export interface UseBatteryReturn {
  /**
   * Whether the Battery Status API is supported in the current browser. `false` during render and
   * on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * If the device is currently charging.
   */
  charging: boolean
  /**
   * The number of seconds until the device becomes fully charged.
   */
  chargingTime: number
  /**
   * The number of seconds before the device becomes fully discharged.
   */
  dischargingTime: number
  /**
   * A number between 0 and 1 representing the current charge level.
   */
  level: number
}

/**
 * The `BatteryManager` object handed back by `navigator.getBattery()` — the DOM lib does not ship
 * this interface, so it is declared here as upstream does. The properties are read through getters
 * on the live object.
 */
export interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}

type NavigatorWithBattery = Navigator & {
  getBattery: () => Promise<BatteryManager>
}

/**
 * Reactive Battery Status API.
 *
 * Map from @vueuse/core `useBattery`
 * (`source/vueuse/packages/core/useBattery/`). Reactive
 * [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API):
 * returns an object mirroring the upstream members — `isSupported`, `charging`, `chargingTime`,
 * `dischargingTime`, `level` — as plain values held in `useState`s.
 *
 * React divergences:
 * - `isSupported` comes from `useSupported` (resolves after mount, stays `false` on the server) and
 * gates a mount effect that acquires the battery manager, reads its initial state and registers the
 * four battery event listeners (`chargingchange`, `chargingtimechange`, `dischargingtimechange`,
 * `levelchange`), removed again in cleanup on unmount;
 * - there is no `navigator` access during render, so SSR renders the
 *   defaults without acquiring anything.
 *
 * @see https://vueuse.org/core/useBattery/
 * @param options
 *
 * @example
 * const { isSupported, charging, chargingTime, dischargingTime, level } = useBattery()
 */
export function useBattery(options: UseBatteryOptions = {}): UseBatteryReturn {
  const [charging, setCharging] = useState(false)
  const [chargingTime, setChargingTime] = useState(0)
  const [dischargingTime, setDischargingTime] = useState(0)
  const [level, setLevel] = useState(1)

  const isSupported = useSupported(() => {
    const nav = options.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
    return Boolean(nav && 'getBattery' in nav && typeof (nav as NavigatorWithBattery).getBattery === 'function')
  })

  // Latest-value ref keeping the mount effect stable while always acquiring
  // with the newest `navigator` option (upstream reads it once in setup).
  const navigatorRef = useRef<Navigator | undefined>(options.navigator)
  navigatorRef.current = options.navigator

  // Mirror of upstream's `if (isSupported.value)` setup block: acquire the
  // battery manager, read its initial state and subscribe to its events;
  // cleanup detaches the listeners (upstream `tryOnScopeDispose`).
  useEffect(() => {
    if (!isSupported)
      return
    const nav = navigatorRef.current ?? (typeof navigator === 'undefined' ? undefined : navigator)
    if (!nav)
      return

    let battery: BatteryManager | null = null
    let disposed = false

    const updateBatteryInfo = (info: BatteryManager) => {
      setCharging(info.charging)
      setChargingTime(info.chargingTime || 0)
      setDischargingTime(info.dischargingTime || 0)
      setLevel(info.level)
    }

    const handleBatteryEvent = () => {
      if (battery)
        updateBatteryInfo(battery)
    }

    void (nav as NavigatorWithBattery).getBattery().then((_battery) => {
      if (disposed)
        return
      battery = _battery
      updateBatteryInfo(_battery)
      batteryEvents.forEach(event => _battery.addEventListener(event, handleBatteryEvent, { passive: true }))
    })

    return () => {
      disposed = true
      const manager = battery
      if (manager) {
        batteryEvents.forEach(event => manager.removeEventListener(event, handleBatteryEvent))
      }
    }
  }, [isSupported])

  return {
    isSupported,
    charging,
    chargingTime,
    dischargingTime,
    level,
  }
}
