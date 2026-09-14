import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { isClient } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useScreenOrientation } from '../useScreenOrientation'

export interface UseParallaxOptions extends ConfigurableWindow {
  /**
   * Adjust the tilt value when the sensor source is `deviceOrientation`.
   */
  deviceOrientationTiltAdjust?: (i: number) => number

  /**
   * Adjust the roll value when the sensor source is `deviceOrientation`.
   */
  deviceOrientationRollAdjust?: (i: number) => number

  /**
   * Adjust the tilt value when the sensor source is `mouse`.
   */
  mouseTiltAdjust?: (i: number) => number

  /**
   * Adjust the roll value when the sensor source is `mouse`.
   */
  mouseRollAdjust?: (i: number) => number
}

export interface UseParallaxReturn {
  /**
   * Roll value. Scaled to `-0.5 ~ 0.5`
   */
  roll: number

  /**
   * Tilt value. Scaled to `-0.5 ~ 0.5`
   */
  tilt: number

  /**
   * Sensor source, can be `mouse` or `deviceOrientation`
   */
  source: 'deviceOrientation' | 'mouse'
}

/**
 * Device orientation data tracked for the parallax effect (upstream `useDeviceOrientation`),
 * flattened into one state object.
 */
interface DeviceOrientationState {
  isSupported: boolean
  alpha: number | null
  beta: number | null
  gamma: number | null
}

/**
 * Cursor position relative to the target element (upstream `useMouseInElement` with `handleOutside:
 * false`), flattened into one state object. Outside the element the last values are kept.
 */
interface MouseInElementState {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Map from @vueuse/core `useParallax`
 * (`source/vueuse/packages/core/useParallax/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   track the cursor over, resolved with the shared `unrefElement`
 * @param options - tilt/roll adjust callbacks per sensor source, plus a
 *   custom `window` instance
 *
 * @example
 * const container = useRef<HTMLDivElement>(null)
 * const { tilt, roll, source } = useParallax(container)
 */
export function useParallax(
  target: RefObject<HTMLElement | null | undefined>,
  options: UseParallaxOptions = {},
): UseParallaxReturn {
  const {
    deviceOrientationTiltAdjust = i => i,
    deviceOrientationRollAdjust = i => i,
    mouseTiltAdjust = i => i,
    mouseRollAdjust = i => i,
    window: customWindow,
  } = options

  const { orientation } = useScreenOrientation({ window: customWindow })

  const [device, setDevice] = useState<DeviceOrientationState>({
    isSupported: false,
    alpha: null,
    beta: null,
    gamma: null,
  })
  const [mouse, setMouse] = useState<MouseInElementState>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  // latest-value refs synced each render so the mount effects always read the
  // newest target without re-subscribing on its identity
  const targetRef = useRef(target)
  targetRef.current = target

  // Latest cursor position in client coordinates (upstream `useMouse` `x`/`y`,
  // refreshed by every `mousemove` and kept between events). `null` until the
  // first mouse event, mirroring upstream's `{ x: 0, y: 0 }` initial values.
  const cursorRef = useRef<{ x: number, y: number } | null>(null)

  // dependency-tracking read: the ref's `.current` populates after the first
  // render, so the effect below re-resolves fresh at bind time and re-binds
  // whenever the resolved element changes
  const trackedTarget = target

  useEffect(() => {
    const win = customWindow ?? (isClient ? window : undefined)
    if (!win)
      return

    if (!('DeviceOrientationEvent' in win)) {
      setDevice(prev => (prev.isSupported ? { ...prev, isSupported: false } : prev))
      return
    }

    setDevice(prev => (prev.isSupported ? prev : { ...prev, isSupported: true }))

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      setDevice(prev => (
        prev.alpha === event.alpha && prev.beta === event.beta && prev.gamma === event.gamma
          ? prev
          : { ...prev, alpha: event.alpha, beta: event.beta, gamma: event.gamma }
      ))
    }
    win.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })

    return () => {
      win.removeEventListener('deviceorientation', onDeviceOrientation)
    }
  }, [customWindow])

  useEffect(() => {
    const win = customWindow ?? (isClient ? window : undefined)
    if (!win)
      return

    const update = (event?: MouseEvent) => {
      // upstream `useMouse` persists the last cursor position, so `scroll` /
      // `resize` re-measure the rect against the cursor instead of falling
      // back to the element origin (which snapped tilt/roll to the corner)
      if (event)
        cursorRef.current = { x: event.clientX, y: event.clientY }

      const el = unrefElement(targetRef.current)
      if (!el || !(el instanceof Element))
        return

      const rects = el.getClientRects()
      if (rects.length === 0)
        return

      const cursor = cursorRef.current

      let width = 0
      let height = 0
      let inside: MouseInElementState | undefined

      for (const rect of rects) {
        width = rect.width
        height = rect.height

        // upstream subtracts the rect's page position from the persisted
        // `useMouse` page coordinates; with the cursor pinned to its viewport
        // position that is algebraically the client-relative difference used
        // here, and it stays correct across scroll/resize
        const elementX = cursor ? cursor.x - rect.left : -(rect.left + win.pageXOffset)
        const elementY = cursor ? cursor.y - rect.top : -(rect.top + win.pageYOffset)

        const isOutside = width === 0 || height === 0
          || elementX < 0 || elementY < 0
          || elementX > width || elementY > height

        if (!isOutside) {
          inside = { x: elementX, y: elementY, width, height }
          break
        }
      }

      if (!inside) {
        // upstream `handleOutside: false`: while the cursor is outside every
        // rect the element position keeps its last value, but the rect size
        // still tracks the element
        setMouse(prev => (
          prev.width === width && prev.height === height ? prev : { ...prev, width, height }
        ))
        return
      }

      const next = inside
      setMouse(prev => (
        prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height
          ? prev
          : next
      ))
    }

    const onMouseMove = (event: MouseEvent) => update(event)
    const onScroll = () => update()
    const onResize = () => update()

    win.addEventListener('mousemove', onMouseMove, { passive: true })
    win.addEventListener('scroll', onScroll, { capture: true, passive: true })
    win.addEventListener('resize', onResize, { passive: true })

    // mirror upstream `tryOnMounted(update)`: measure the element rect once
    update()

    return () => {
      win.removeEventListener('mousemove', onMouseMove)
      win.removeEventListener('scroll', onScroll, { capture: true })
      win.removeEventListener('resize', onResize)
    }
  }, [customWindow, trackedTarget])

  const source: 'deviceOrientation' | 'mouse'
    = device.isSupported
      && ((device.alpha != null && device.alpha !== 0) || (device.gamma != null && device.gamma !== 0))
      ? 'deviceOrientation'
      : 'mouse'

  let roll: number
  let tilt: number

  if (source === 'deviceOrientation') {
    let value: number
    switch (orientation) {
      case 'landscape-primary':
        value = (device.gamma ?? 0) / 90
        break
      case 'landscape-secondary':
        value = -(device.gamma ?? 0) / 90
        break
      case 'portrait-primary':
        value = -(device.beta ?? 0) / 90
        break
      case 'portrait-secondary':
        value = (device.beta ?? 0) / 90
        break
      default:
        value = -(device.beta ?? 0) / 90
    }
    roll = deviceOrientationRollAdjust(value)

    switch (orientation) {
      case 'landscape-primary':
        value = (device.beta ?? 0) / 90
        break
      case 'landscape-secondary':
        value = -(device.beta ?? 0) / 90
        break
      case 'portrait-primary':
        value = (device.gamma ?? 0) / 90
        break
      case 'portrait-secondary':
        value = -(device.gamma ?? 0) / 90
        break
      default:
        value = (device.gamma ?? 0) / 90
    }
    tilt = deviceOrientationTiltAdjust(value)
  }
  else {
    const rollValue = mouse.height === 0 ? 0 : -(mouse.y - mouse.height / 2) / mouse.height
    roll = mouseRollAdjust(rollValue)
    const tiltValue = mouse.width === 0 ? 0 : (mouse.x - mouse.width / 2) / mouse.width
    tilt = mouseTiltAdjust(tiltValue)
  }

  return { roll, tilt, source }
}
