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
 * Map from @vueuse/core `useDark`
 * (`source/vueuse/packages/core/useDark/`).
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
