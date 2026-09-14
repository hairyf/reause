import { useEffect, useRef, useState } from 'react'

// TypeScript dropped the inline types for these types in 5.2
// We vendor them here to avoid the dependency

export type OrientationType = 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary'
export type OrientationLockType = 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary'

export interface ScreenOrientation extends EventTarget {
  lock: (orientation: OrientationLockType) => Promise<void>
  unlock: () => void
  readonly type: OrientationType
  readonly angle: number
  addEventListener: (type: 'change', listener: (this: this, ev: Event) => any, useCapture?: boolean) => void
}

/**
 * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseScreenOrientationOptions {
  window?: Window
}

export interface UseScreenOrientationReturn {
  /**
   * Whether the Screen Orientation API is available in the current window.
   */
  isSupported: boolean
  /**
   * The current orientation type. `undefined` during SSR and before the mount effect has read
   * `screen.orientation`.
   */
  orientation: OrientationType | undefined
  /**
   * The current orientation angle in degrees, `0` when unknown.
   */
  angle: number
  /**
   * Lock the screen orientation. Returns the underlying promise from `screen.orientation.lock`
   * (rejections propagate unchanged), or rejects with `'Not supported'` when the API is
   * unavailable.
   */
  lockOrientation: (type: OrientationLockType) => Promise<void>
  /**
   * Unlock the screen orientation. No-op when the API is unavailable.
   */
  unlockOrientation: () => void
}

function resolveScreenOrientation(customWindow?: Window): { win: Window, screenOrientation: ScreenOrientation } | undefined {
  const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
  if (!win || !('screen' in win) || !('orientation' in win.screen))
    return undefined

  // cast through `unknown`: lib.dom dropped `lock`/`unlock` from
  // `ScreenOrientation` (see the vendored types above), so a direct cast
  // does not sufficiently overlap
  return { win, screenOrientation: win.screen.orientation as unknown as ScreenOrientation }
}

/**
 * Map from @vueuse/core `useScreenOrientation`
 * (`source/vueuse/packages/core/useScreenOrientation/`). Reactive Screen
 * Orientation API — the current orientation type and angle, plus lock/unlock controls.
 *
 * React divergences:
 * - the Vue `orientation`/`angle` shallowRefs become plain state values;
 * - `isSupported` (upstream `useSupported`) starts `false` and is computed in
 *   the mount effect, so nothing touches `screen` during render (SSR-safe);
 * - the initial `screen.orientation` read happens in the same mount effect
 *   (upstream reads it during setup);
 * - the window `orientationchange` listener (upstream `useEventListener`, passive) lives in a
 * self-contained `useEffect`;
 * - `lockOrientation`/`unlockOrientation` use the `screen.orientation` instance captured once by
 * that mount effect, mirroring upstream's setup-time capture (gated on `isSupported`): a later
 * replacement or polyfill of `screen.orientation` is ignored and lock rejects `'Not supported'`.
 *
 * @example
 * const { isSupported, orientation, angle, lockOrientation, unlockOrientation } = useScreenOrientation()
 *
 * lockOrientation('portrait-primary')
 */
export function useScreenOrientation(options: UseScreenOrientationOptions = {}): UseScreenOrientationReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [orientation, setOrientation] = useState<OrientationType>()
  const [angle, setAngle] = useState(0)
  // upstream captures `screen.orientation` once during setup (gated on
  // `isSupported`) and lock/unlock keep using that instance; capture it in the
  // mount effect for SSR safety instead of re-resolving on every call
  const screenOrientationRef = useRef<ScreenOrientation | undefined>(undefined)

  useEffect(() => {
    const resolved = resolveScreenOrientation(options.window)
    if (!resolved) {
      screenOrientationRef.current = undefined
      setIsSupported(false)
      return
    }

    const { win, screenOrientation } = resolved
    screenOrientationRef.current = screenOrientation
    setIsSupported(true)
    setOrientation(screenOrientation.type)
    setAngle(screenOrientation.angle || 0)

    const onOrientationChange = () => {
      setOrientation(screenOrientation.type)
      setAngle(screenOrientation.angle)
    }
    win.addEventListener('orientationchange', onOrientationChange, { passive: true })

    return () => {
      win.removeEventListener('orientationchange', onOrientationChange)
      screenOrientationRef.current = undefined
    }
  }, [options.window])

  const lockOrientation = (type: OrientationLockType) => {
    const screenOrientation = screenOrientationRef.current
    if (screenOrientation && typeof screenOrientation.lock === 'function')
      return screenOrientation.lock(type)

    return Promise.reject(new Error('Not supported'))
  }

  const unlockOrientation = () => {
    const screenOrientation = screenOrientationRef.current
    if (screenOrientation && typeof screenOrientation.unlock === 'function')
      screenOrientation.unlock()
  }

  return {
    isSupported,
    orientation,
    angle,
    lockOrientation,
    unlockOrientation,
  }
}
