/**
 * Make isomorphic destructurable for object and array at the same time — React
 * port of VueUse's `makeDestructurable` (a pure utility function, so it maps 1:1 with no React
 * adaptation). See this blog for the underlying idea:
 * https://antfu.me/posts/destructuring-with-object-or-array/
 *
 * Map from @vueuse/shared `makeDestructurable`
 * Upstream semantics are kept verbatim: given `(obj, arr)` the returned value can be destructured
 * as an object (`const { foo, bar } = obj`) or as an array (`const [foo, bar] = obj`) — the array
 * mode is backed by a non-enumerable `Symbol.iterator` defined on a shallow clone of `obj` (spread
 * `{...obj }`); `Object.assign` appears only in the no-Symbol SSR fallback.
 *
 * @example
 * const foo = { name: 'foo' }
 * const bar = 1024
 * const obj = makeDestructurable({ foo, bar } as const, [foo, bar] as const)
 * const { foo: f1, bar: b1 } = obj // object destructuring
 * const [f2, b2] = obj // array destructuring
 */
/* @__NO_SIDE_EFFECTS__ */
export function makeDestructurable<
  T extends Record<string, unknown>,
  A extends readonly any[],
>(obj: T, arr: A): T & A {
  if (typeof Symbol !== 'undefined') {
    const clone = { ...obj }

    Object.defineProperty(clone, Symbol.iterator, {
      enumerable: false,
      value() {
        let index = 0
        return {
          next: () => ({
            value: arr[index++],
            done: index > arr.length,
          }),
        }
      },
    })

    return clone as T & A
  }
  else {
    return Object.assign([...arr], obj) as unknown as T & A
  }
}
