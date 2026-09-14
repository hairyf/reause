import type { ConfigurableWindow } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEventListener } from '../useEventListener'
import { useRafFn } from '../useRafFn'
import { useSupported } from '../useSupported'

/**
 * Options for `useGamepad`.
 *
 * The `navigator` option is inlined (not composed from a shared `ConfigurableNavigator`) because
 * other core hooks export a same-named type — `export *` in `index.ts` would collide (TS2308), so
 * like `useWakeLock` this module declares the member directly.
 */
export interface UseGamepadOptions extends ConfigurableWindow {
  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof navigator !== 'undefined' ? navigator : undefined
   */
  navigator?: Navigator
}

/**
 * Reactive companion members of `useGamepad` — the React replacement for the upstream event hooks,
 * `Pausable` controls and `isSupported` ref.
 */
export interface UseGamepadControls {
  /**
   * `true` when the resolved navigator exposes `getGamepads`. Resolved in a mount effect, so it
   * stays `false` during the first render and on the server (SSR-safe).
   */
  isSupported: boolean
  /**
   * Register a callback fired with the `index` of a newly connected gamepad. Returns an `off`
   * handle to unsubscribe — compatible with the `useListener` protocol.
   */
  onConnected: (fn: (index: number) => void) => { off: () => void }
  /**
   * Register a callback fired with the `index` of a disconnected gamepad. Returns an `off` handle
   * to unsubscribe — compatible with the `useListener` protocol.
   */
  onDisconnected: (fn: (index: number) => void) => { off: () => void }
  /**
   * Pause the `requestAnimationFrame` poller — the `gamepads` snapshot stops updating.
   */
  pause: () => void
  /**
   * Resume the `requestAnimationFrame` poller.
   */
  resume: () => void
  /**
   * `true` while the `requestAnimationFrame` poller is running (upstream `useRafFn`'s `isActive`
   * shallow ref as a plain boolean). It starts `false` and flips to `true` the first time a gamepad
   * connects.
   */
  isActive: boolean
}

/**
 * The Xbox 360 controller button/axis layout produced by `mapGamepadToXbox360Controller` from a
 * standard-mapping gamepad.
 */
export interface Xbox360Controller {
  buttons: {
    a: GamepadButton
    b: GamepadButton
    x: GamepadButton
    y: GamepadButton
  }
  bumper: {
    left: GamepadButton
    right: GamepadButton
  }
  triggers: {
    left: GamepadButton
    right: GamepadButton
  }
  stick: {
    left: {
      horizontal: number
      vertical: number
      button: GamepadButton
    }
    right: {
      horizontal: number
      vertical: number
      button: GamepadButton
    }
  }
  dpad: {
    up: GamepadButton
    down: GamepadButton
    left: GamepadButton
    right: GamepadButton
  }
  back: GamepadButton
  start: GamepadButton
}

/**
 * Map from @vueuse/core `mapGamepadToXbox360Controller`
 * (`source/vueuse/packages/core/useGamepad/`).
 */
export function mapGamepadToXbox360Controller(gamepad: Gamepad | undefined): Xbox360Controller | null {
  if (!gamepad)
    return null

  return {
    buttons: {
      a: gamepad.buttons[0],
      b: gamepad.buttons[1],
      x: gamepad.buttons[2],
      y: gamepad.buttons[3],
    },
    bumper: {
      left: gamepad.buttons[4],
      right: gamepad.buttons[5],
    },
    triggers: {
      left: gamepad.buttons[6],
      right: gamepad.buttons[7],
    },
    stick: {
      left: {
        horizontal: gamepad.axes[0],
        vertical: gamepad.axes[1],
        button: gamepad.buttons[10],
      },
      right: {
        horizontal: gamepad.axes[2],
        vertical: gamepad.axes[3],
        button: gamepad.buttons[11],
      },
    },
    dpad: {
      up: gamepad.buttons[12],
      down: gamepad.buttons[13],
      left: gamepad.buttons[14],
      right: gamepad.buttons[15],
    },
    back: gamepad.buttons[8],
    start: gamepad.buttons[9],
  }
}

/**
 * React return type: `[gamepads, setGamepads, controls]` — the state-like tuple family used by
 * `useStateWithControl` and `useStorage`. `gamepads` is the plain `Gamepad[]` snapshot and
 * `setGamepads` is the React setter for it.
 */
export type UseGamepadReturn = readonly [
  gamepads: Gamepad[],
  setGamepads: Dispatch<SetStateAction<Gamepad[]>>,
  controls: UseGamepadControls,
]

/**
 * Normalize a raw `Gamepad` into a stable snapshot: arrays/buttons are copied so later browser
 * mutations of the same gamepad object don't leak into the stored state, and the haptic actuators
 * are collected.
 */
function stateFromGamepad(gamepad: Gamepad): Gamepad {
  const hapticActuators: GamepadHapticActuator[] = []
  const vibrationActuator = 'vibrationActuator' in gamepad ? (gamepad as Gamepad).vibrationActuator : null

  if (vibrationActuator)
    hapticActuators.push(vibrationActuator)

  // @ts-expect-error missing in types
  if (gamepad.hapticActuators)
    // @ts-expect-error missing in types
    hapticActuators.push(...gamepad.hapticActuators)

  return {
    id: gamepad.id,
    index: gamepad.index,
    connected: gamepad.connected,
    mapping: gamepad.mapping,
    timestamp: gamepad.timestamp,
    vibrationActuator: gamepad.vibrationActuator,
    hapticActuators,
    axes: gamepad.axes.map(axes => axes),
    buttons: gamepad.buttons.map(button => ({ pressed: button.pressed, touched: button.touched, value: button.value })),
  } as Gamepad
}

/**
 * Map from @vueuse/core `useGamepad`
 * (`source/vueuse/packages/core/useGamepad/`).
 *
 * @example
 * const [gamepads, setGamepads, { isSupported, onConnected, pause, resume }] = useGamepad()
 * const gamepad = gamepads.find(g => g.mapping === 'standard')
 *
 * useListener(onConnected, (index) => console.log(`${gamepad.id} connected`))
 */
export function useGamepad(options: UseGamepadOptions = {}): UseGamepadReturn {
  const {
    navigator: customNavigator,
  } = options

  const [gamepads, setGamepadsState] = useState<Gamepad[]>([])

  // latest-value refs so the stable rAF callback and event handlers always
  // read the freshest state / navigator without re-subscribing
  const gamepadsRef = useRef<Gamepad[]>([])
  gamepadsRef.current = gamepads

  const navigatorRef = useRef<Navigator | undefined>(undefined)
  navigatorRef.current = customNavigator ?? (typeof navigator === 'undefined' ? undefined : navigator)

  const isSupported = useSupported(() => navigatorRef.current && 'getGamepads' in navigatorRef.current)

  // React state setter exposed as the tuple's second slot. Wrapped so the
  // latest-value ref stays in sync synchronously — the rAF poller and the
  // event handlers read `gamepadsRef.current` and would otherwise keep
  // building on the stale committed list until the next render.
  const setGamepads = useCallback<Dispatch<SetStateAction<Gamepad[]>>>((action) => {
    const prev = gamepadsRef.current
    const next = typeof action === 'function' ? (action as (value: Gamepad[]) => Gamepad[])(prev) : action
    gamepadsRef.current = next
    setGamepadsState(next)
  }, [])

  // Event hooks: upstream `createEventHook()` — one stable subscribe
  // function per event, returning an `off` handle to unsubscribe.
  const onConnectedFns = useRef(new Set<(index: number) => void>())
  const onDisconnectedFns = useRef(new Set<(index: number) => void>())

  const onConnected = useCallback((fn: (index: number) => void) => {
    onConnectedFns.current.add(fn)
    return {
      off: () => {
        onConnectedFns.current.delete(fn)
      },
    }
  }, [])

  const onDisconnected = useCallback((fn: (index: number) => void) => {
    onDisconnectedFns.current.add(fn)
    return {
      off: () => {
        onDisconnectedFns.current.delete(fn)
      },
    }
  }, [])

  const triggerConnected = useCallback((index: number) => {
    onConnectedFns.current.forEach(fn => fn(index))
  }, [])

  const triggerDisconnected = useCallback((index: number) => {
    onDisconnectedFns.current.forEach(fn => fn(index))
  }, [])

  // rAF poller: refresh the snapshot of already-tracked gamepads every frame
  // (upstream `updateGamepadState`); starts paused and is resumed on connect.
  const updateGamepadState = useCallback(() => {
    const _gamepads = navigatorRef.current?.getGamepads() || []

    for (const gamepad of _gamepads) {
      if (!gamepad)
        continue

      const index = gamepadsRef.current.findIndex(x => x.index === gamepad.index)
      if (index > -1) {
        const next = [...gamepadsRef.current]
        next[index] = stateFromGamepad(gamepad)
        setGamepads(next)
      }
    }
  }, [setGamepads])

  const { isActive, pause, resume } = useRafFn(updateGamepadState, { immediate: false })

  const onGamepadConnected = useCallback((gamepad: Gamepad) => {
    if (!gamepadsRef.current.some(({ index }) => index === gamepad.index)) {
      const next = [...gamepadsRef.current, stateFromGamepad(gamepad)]
      setGamepads(next)
      triggerConnected(gamepad.index)
    }

    resume()
  }, [resume, setGamepads, triggerConnected])

  const onGamepadDisconnected = useCallback((gamepad: Gamepad) => {
    const next = gamepadsRef.current.filter(x => x.index !== gamepad.index)
    setGamepads(next)
    triggerDisconnected(gamepad.index)
  }, [setGamepads, triggerDisconnected])

  const onGamepadConnectedRef = useRef(onGamepadConnected)
  onGamepadConnectedRef.current = onGamepadConnected
  const onGamepadDisconnectedRef = useRef(onGamepadDisconnected)
  onGamepadDisconnectedRef.current = onGamepadDisconnected

  useEventListener('gamepadconnected', (e: GamepadEvent) => onGamepadConnectedRef.current(e.gamepad), { passive: true })
  useEventListener('gamepaddisconnected', (e: GamepadEvent) => onGamepadDisconnectedRef.current(e.gamepad), { passive: true })

  // initial poll for already-connected gamepads (upstream: `tryOnMounted`)
  useEffect(() => {
    const _gamepads = navigatorRef.current?.getGamepads() || []

    for (const gamepad of _gamepads) {
      if (gamepad && gamepadsRef.current[gamepad.index])
        onGamepadConnectedRef.current(gamepad)
    }
  }, [])

  // Unmount cleanup of the event subscriptions (upstream:
  // `tryOnScopeDispose` inside createEventHook's `on`).
  useEffect(() => {
    return () => {
      onConnectedFns.current.clear()
      onDisconnectedFns.current.clear()
    }
  }, [])

  // stable controls object — new identity only when its members change
  const controls = useMemo(
    () => ({ isSupported, onConnected, onDisconnected, pause, resume, isActive }),
    [isSupported, onConnected, onDisconnected, pause, resume, isActive],
  )

  return [gamepads, setGamepads, controls]
}
