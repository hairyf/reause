import type { PropsWithChildren, ReactNode } from 'react'
import { noop } from '@reause/shared'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export interface SSRWidthProviderProps {
  /**
   * The viewport width that descendants render against while there is no
   * `window` to measure (server-side rendering and the first client render).
   *
   * Mirrors upstream's `provideSSRWidth(width: number | null)`: any value that
   * is not a number — `null` or an omitted prop — means "no simulated width",
   * so `useSSRWidth()` reads back `undefined`.
   *
   * @default undefined
   */
  width?: number | null
}

/**
 * The value carried by `SSRWidthContext`: the current width plus the writer
 * exposed through `useSSRWidth()`.
 */
interface SSRWidthContextValue {
  width: number | undefined
  setWidth: (width: number | null) => void
}

const SSRWidthContext = createContext<SSRWidthContextValue | undefined>(undefined)

/**
 * `provideSSRWidth(null)` semantics: anything that is not a number clears the
 * simulated width, so readers see `undefined` (upstream:
 * `typeof ssrWidth === 'number' ? ssrWidth : undefined`).
 */
function normalizeWidth(width: number | null | undefined): number | undefined {
  return typeof width === 'number' ? width : undefined
}

/**
 * Provide a global viewport width to the components below it.
 *
 * Map from @vueuse/core `provideSSRWidth`
 * (`source/vueuse/packages/core/useSSRWidth/`). This is the providing half of
 * upstream's `provideSSRWidth` / `useSSRWidth` pair: render it above the
 * subtree that needs the width and every `useSSRWidth()` below it reads the
 * same value.
 *
 * React divergences:
 * - upstream's `provideSSRWidth(width, app?)` — either `app.provide()` on the
 *   Vue app instance or a local `provideLocal` inside a component — becomes a
 *   component: React has no app instance and no provide/inject pair, so the
 *   value travels through a React Context created by this module;
 * - the provider owns the live value in state, seeded from `width` and
 *   re-synced whenever the `width` prop changes, so descendants can write
 *   through the `setWidth` returned by `useSSRWidth()` (upstream's provided
 *   value is static);
 * - nothing here reads `window` or `document`, so the same tree renders on the
 *   server and on the client without a hydration mismatch — that is the whole
 *   point of the value;
 * - the context identity is memoized on `width`, so consumers only re-render
 *   when the width actually changes.
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
 * Read the global viewport width used while rendering without a `window`.
 *
 * Map from @vueuse/core `useSSRWidth`
 * (`source/vueuse/packages/core/useSSRWidth/`). Used to set a global viewport
 * width which will be used when rendering SSR components that rely on the
 * viewport width like `useMediaQuery` or `useBreakpoints`. The value comes
 * from the nearest `SSRWidthProvider` above the calling component.
 *
 * Return tuple follows this repo's React idiom (upstream returns a plain
 * `number | undefined`): `const [width, setWidth] = useSSRWidth()`.
 *
 * React divergences:
 * - upstream's `useSSRWidth()` only injects a value; here the same call also
 *   returns the `setWidth` writer, so a descendant can change the width that
 *   the whole subtree below the provider renders against (`setWidth(null)`
 *   clears it);
 * - without an `SSRWidthProvider` above the caller, `width` is `undefined` —
 *   upstream's "nothing provided" default — and `setWidth` is a no-op, since
 *   there is no provider state to write to;
 * - the read is a plain `useContext`, so nothing touches `window`/`document`
 *   and the value is identical on the server and during the first client
 *   render.
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
