import { useEffect, useRef, useState } from 'react'

/**
 * Cubic bezier points
 */
export type CubicBezierPoints = [number, number, number, number]

/**
 * Easing function
 */
export type EasingFunction = (n: number) => number

/**
 * Transition options
 */
export interface UseTransitionOptions {
  /**
   * Manually abort the running transition — checked on every frame, aborting stops the loop without
   * snapping to the target and fires `onFinished`.
   */
  abort?: () => boolean

  /**
   * Milliseconds to wait before starting the transition. A new source change while waiting cancels
   * the pending one.
   *
   * @default 0
   */
  delay?: number

  /**
   * Disables the transition — the output follows the source synchronously, and any running
   * transition is dropped.
   *
   * @default false
   */
  disabled?: boolean

  /**
   * Transition duration in milliseconds.
   *
   * @default 1000
   */
  duration?: number

  /**
   * Easing function or cubic bezier points to calculate transition progress.
   *
   * @default linear
   */
  easing?: EasingFunction | CubicBezierPoints

  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window

  /**
   * Callback to execute after the transition finishes.
   */
  onFinished?: () => void

  /**
   * Callback to execute after the transition starts.
   */
  onStarted?: () => void
}

const _TransitionPresets = {
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  easeInQuad: [0.11, 0, 0.5, 0],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInCirc: [0.55, 0, 1, 0.45],
  easeOutCirc: [0, 0.55, 0.45, 1],
  easeInOutCirc: [0.85, 0, 0.15, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6],
} as const

const linear: EasingFunction = n => n

/**
 * Common transitions
 *
 * @see https://easings.net
 */
export const TransitionPresets = /* #__PURE__ */ Object.assign({}, { linear }, _TransitionPresets) as Record<keyof typeof _TransitionPresets, CubicBezierPoints> & { linear: EasingFunction }

/**
 * Create an easing function from cubic bezier points.
 */
function createEasingFunction([p1x, p1y, p2x, p2y]: CubicBezierPoints): EasingFunction {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1
  const c = (a1: number) => 3 * a1

  const calcBezier = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t

  const getSlope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)

  const getTforX = (x: number) => {
    let t = x

    for (let i = 0; i < 4; ++i) {
      const currentSlope = getSlope(t, p1x, p2x)
      if (currentSlope === 0)
        return t
      const currentX = calcBezier(t, p1x, p2x) - x
      t -= currentX / currentSlope
    }

    return t
  }

  return (x: number) => (p1x === p1y && p2x === p2y) ? x : calcBezier(getTforX(x), p1y, p2y)
}

function lerp(from: number, to: number, alpha: number) {
  return from + alpha * (to - from)
}

function resolveEasing(easing: EasingFunction | CubicBezierPoints | undefined): EasingFunction {
  if (typeof easing === 'function')
    return easing
  return easing ? createEasingFunction(easing) : linear
}

function readSource(source: number | readonly number[]): number[] {
  return typeof source === 'number' ? [source] : [...source]
}

export function useTransition(source: number, options?: UseTransitionOptions): number

export function useTransition(source: readonly number[], options?: UseTransitionOptions): number[]

/**
 * Map from @vueuse/core `useTransition`
 * (`source/vueuse/packages/core/useTransition/`).
 *
 * @example
 * const [target, setTarget] = useState(0)
 * const output = useTransition(target, { duration: 1000 })
 * setTarget(100) // output tweens 0 → 100 over 1s, re-rendering per frame
 */
export function useTransition(
  source: number | readonly number[],
  options: UseTransitionOptions = {},
): number | number[] {
  // Latest-ref mirrors: a transition captures the source/options that were
  // current when it started (upstream resolves them once per transition too).
  const sourceRef = useRef(source)
  const optionsRef = useRef(options)
  useEffect(() => {
    sourceRef.current = source
    optionsRef.current = options
  })

  const resolved = source
  const isScalar = typeof resolved === 'number'
  const target: readonly number[] = isScalar ? [resolved] : resolved
  const key = target.join(',')
  const disabled = options.disabled === true

  const [values, setValues] = useState<number[]>(() => [...target])
  const currentRef = useRef(values)
  const generationRef = useRef(0)
  // set in a dedicated unmount-only cleanup so a superseded transition can
  // tell unmount apart from a newer source change
  const unmountingRef = useRef(false)

  useEffect(() => {
    return () => {
      unmountingRef.current = true
    }
  }, [])

  useEffect(() => {
    const opts = optionsRef.current
    const to = readSource(sourceRef.current)

    if (disabled) {
      generationRef.current += 1
      currentRef.current = to
      setValues(to)
      return
    }

    const from = currentRef.current
    if (from.length === to.length && from.every((v, i) => v === to[i]))
      return

    const generation = ++generationRef.current

    // a source shape change (array length) cannot be tweened per-number
    if (from.length !== to.length) {
      currentRef.current = to
      setValues(to)
      return
    }

    const win = opts.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    const duration = opts.duration ?? 1000
    const delay = opts.delay ?? 0
    const ease = resolveEasing(opts.easing)

    let rafId = 0
    let timerId: number | undefined
    let started = false
    let finished = false

    const run = () => {
      started = true
      opts.onStarted?.()

      const startedAt = Date.now()
      const endAt = startedAt + duration

      const tick = () => {
        if (generation !== generationRef.current)
          return

        if (opts.abort?.()) {
          finished = true
          opts.onFinished?.()
          return
        }

        const now = Date.now()
        const alpha = ease(Math.min((now - startedAt) / duration, 1))

        const next = from.map((v, i) => lerp(v, to[i], alpha))
        currentRef.current = next
        setValues(next)

        if (now < endAt) {
          rafId = win.requestAnimationFrame(tick)
        }
        else {
          finished = true
          const final = [...to]
          currentRef.current = final
          setValues(final)
          opts.onFinished?.()
        }
      }

      tick()
    }

    if (delay > 0) {
      timerId = win.setTimeout(() => {
        if (generation === generationRef.current)
          run()
      }, delay)
    }
    else {
      run()
    }

    return () => {
      generationRef.current += 1
      // upstream: when a transition is superseded, the aborted `transition`
      // promise resolves and the watcher then calls `onFinished`
      // (useTransition/index.ts:292-297) — fire it here too. A transition
      // superseded during the `delay` never started, so it fires nothing
      // (upstream returns early on `id !== currentId`).
      if (started && !finished && !unmountingRef.current)
        opts.onFinished?.()
      if (rafId)
        win.cancelAnimationFrame(rafId)
      if (timerId !== undefined)
        win.clearTimeout(timerId)
    }
  }, [key, disabled])

  return disabled
    ? (isScalar ? resolved : [...resolved])
    : (isScalar ? values[0] : values)
}
