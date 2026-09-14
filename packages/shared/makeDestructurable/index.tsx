/**
 * Map from @vueuse/shared `makeDestructurable`.
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
