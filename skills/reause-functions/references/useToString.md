---
category: Utilities
---

# useToString

Convert a value to its string representation.

`value` is a plain read-only value — pass the state value (or `ref.current`)
directly. Unlike upstream, getters and refs are not unwrapped; the value is
coerced as-is on every call.

## Usage

```tsx
import { useToString } from '@reause/shared'

useToString(123.345) // '123.345'
useToString('hi') // 'hi'
useToString({ foo: 'hi' }) // '[object Object]'
```

## Type Declarations

```ts
/**
 * Map from @vueuse/shared `useToString`.
 *
 * @example
 * useToString(123.345)       // '123.345'
 * useToString('hi')          // 'hi'
 * useToString({ foo: 'hi' }) // '[object Object]'
 */
export declare function useToString(value: unknown): string
```
