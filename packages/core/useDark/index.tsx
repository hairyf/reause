import type { BasicColorMode, BasicColorSchema, UseColorModeOptions } from '../useColorMode'
import { useCallback } from 'react'
import { useColorMode } from '../useColorMode'
import { usePreferredDark } from '../usePreferredDark'

export interface UseDarkOptions extends Omit<UseColorModeOptions<BasicColorSchema>, 'modes' | 'onChanged'> {
  /**
   * Value applying to the target element when isDark=true
   *
   * @default 'dark'
   */
  valueDark?: string

  /**
   * Value applying to the target element when isDark=false
   *
   * @default ''
   */
  valueLight?: string

  /**
   * A custom handler for handle the updates. When specified, the default behavior will be
   * overridden.
   *
   * @default undefined
   */
  onChanged?: (isDark: boolean, defaultHandler: ((mode: BasicColorSchema) => void), mode: BasicColorSchema) => void
}

export type UseDarkReturn = [
  isDark: boolean,
  toggleDark: () => void,
]

/**
 * Reactive dark mode with auto data persistence.
 *
 * Map from @vueuse/core `useDark`
 * (`source/vueuse/packages/core/useDark/`), which composes `useColorMode`
 * (`source/vueuse/packages/core/useColorMode/`) with a two-mode palette and a
 * boolean projection. Reactive dark mode with auto data persistence: on start up it reads the value
 * from localStorage (the key is configurable) to see if there is a user configured color scheme, if
 * not, it uses the user's system preference. Changing `isDark` updates the target element's
 * attribute and stores the preference for persistence.
 *
 * React divergences:
 * - the Vue `WritableComputedRef<boolean>` return becomes a state-like tuple `[isDark,
 * toggleDark]`: `isDark` is plain boolean state (re-renders the component on change) and
 * `toggleDark` is a toggle callback;
 * - the composed `useColorMode` `[mode, setMode]` tuple is projected to a
 *   boolean: `isDark = mode === 'dark'`, and `toggleDark` flips the resolved
 *   mode, storing `auto` when the flipped value equals the system preference
 *   (mirroring upstream's `isDark` setter);
 * - the `onChanged` handler is wrapped with `isDark` and the resolved mode,
 *   as upstream does, and the `modes` map is derived from
 *   `valueDark`/`valueLight` and passed into `useColorMode`;
 * - the component variant (`UseDark`) is not ported (the React port has no
 *   component wrappers).
 *
 * @example
 * const [isDark, toggleDark] = useDark()
 * toggleDark() // flips dark mode, persists the preference
 *
 * @see https://vueuse.org/core/useDark/
 */
export function useDark(options: UseDarkOptions = {}): UseDarkReturn {
  const {
    valueDark = 'dark',
    valueLight = '',
  } = options

  // `toggleDark` needs the raw system preference to decide when the flipped
  // value should be persisted as `auto`; the reause `useColorMode` return
  // does not expose it (upstream reads it from `mode.system.value`), so it is
  // resolved here.
  const preferredDark = usePreferredDark({ window: options.window })
  const system: BasicColorMode = preferredDark ? 'dark' : 'light'

  const [mode, setMode] = useColorMode<BasicColorSchema>({
    ...options,
    onChanged: (mode, defaultHandler) => {
      if (options.onChanged)
        options.onChanged(mode === 'dark', defaultHandler, mode)
      else
        defaultHandler(mode)
    },
    modes: {
      dark: valueDark,
      light: valueLight,
    },
  })

  const isDark = mode === 'dark'

  // upstream: `isDark.value = v` — flip the resolved mode; matching the
  // system mode stores `auto` so the preference keeps following the system
  const toggleDark = useCallback(() => {
    const modeVal: BasicColorMode = isDark ? 'light' : 'dark'
    setMode(system === modeVal ? 'auto' : modeVal)
  }, [isDark, system, setMode])

  return [isDark, toggleDark]
}
