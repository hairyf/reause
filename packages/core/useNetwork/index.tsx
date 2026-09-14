import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

export type NetworkType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown'

export type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | undefined

// `Navigator.connection` / `NetworkInformation` are not part of lib.dom, so we
// vendor a minimal interface here to avoid the dependency (same approach as
// `useScreenOrientation`'s vendored `ScreenOrientation`).
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

type NavigatorWithConnection = Navigator & { connection?: NetworkInformation }

/**
 * Map from @vueuse/core `useNetwork`
 * (`source/vueuse/packages/core/useNetwork/`).
 *
 * @example
 * const { isOnline, offlineAt, onlineAt, downlink, downlinkMax, effectiveType, saveData, rtt, type } = useNetwork()
 */
export function useNetwork(options: UseNetworkOptions = {}): UseNetworkReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineAt, setOfflineAt] = useState<number>()
  const [onlineAt, setOnlineAt] = useState<number>()
  const [downlink, setDownlink] = useState<number>()
  const [downlinkMax, setDownlinkMax] = useState<number>()
  const [effectiveType, setEffectiveType] = useState<NetworkEffectiveType>()
  const [saveData, setSaveData] = useState<boolean | undefined>(false)
  const [rtt, setRtt] = useState<number>()
  const [type, setType] = useState<NetworkType>('unknown')

  useEffect(() => {
    // default substitution only for `undefined` — an explicit `window: null`
    // keeps the hook inert (isSupported stays false, no listeners), matching
    // upstream's `window = defaultWindow` destructure
    const win = options.window === undefined
      ? (typeof window === 'undefined' ? undefined : window)
      : options.window
    if (!win || !win.navigator)
      return

    const nav = win.navigator
    const connection = 'connection' in nav ? (nav as NavigatorWithConnection).connection : undefined
    setIsSupported(Boolean(connection))

    // single writer for the online/offline timestamps, shared by the
    // `change` handler and the window `online`/`offline` events
    const setConnectionTimes = (online: boolean) => {
      setOfflineAt(online ? undefined : Date.now())
      setOnlineAt(online ? Date.now() : undefined)
    }

    const updateNetworkInformation = () => {
      setIsOnline(nav.onLine)
      setConnectionTimes(nav.onLine)

      if (connection) {
        setDownlink(connection.downlink)
        setDownlinkMax(connection.downlinkMax)
        setEffectiveType(connection.effectiveType)
        setSaveData(connection.saveData)
        setRtt(connection.rtt)
        setType(connection.type)
      }
    }

    updateNetworkInformation()

    const goOffline = () => {
      setIsOnline(false)
      setConnectionTimes(false)
    }

    const goOnline = () => {
      setIsOnline(true)
      setConnectionTimes(true)
    }

    win.addEventListener('offline', goOffline, { passive: true })
    win.addEventListener('online', goOnline, { passive: true })
    connection?.addEventListener('change', updateNetworkInformation, { passive: true })

    return () => {
      win.removeEventListener('offline', goOffline)
      win.removeEventListener('online', goOnline)
      connection?.removeEventListener('change', updateNetworkInformation)
    }
  }, [options.window])

  return {
    isSupported,
    isOnline,
    offlineAt,
    onlineAt,
    downlink,
    downlinkMax,
    effectiveType,
    saveData,
    rtt,
    type,
  }
}
