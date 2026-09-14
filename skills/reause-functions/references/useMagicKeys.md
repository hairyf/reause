---
category: Sensors
---

# useMagicKeys

Reactive keys pressed state, with magical keys combination support

## Usage

```tsx
import { useMagicKeys } from '@reause/core'
import { useEffect } from 'react'

const { shift, space, a /* keys you want to monitor */ } = useMagicKeys()

useEffect(() => {
  if (space)
    console.log('space has been pressed')
}, [space])

useEffect(() => {
  if (shift && a)
    console.log('Shift + A have been pressed')
}, [shift, a])
```

::: tip NOTE
If you're using TypeScript with `noUncheckedIndexedAccess` enabled in your `tsconfig.json`, the destructured keys will have the type `boolean | undefined`.

The `noUncheckedIndexedAccess` TypeScript option adds `undefined` to any un-declared field accessed via index signatures. Since `useMagicKeys()` uses an index signature to allow accessing any key dynamically, TypeScript will treat destructured properties as potentially undefined for type safety.

A truthiness check narrows the value back to `boolean`:

```tsx
const { shift, space, a } = useMagicKeys()

if (space)
  console.log('space has been pressed')

if (shift && a)
  console.log('Shift + A have been pressed')
```

Check the [TypeScript documentation](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess) for more details about `noUncheckedIndexedAccess`.
:::

Check out [all the possible keycodes](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values).

### Combinations

You can magically use combinations (shortcuts/hotkeys) by connecting keys with `+` or `_`.

```tsx
import { useMagicKeys } from '@reause/core'

const keys = useMagicKeys()
const shiftCtrlA = keys['Shift+Ctrl+A']

useEffect(() => {
  if (shiftCtrlA)
    console.log('Shift + Ctrl + A have been pressed')
}, [shiftCtrlA])
```

```tsx
import { useMagicKeys } from '@reause/core'

const { Ctrl_A_B, space, alt_s /* ... */ } = useMagicKeys()

useEffect(() => {
  if (Ctrl_A_B)
    console.log('Control+A+B have been pressed')
}, [Ctrl_A_B])
```

You can also use `useWhenever` function to make it shorter

```tsx
import { useMagicKeys } from '@reause/core'
import { useWhenever } from '@reause/shared'

const keys = useMagicKeys()

useWhenever(keys.shift_space, () => {
  console.log('Shift+Space have been pressed')
})
```

### Current Pressed keys

A special property `current` is provided to representing all the keys been pressed currently.

```tsx
import { useMagicKeys } from '@reause/core'

const { current } = useMagicKeys()

console.log(current) // Set { 'control', 'a' }

useWhenever(
  current.has('a') && !current.has('b'),
  () => console.log('A is pressed but not B'),
)
```

### Key Aliasing

```tsx
import { useMagicKeys } from '@reause/core'

const { shift_cool } = useMagicKeys({
  aliasMap: {
    cool: 'space',
  },
})

useEffect(() => {
  if (shift_cool)
    console.log('Shift + Space have been pressed')
}, [shift_cool])
```

By default, we have some [preconfigured alias for common practices](https://github.com/vueuse/vueuse/blob/main/packages/core/useMagicKeys/aliasMap.ts).

### Conditionally Disable

You might have some `<input />` elements in your apps, and you don't want to trigger the magic keys handling when users focused on those inputs. There is an example of using `useActiveElement` to do that.

```tsx
import { useActiveElement, useMagicKeys } from '@reause/core'
import { useEffect } from 'react'

const activeElement = useActiveElement()
const notUsingInput = activeElement?.tagName !== 'INPUT'
  && activeElement?.tagName !== 'TEXTAREA'

const { tab } = useMagicKeys()

useEffect(() => {
  if (tab && notUsingInput)
    console.log('Tab has been pressed outside of inputs!')
}, [tab, notUsingInput])
```

### Custom Event Handler

```tsx
import { useMagicKeys } from '@reause/core'

const { ctrl_s } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.key === 's' && e.type === 'keydown')
      e.preventDefault()
  },
})
```

> ⚠️ This usage is NOT recommended, please use with caution.

### Reactive Mode

React state is always "reactive" — the `reactive: true` option is accepted for API compatibility but has no effect, values are plain booleans either way.

```tsx
import { useMagicKeys } from '@reause/core'

const keys = useMagicKeys({ reactive: true })
```

## Type Declarations

```ts
/**
 * Map from @vueuse/core `aliasMap.ts`
 * (`source/vueuse/packages/core/useMagicKeys/aliasMap.ts`).
 */
export declare const DefaultMagicKeysAliasMap: Readonly<Record<string, string>>
export interface UseMagicKeysOptions<Reactive extends boolean> {
  /**
   * Returns a reactive object instead of an object of refs
   *
   * @default false
   */
  reactive?: Reactive
  /**
   * Target for listening events
   *
   * @default window
   */
  target?: RefObject<EventTarget | null | undefined>
  /**
   * Alias map for keys, all the keys should be lowercase { target: keycode }
   *
   * @example { ctrl: "control" }
   * @default <predefined-map>
   */
  aliasMap?: Record<string, string>
  /**
   * Register passive listener
   *
   * @default true
   */
  passive?: boolean
  /**
   * Custom event handler for keydown/keyup event. Useful when you want to apply custom logic.
   *
   * When using `e.preventDefault()`, you will need to pass `passive: false` to useMagicKeys().
   */
  onEventFired?: (e: KeyboardEvent) => void | boolean
}
export interface MagicKeysInternal {
  /**
   * A Set of currently pressed keys, Stores raw keyCodes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
   */
  current: ReadonlySet<string>
}
/**
 * Return of `useMagicKeys`. Upstream maps `Reactive extends true ? boolean: ComputedRef<boolean>` —
 * a plain boolean in reactive mode, a ref otherwise. React state is always "reactive" (the port has
 * no ref layer), so both branches collapse to plain `boolean`; the conditional is kept to mirror
 * the upstream type shape.
 */
export type UseMagicKeysReturn<Reactive extends boolean> = Readonly<
  Record<string, Reactive extends true ? boolean : boolean> & MagicKeysInternal
>
/**
 * Map from @vueuse/core `useMagicKeys`
 * (`source/vueuse/packages/core/useMagicKeys/`).
 *
 * @example
 * const { shift, space, a } = useMagicKeys()
 *
 * useEffect(() => {
 *   if (space)
 *     console.log('space has been pressed')
 * }, [space])
 *
 * useEffect(() => {
 *   if (shift && a)
 *     console.log('Shift + A have been pressed')
 * }, [shift, a])
 */
export declare function useMagicKeys<T extends boolean = false>(
  options?: UseMagicKeysOptions<T>,
): UseMagicKeysReturn<T>
```
