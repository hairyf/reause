import { useEffectOnce } from '../useEffectOnce'
import { useUpdateEffect } from '../useUpdateEffect'

/**
 * Map from react-use `useLogger`.
 *
 * @param componentName The name printed in each line.
 * @param rest Values logged after each mount/update line (never the unmount
 * line). Captured from the render that logged them.
 *
 * @example
 * useLogger('TodoList', todos)
 * // "TodoList mounted" […]
 * // "TodoList updated" […]   — on each subsequent render
 * // "TodoList unmounted"
 *
 * @see source/react-use/docs/useLogger.md (the pin's docs page, read directly
 * rather than fetched from a URL)
 */
export function useLogger(componentName: string, ...rest: any[]): void {
  // The mount line and the unmount cleanup come from one `useEffectOnce`
  // (`useEffect(fn, [])`). `rest` is read from this render's closure, on
  // purpose: that is what the pin's mount effect captures.
  useEffectOnce(() => {
    // eslint-disable-next-line no-console
    console.log(`${componentName} mounted`, ...rest)

    // eslint-disable-next-line no-console
    return () => console.log(`${componentName} unmounted`)
  })

  // `useUpdateEffect` skips the mount render and then behaves like
  // `useEffect(effect)` with no dependency array, i.e. it fires on every
  // re-render — which is what makes the update line per-render rather than
  // per-dependency-change, and is why an implementation that used `useEffect`
  // with `[]` or a dep list would be wrong. `rest` again comes from the
  // logging render's closure.
  useUpdateEffect(() => {
    // eslint-disable-next-line no-console
    console.log(`${componentName} updated`, ...rest)
  })
}
