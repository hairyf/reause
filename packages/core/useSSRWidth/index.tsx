import type { PropsWithChildren, ReactNode } from 'react'
import { noop } from '@reause/shared'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export interface SSRWidthProviderProps {
  /**
   * The viewport width that descendants render against while there is no `window` to measure
   * (server-side rendering and the first client render).
   *
   * so `useSSRWidth()` reads back `undefined`.
   *
   * @default undefined
   */
  width?: number | null
}

/**
 * The value carried by `SSRWidthContext`: the current width plus the writer exposed through
 * `useSSRWidth()`.
 */
interface SSRWidthContextValue {
  width: number | undefined
  setWidth: (width: number | null) => void
}

const SSRWidthContext = createContext<SSRWidthContextValue | undefined>(undefined)

/**
 * `provideSSRWidth(null)` semantics: anything that is not a number clears the simulated width, so
 * readers see `undefined`.
 */
function normalizeWidth(width: number | null | undefined): number | undefined {
  return typeof width === 'number' ? width : undefined
}

/**
 * Map from @vueuse/core `provideSSRWidth`
 * (`source/vueuse/packages/core/useSSRWidth/`).
 *
 * @see https://vueuse.org/core/useSSRWidth/
 *
 * @example
 * function App() {
 *   return (
 *     <SSRWidthProvider width={500}>
 *       <MyComponent />
 *     </SSRWidthProvider>
 *   )
 * }
 */
export function SSRWidthProvider(props: PropsWithChildren<SSRWidthProviderProps>): ReactNode {
  const { width: widthProp, children } = props

  const nextWidth = normalizeWidth(widthProp)

  // "Adjusting state when a prop changes" (React docs): the provider owns the
  // live value so descendants can write through `setWidth`, while a new
  // `width` prop still wins over a locally written value.
  const [width, setWidthState] = useState<number | undefined>(nextWidth)
  const [lastWidthProp, setLastWidthProp] = useState<number | undefined>(nextWidth)
  if (lastWidthProp !== nextWidth) {
    setLastWidthProp(nextWidth)
    setWidthState(nextWidth)
  }

  const setWidth = useCallback((next: number | null) => {
    setWidthState(normalizeWidth(next))
  }, [])

  const value = useMemo<SSRWidthContextValue>(
    () => ({ width, setWidth }),
    [width, setWidth],
  )

  return <SSRWidthContext.Provider value={value}>{children}</SSRWidthContext.Provider>
}

/**
 * `useSSRWidth` return tuple: the current width and its writer.
 */
export type UseSSRWidthReturn = [
  width: number | undefined,
  setWidth: (width: number | null) => void,
]

/**
 * Map from @vueuse/core `useSSRWidth`
 * (`source/vueuse/packages/core/useSSRWidth/`).
 *
 * @see https://vueuse.org/core/useSSRWidth/
 *
 * @example
 * function MyComponent() {
 *   const [width, setWidth] = useSSRWidth()
 *   return <div>Width: {width}px</div>
 * }
 */
export function useSSRWidth(): UseSSRWidthReturn {
  const context = useContext(SSRWidthContext)
  return [context?.width, context?.setWidth ?? noop]
}
