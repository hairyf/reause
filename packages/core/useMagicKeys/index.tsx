import type { RefObject } from 'react'
import { noop } from '@reause/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Map from @vueuse/core `aliasMap.ts`
 * (`source/vueuse/packages/core/useMagicKeys/aliasMap.ts`).
 */
export const DefaultMagicKeysAliasMap: Readonly<Record<string, string>> = {
  ctrl: 'control',
  command: 'meta',
  cmd: 'meta',
  option: 'alt',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
}

export interface UseMagicKeysOptions<Reactive extends boolean> {
  /**
   * Returns a reactive object instead of an object of refs
   *
   * @default false
   */
  reactive?: Reactive

  /**
   * Target for listening events
   *
   * @default window
   */
  target?: RefObject<EventTarget | null | undefined>

  /**
   * Alias map for keys, all the keys should be lowercase { target: keycode }
   *
   * @example { ctrl: "control" }
   * @default <predefined-map>
   */
  aliasMap?: Record<string, string>

  /**
   * Register passive listener
   *
   * @default true
   */
  passive?: boolean

  /**
   * Custom event handler for keydown/keyup event. Useful when you want to apply custom logic.
   *
   * When using `e.preventDefault()`, you will need to pass `passive: false` to useMagicKeys().
   */
  onEventFired?: (e: KeyboardEvent) => void | boolean
}

export interface MagicKeysInternal {
  /**
   * A Set of currently pressed keys, Stores raw keyCodes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
   */
  current: ReadonlySet<string>
}

/**
 * Return of `useMagicKeys`. Upstream maps `Reactive extends true ? boolean: ComputedRef<boolean>` —
 * a plain boolean in reactive mode, a ref otherwise. React state is always "reactive" (the port has
 * no ref layer), so both branches collapse to plain `boolean`; the conditional is kept to mirror
 * the upstream type shape.
 */
export type UseMagicKeysReturn<Reactive extends boolean>
  = Readonly<
    Record<
      string,
      Reactive extends true ? boolean : boolean
    > & MagicKeysInternal
  >

/**
 * Map from @vueuse/core `useMagicKeys`
 * (`source/vueuse/packages/core/useMagicKeys/`).
 *
 * @example
 * const { shift, space, a } = useMagicKeys()
 *
 * useEffect(() => {
 *   if (space)
 *     console.log('space has been pressed')
 * }, [space])
 *
 * useEffect(() => {
 *   if (shift && a)
 *     console.log('Shift + A have been pressed')
 * }, [shift, a])
 */
export function useMagicKeys<T extends boolean = false>(options: UseMagicKeysOptions<T> = {}): UseMagicKeysReturn<T> {
  const {
    // accepted for API compatibility only — React state is always reactive,
    // so the option has no effect (see the hook JSDoc)
    reactive: _reactive = false,
    target,
    aliasMap = DefaultMagicKeysAliasMap,
    passive = true,
    onEventFired = noop,
  } = options

  // single state object holding every tracked key state (lowercased
  // `e.key` / `e.code`), plus the `current` Set exposed to consumers — both
  // are replaced on every update
  const [keys, setKeys] = useState<Record<string, boolean>>({})
  const [current, setCurrent] = useState<ReadonlySet<string>>(new Set())

  // mutable mirrors read synchronously by the event handlers before React
  // flushes state — keeps the listener identities stable across renders
  const keysRef = useRef<Record<string, boolean>>({})
  const currentRef = useRef<Set<string>>(new Set())
  const usedKeysRef = useRef<Set<string>>(new Set())
  const metaDepsRef = useRef<Set<string>>(new Set())
  const depsMapRef = useRef<Map<string, Set<string>>>(new Map([
    ['Meta', metaDepsRef.current],
    ['Shift', new Set<string>()],
    ['Alt', new Set<string>()],
  ]))

  // latest option values reachable from the stable event handlers below
  const onEventFiredRef = useRef(onEventFired)
  onEventFiredRef.current = onEventFired
  const aliasMapRef = useRef(aliasMap)
  aliasMapRef.current = aliasMap
  const passiveRef = useRef(passive)
  passiveRef.current = passive

  const setRefs = useCallback((key: string, value: boolean) => {
    keysRef.current[key] = value
  }, [])

  const flush = useCallback(() => {
    setKeys({ ...keysRef.current })
    setCurrent(new Set(currentRef.current))
  }, [])

  const reset = useCallback(() => {
    currentRef.current.clear()
    for (const key of usedKeysRef.current)
      setRefs(key, false)
    flush()
  }, [setRefs, flush])

  const updateDeps = useCallback((value: boolean, e: KeyboardEvent, keys: string[]) => {
    if (!value || typeof e.getModifierState !== 'function')
      return
    for (const [modifier, depsSet] of depsMapRef.current) {
      if (e.getModifierState(modifier)) {
        keys.forEach(key => depsSet.add(key))
        break
      }
    }
  }, [])

  const clearDeps = useCallback((value: boolean, key: string) => {
    if (value)
      return
    const depsMapKey = `${key[0]?.toUpperCase() ?? ''}${key.slice(1)}`
    const deps = depsMapRef.current.get(depsMapKey)
    if (!(['shift', 'alt'].includes(key)) || !deps)
      return

    const depsArray = Array.from(deps)
    const depsIndex = depsArray.indexOf(key)
    depsArray.forEach((depsKey, index) => {
      if (index >= depsIndex) {
        currentRef.current.delete(depsKey)
        setRefs(depsKey, false)
      }
    })
    deps.clear()
  }, [setRefs])

  const updateRefs = useCallback((e: KeyboardEvent, value: boolean) => {
    const key = e.key?.toLowerCase()
    const code = e.code?.toLowerCase()
    const values = [code, key].filter((v): v is string => Boolean(v))

    if (!key)
      return

    // current set
    if (value)
      currentRef.current.add(key)
    else
      currentRef.current.delete(key)

    for (const k of values) {
      usedKeysRef.current.add(k)
      setRefs(k, value)
    }

    updateDeps(value, e, [...currentRef.current, ...values])
    clearDeps(value, key)

    // #1312
    // In macOS, keys won't trigger "keyup" event when Meta key is released
    // We track it's combination and release manually
    if (key === 'meta' && !value) {
      // Meta key released
      metaDepsRef.current.forEach((metaDepsKey) => {
        currentRef.current.delete(metaDepsKey)
        setRefs(metaDepsKey, false)
      })
      metaDepsRef.current.clear()
    }

    flush()
  }, [setRefs, updateDeps, clearDeps, flush])

  // resolve the target ref during render so the listeners re-bind whenever the
  // resolved target changes (upstream `useEventListener` watches the target)
  const trackedTarget = target ? unrefElement(target) : undefined

  useEffect(() => {
    const el = trackedTarget ?? (typeof window === 'undefined' ? undefined : window)
    if (!el)
      return

    const listenerOptions = { passive: passiveRef.current }
    const onKeydown: EventListener = (e) => {
      updateRefs(e as KeyboardEvent, true)
      return onEventFiredRef.current(e as KeyboardEvent)
    }
    const onKeyup: EventListener = (e) => {
      updateRefs(e as KeyboardEvent, false)
      return onEventFiredRef.current(e as KeyboardEvent)
    }
    el.addEventListener('keydown', onKeydown, listenerOptions)
    el.addEventListener('keyup', onKeyup, listenerOptions)

    // #1350 — reset the pressed keys on window blur / focus, like upstream
    const win = typeof window === 'undefined' ? undefined : window
    win?.addEventListener('blur', reset, listenerOptions)
    win?.addEventListener('focus', reset, listenerOptions)

    return () => {
      el.removeEventListener('keydown', onKeydown)
      el.removeEventListener('keyup', onKeyup)
      win?.removeEventListener('blur', reset)
      win?.removeEventListener('focus', reset)
    }
  }, [trackedTarget, updateRefs, reset])

  // a small Proxy over the state snapshot: lowercases the accessed property,
  // applies the alias map, computes `+` / `_` combinations on the fly and
  // defaults unknown keys to `false`
  const magicKeys = useMemo(() => {
    const snapshot: Record<string, unknown> = { current, ...keys }

    const get = (_target: Record<string, unknown>, prop: string | symbol): unknown => {
      if (typeof prop !== 'string')
        return Reflect.get(_target, prop)

      let normalized = prop.toLowerCase()
      // alias
      if (normalized in aliasMapRef.current)
        normalized = aliasMapRef.current[normalized]
      // combination key, e.g. `shift+ctrl+a` / `Ctrl_Shift_Period`
      if (/[+_-]/.test(normalized)) {
        return normalized
          .split(/[+_-]/g)
          .map(key => key.trim())
          .every(key => get(_target, key))
      }

      return Reflect.get(_target, normalized) ?? false
    }

    return new Proxy(snapshot, {
      get: (_target, prop) => get(_target, prop),
    }) as UseMagicKeysReturn<T>
  }, [keys, current])

  return magicKeys
}
