---
category: Utilities
---

# makeDestructurable

Make isomorphic destructurable for object and array at the same time. See [this blog](https://antfu.me/posts/destructuring-with-object-or-array/)

## Usage

```ts
import { makeDestructurable } from '@reause/shared'

const foo = { name: 'foo' }
const bar = 1024

const obj = makeDestructurable(
  { foo, bar } as const,
  [foo, bar] as const,
)

// object destructuring
const { foo: foo1, bar: bar1 } = obj
// array destructuring
const [foo2, bar2] = obj
```

## Type Declarations

```ts
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
export declare function makeDestructurable<
  T extends Record<string, unknown>,
  A extends readonly any[],
>(obj: T, arr: A): T & A
```
