---
category: Component
---

# createPromisifiedComponent

Template as Promise. Useful for constructing custom Dialogs, Modals, Toasts, etc.

## Usage

```tsx
import { createPromisifiedComponent } from '@reause/core'

const Promisified = createPromisifiedComponent<ReturnType>()

async function open() {
  const result = await Promisified.start()
  // button is clicked, result is 'ok'
}
```

```tsx
<Promisified>
  {({ promise, resolve, reject, args }) => (
    /* your UI */
    <button onClick={() => resolve('ok')}>
      OK
    </button>
  )}
</Promisified>
```

### Returned Component

`createPromisifiedComponent` returns a **React component** that you can use anywhere in your tree:

- **Programmatic** — call your UI as a promise
- **Template** — use a React component to render, not a new DSL
- **TypeScript** — full type safety via generic type
- **Renderless** — you take full control of the UI
- **Transition** — accepted for API parity (see below)

```ts
import { createPromisifiedComponent } from '@reause/core'

const Promisified = createPromisifiedComponent()
const MyPromise = createPromisifiedComponent<boolean>() // with generic type
```

Use a render prop as children to access the promise and resolve functions.

```tsx
<Promisified>
  {({ promise, resolve, reject, args }) => (
    /* you can have anything */
    <button onClick={() => resolve('ok')}>
      OK
    </button>
  )}
</Promisified>
```

The template will not be rendered initially, until you call the `start` method from the component.

```ts
const result = await Promisified.start()
```

Once `resolve` or `reject` is called in the template, the promise will be resolved or rejected, returning the value you passed in. Once resolved, the template will be removed automatically.

### Passing Arguments

You can pass arguments to the `start` with arguments.

```ts
import { createPromisifiedComponent } from '@reause/core'

const Promisified = createPromisifiedComponent<boolean, [string, number]>()

const result = await Promisified.start('hello', 123)
```

And in the template render prop, you can access the arguments via `args` property.

```tsx
<Promisified>
  {({ args, resolve }) => (
    <>
      <div>{args[0]}</div>
      {/* hello */}
      <div>{args[1]}</div>
      {/* 123 */}
      <button onClick={() => resolve(true)}>
        OK
      </button>
    </>
  )}
</Promisified>
```

### Singleton Mode

Use the `singleton` option to ensure only one instance of the promise can be active at a time. If `start` is called while a promise is already active, it will return the existing promise instead of creating a new one.

```ts
import { createPromisifiedComponent } from '@reause/core'

const Promisified = createPromisifiedComponent<boolean>({
  singleton: true,
})

// These will return the same promise if called in quick succession
const result1 = Promisified.start()
const result2 = Promisified.start() // returns the same promise as result1
```

### Transition

The `transition` option is accepted for API parity with upstream, where it
passes props to Vue's `TransitionGroup` to animate the template. React has no
built-in transition-group system, so this option has **no runtime effect** in
reause — animate the rendered template with CSS animations or a transition
library instead.

### Template Props

The render prop provides the following props:

| Prop          | Type                                     | Description                                               |
| ------------- | ---------------------------------------- | --------------------------------------------------------- |
| `promise`     | `Promise<Return> \| undefined`           | The current promise instance                              |
| `resolve`     | `(v: Return \| Promise<Return>) => void` | Resolve the promise with a value                          |
| `reject`      | `(v: any) => void`                       | Reject the promise                                        |
| `args`        | `Args`                                   | Arguments passed to `start()`                             |
| `isResolving` | `boolean`                                | `true` when resolving another promise passed to `resolve` |
| `key`         | `number`                                 | Unique key for list rendering                             |

```tsx
<Promisified>
  {({ promise, resolve, reject, args, isResolving }) => (
    <>
      {isResolving
        ? <div>Loading...</div>
        : (
            <>
              <button onClick={() => resolve('ok')}>
                OK
              </button>
              <button onClick={() => reject('cancelled')}>
                Cancel
              </button>
            </>
          )}
    </>
  )}
</Promisified>
```

---

## Motivation

The common approach to call a dialog or a modal programmatically would be like this:

```ts
const dialog = useDialog()
const result = await dialog.open({
  title: 'Hello',
  content: 'World',
})
```

This would work by sending these information to the top-level component and let it render the dialog. However, it limits the flexibility you could express in the UI. For example, you could want the title to be red, or have extra buttons, etc. You would end up with a lot of options like:

```ts
const result = await dialog.open({
  title: 'Hello',
  titleClass: 'text-red',
  content: 'World',
  contentClass: 'text-blue text-sm',
  buttons: [
    { text: 'OK', class: 'bg-red', onClick: () => {} },
    { text: 'Cancel', class: 'bg-blue', onClick: () => {} },
  ],
  // ...
})
```

Even this is not flexible enough. If you want more, you might end up with manual render function.

```tsx
const result = await dialog.open({
  title: 'Hello',
  contentSlot: () => <MyComponent content={content} />,
})
```

This is like reinventing a new DSL in the script to express the UI template.

So this function allows **expressing the UI in templates instead of scripts**, where it is supposed to be, while still being able to be manipulated programmatically.

## Type Declarations

```ts
export interface PromisifiedComponentProps<Return, Args extends any[] = []> {
  /**
   * The promise instance.
   */
  promise: Promise<Return> | undefined
  /**
   * Resolve the promise.
   */
  resolve: (v: Return | Promise<Return>) => void
  /**
   * Reject the promise.
   */
  reject: (v: any) => void
  /**
   * Arguments passed to `start()`.
   */
  args: Args
  /**
   * Indicates if the promise is resolving. When passing another promise to `resolve`, this will be
   * set to `true` until the promise is resolved.
   */
  isResolving: boolean
  /**
   * Options passed to `createPromisifiedComponent()`.
   */
  options: PromisifiedComponentOptions
  /**
   * Unique key for list rendering.
   */
  key: number
}
export interface PromisifiedComponentOptions {
  /**
   * Determines if the promise can be called only once at a time.
   *
   * @default false
   */
  singleton?: boolean
  /**
   * Transition props for the promise. Accepted for API parity with upstream (Vue's
   * `TransitionGroupProps`); React has no built-in transition-group system, so this has no runtime
   * effect — animate the rendered template with CSS or a transition library instead.
   */
  transition?: Record<string, any>
}
export type PromisifiedComponent<
  Return,
  Args extends any[] = [],
> = ComponentType<{
  /**
   * The template to render for each active promise instance — a render prop receiving the instance
   * props (the React equivalent of upstream's `v-slot`).
   */
  children: (props: PromisifiedComponentProps<Return, Args>) => ReactNode
}> & {
  start: (...args: Args) => Promise<Return>
}
/**
 * Map from @vueuse/core `createTemplatePromise`
 * (`source/vueuse/packages/core/createTemplatePromise/`).
 *
 * @see https://vueuse.org/core/createTemplatePromise/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const Promisified = createPromisifiedComponent<string>()
 *
 * function App() {
 *   async function open() {
 *     const result = await Promisified.start() // 'ok' once the template resolves it
 *   }
 *   return (
 *     <>
 *       <button onClick={open}>Open</button>
 *       <Promisified>
 *         {({ resolve }) => <button onClick={() => resolve('ok')}>OK</button>}
 *       </Promisified>
 *     </>
 *   )
 * }
 */
export declare function createPromisifiedComponent<
  Return,
  Args extends any[] = [],
>(options?: PromisifiedComponentOptions): PromisifiedComponent<Return, Args>
```
