import { useEffectOnce } from '../useEffectOnce'
import { useUpdateEffect } from '../useUpdateEffect'

/**
 * Logs a component's lifecycle transitions to the console — React port of react-use's `useLogger`.
 *
 * Map from react-use `useLogger`
 * Mapping: the pin is mirrored verbatim — three `console.log` calls, one per phase, in this order:
 * `"<componentName> mounted"` once after mount, `"<componentName> updated"` on every re-render
 * after mount, and `"<componentName> unmounted"` on unmount. Every one of the first two is followed
 * by the hook's current `...rest` arguments, exactly as the pin forwards them; the unmount line
 * deliberately carries **no** extra arguments because that is what upstream's cleanup closure logs.
 *
 * **No dev gate, matching the pin.** react-use calls `console.log` unconditionally — there is no
 * `process.env.NODE_ENV` check anywhere in
 * `source/react-use/src/useLogger.ts` — so adding one here would change the
 * observable behaviour of the port. Silence it at the call site instead:
 *
 * ```ts
 * if (process.env.NODE_ENV !== 'production')
 * useLogger('TodoList', todos)
 * ```
 *
 * A conditional *call* like that is safe (the bundler reaches it), unlike a `typeof process !==
 * 'undefined'` prefix around an internal guard, which Vite would fold to `false` in a browser
 * bundle because it inlines `process.env.NODE_ENV` without defining a `process` object.
 *
 * **`...rest` is captured per render, not once.** The mount line logs the arguments of the render
 * that mounted; the update line logs the arguments of that* render. React-use types the parameter
 * `...rest: any[]` and this port keeps `any[]` rather than inventing a generic, so the two
 * implementations stay signature-identical; the logged values are compared by whatever
 * `console.log` does, not by this hook.
 *
 * The timings are inherited from the two merged siblings it composes — `useEffectOnce` for
 * mount+unmount and `useUpdateEffect` for update — rather than reimplemented, so there is one copy
 * of each primitive in the package. That is the batch's standing disposition (the issue's "or
 * inline the two effects" branch is obsolete now that both hooks are merged and barrel- exported).
 * StrictMode follows from them: the mount render is double-invoked and both passes share
 * `useUpdateEffect`'s first-render ref, so in a development StrictMode tree the committed render
 * already reads the flip as `false` and the update line fires at mount too (see `useUpdateEffect`
 * for the full note). Production is unaffected.
 *
 * Upstream default-exports this hook; reause exports it by name, the repo's convention for the
 * react-use mirrors. It touches neither `window` nor `document`, so it is SSR-safe.
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
