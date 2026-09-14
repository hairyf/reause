/** String keys of `Math` that are methods (callables), mirroring upstream's `UseMathKeys`. */
export type UseMathKeys = keyof { [K in keyof Math as Math[K] extends (...args: any) => any ? K : never]: unknown }

/**
 * Return type — `Math` methods always return a `number`. The arguments stay plain values (see
 * `PlainMathMethod`), not upstream's reactified ones.
 */
export type UseMathReturn<K extends keyof Math> = ReturnType<PlainMathMethod<Math[K]>>

/**
 * Arguments of a plain function — a local copy of VueUse shared's `ArgumentsType` (reause has no
 * shared equivalent).
 */
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never

/**
 * A `Math` method whose arguments stay plain values — deliberately NOT VueUse's `Reactified<T,
 * Computed>` (which wraps every argument in `MaybeRefOrGetter` and resolves getters via `toValue`).
 * Getters as data sources are rejected repo-wide (rule 1, issue #462); the reause hook reads the
 * plain arguments at render time and returns the computed `number` directly.
 */
type PlainMathMethod<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : never

/**
 * Map from @vueuse/math `useMath`
 * (`source/vueuse/packages/math/useMath/`). Reactive `Math` methods — pass a
 * `Math` method name as the key and its plain numeric arguments; the result is recomputed on every
 * render and returned directly, with no `.value` wrapper and no effects (SSR-safe).
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` via `reactify` and
 * returns a `ComputedRef<number>`; the reause version is a pure derived hook — `key` and every
 * argument are read at render time and `Math[key]` is invoked immediately, so the returned number
 * always reflects the latest values.
 *
 * React divergence: arguments are plain numbers, not upstream's `MaybeRefOrGetter`. In particular
 * the getter form (`() => number`) is NOT accepted — getters as data sources are rejected repo-wide
 * (issue #462). The caller re-renders with new values (e.g. from `useState`).
 *
 * @see https://vueuse.org/math/useMath/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useMath('pow', 2, 3) // 8
 *
 * const power = useMath('pow', 2, 3) // 8
 *
 * const root = useMath('sqrt', 4) // 2
 *
 * const rounded = useMath('round', 2.5) // 3
 *
 * @param key - The `Math` method name to call (e.g. `'pow'`, `'sqrt'`).
 * @param args - Plain numeric arguments to pass to the `Math` method.
 * @returns The result of calling `Math[key]` with the arguments.
 */
export function useMath<K extends keyof Math>(
  key: K,
  ...args: ArgumentsType<PlainMathMethod<Math[K]>>
): UseMathReturn<K> {
  const fn = Math[key] as unknown as (...args: number[]) => number
  return fn(...args) as UseMathReturn<K>
}
