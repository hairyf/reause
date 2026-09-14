---
category: Component
---

# createPortalSlot

Define and reuse a template inside the component scope.

## Motivation

It's common to have the need to reuse some part of the UI. For example:

```tsx
function App({ showInDialog }: { showInDialog: boolean }) {
  return (
    <>
      {showInDialog
        ? <dialog>{/* something complex */}</dialog>
        : <div>{/* something complex */}</div>}
    </>
  )
}
```

We'd like to reuse our code as much as possible. So normally we might need to extract those duplicated parts into a component. However, in a separated component you lose the ability to access the local bindings. Defining props and events for them can be tedious sometimes.

So this function is made to provide a way for defining and reusing templates inside the component scope.

## Usage

In the previous example, we could refactor it to:

```tsx
import { createPortalSlot } from '@reause/core'

const [PortalSlot, SlotTarget] = createPortalSlot()

function App({ showInDialog }: { showInDialog: boolean }) {
  return (
    <>
      <PortalSlot>
        {() => {
          /* something complex */
        }}
      </PortalSlot>

      {showInDialog
        ? <dialog><SlotTarget /></dialog>
        : <div><SlotTarget /></div>}
    </>
  )
}
```

- `<PortalSlot>` will register the template — its children must be a render function — and renders nothing.
- `<SlotTarget>` will render the template provided by `<PortalSlot>`.
- `<PortalSlot>` must be used before `<SlotTarget>`.

> **Note**: It's recommended to extract as separate components whenever possible. Abusing this function might lead to bad practices for your codebase.

### Passing Data

You can also pass data to the template:

- Access the data in the render function passed to `<PortalSlot>`
- Directly bind the data as props on `<SlotTarget>` to pass them to the template

```tsx
import { createPortalSlot } from '@reause/core'

const [PortalSlot, SlotTarget] = createPortalSlot()

function App({ data, anotherData }: { data: string, anotherData: string }) {
  return (
    <>
      <PortalSlot>
        {({ data, msg }) => <div>{`${data} passed from usage`}</div>}
      </PortalSlot>

      <SlotTarget data={data} msg="The first usage" />
      <SlotTarget data={anotherData} msg="The second usage" />
      <SlotTarget {...{ data: 'something', msg: 'The third' }} />
    </>
  )
}
```

### TypeScript Support

`createPortalSlot` accepts a generic type to provide type support for the data passed to the template:

```tsx
import { createPortalSlot } from '@reause/core'

// Comes with a pair of `PortalSlot` and `SlotTarget`
const [PortalFoo, TargetFoo] = createPortalSlot<{ msg: string }>()

// You can create multiple portal slots
const [PortalBar, TargetBar] = createPortalSlot<{ items: string[] }>()

function App() {
  return (
    <>
      <PortalFoo>
        {/* `msg` is typed as `string` */}
        {({ msg }) => <div>{`Hello ${msg.toUpperCase()}`}</div>}
      </PortalFoo>

      <TargetFoo msg="World" />
    </>
  )
}
```

Optionally, if you are not a fan of array destructuring, the following usages are also legal:

```tsx
import { createPortalSlot } from '@reause/core'

const { define: PortalFoo, reuse: TargetFoo } = createPortalSlot<{
  msg: string
}>()

function App() {
  return (
    <>
      <PortalFoo>
        {({ msg }) => <div>{`Hello ${msg.toUpperCase()}`}</div>}
      </PortalFoo>

      <TargetFoo msg="World" />
    </>
  )
}
```

```tsx
import { createPortalSlot } from '@reause/core'

const TemplateFoo = createPortalSlot<{ msg: string }>()

function App() {
  return (
    <>
      <TemplateFoo.define>
        {({ msg }) => <div>{`Hello ${msg.toUpperCase()}`}</div>}
      </TemplateFoo.define>

      <TemplateFoo.reuse msg="World" />
    </>
  )
}
```

### Props

By default, all props passed to `<SlotTarget>` are forwarded to the template. If you don't want certain props to be forwarded, list them in the `props` option. React has no runtime props declaration (upstream uses Vue's `ComponentObjectPropsOptions`), so this is a list of prop keys instead:

```tsx
import { createPortalSlot } from '@reause/core'

const [PortalSlot, SlotTarget] = createPortalSlot<{ msg: string, enable: boolean }>({
  props: ['msg', 'enable'],
})
```

The `inheritAttrs` option is accepted for API parity with upstream, but it has no runtime effect: React has no attribute-inheritance system, so props never fall through to a root element.

### Passing Slots

It's also possible to pass children back from `<SlotTarget>`. You can access them on `<PortalSlot>` from `$slots.default`:

```tsx
import { createPortalSlot } from '@reause/core'

const [PortalSlot, SlotTarget] = createPortalSlot()

function App() {
  return (
    <>
      <PortalSlot>
        {({ $slots }) => (
          <div>
            {/* To render the children */}
            {$slots.default()}
          </div>
        )}
      </PortalSlot>

      <SlotTarget>
        <div>Some content</div>
      </SlotTarget>
      <SlotTarget>
        <div>Another content</div>
      </SlotTarget>
    </>
  )
}
```

## Type Declarations

```ts
type ObjectLiteralWithPotentialObjectLiterals = Record<
  string,
  Record<string, any> | undefined
>
type GenerateSlotsFromSlotMap<
  T extends ObjectLiteralWithPotentialObjectLiterals,
> = {
  [K in keyof T]: (props?: T[K]) => ReactNode
}
export type PortalSlotComponent<
  Bindings extends Record<string, any>,
  MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals,
> = ComponentType<{
  /**
   * The template to capture — a function receiving the bindings passed to `<SlotTarget>` plus
   * `$slots` (a function returning the `<SlotTarget>`'s children, the React equivalent of
   * upstream's `$slots.default`).
   */
  children?: (
    bindings: Bindings & {
      $slots: GenerateSlotsFromSlotMap<MapSlotNameToSlotProps>
    },
  ) => ReactNode
}>
export type SlotTargetComponent<Bindings extends Record<string, any>> =
  ComponentType<
    Bindings & {
      /**
       * Children passed to `<SlotTarget>` — exposed to the template as `$slots.default` (React's single
       * slot, mirroring upstream's default slot).
       */
      children?: ReactNode
    }
  >
export type PortalSlotPair<
  Bindings extends Record<string, any>,
  MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals,
> = [
  PortalSlotComponent<Bindings, MapSlotNameToSlotProps>,
  SlotTargetComponent<Bindings>,
] & {
  define: PortalSlotComponent<Bindings, MapSlotNameToSlotProps>
  reuse: SlotTargetComponent<Bindings>
}
export interface CreatePortalSlotOptions<Bindings extends Record<string, any>> {
  /**
   * Restrict the props forwarded from `<SlotTarget>` to the template.
   *
   * Upstream declares Vue runtime props (`ComponentObjectPropsOptions`); React has no runtime props
   * declaration, so this is a list of prop keys instead — only these are passed to the template as
   * bindings and the rest are dropped. When omitted, every prop except `children` is forwarded.
   * `children` is reserved by the components and excluded from the accepted keys.
   *
   * @default undefined (all props forwarded)
   */
  props?: readonly Exclude<keyof Bindings, "children">[]
  /**
   * Name for the target (reuse) component, useful for devtools. Both components get
   * `${name}.define` / `${name}.reuse` display names, exactly like upstream.
   *
   * @default 'PortalSlot'
   */
  name?: string
  /**
   * Accepted for API parity with upstream; React has no attribute-inheritance system (props never
   * fall through to a root element), so it has no runtime effect.
   *
   * @default true
   */
  inheritAttrs?: boolean
}
/**
 * Map from @vueuse/core `createReusableTemplate`
 * (`source/vueuse/packages/core/createReusableTemplate/`).
 *
 * @see https://vueuse.org/core/createReusableTemplate/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const [PortalSlot, SlotTarget] = createPortalSlot<{ msg: string }>()
 *
 * function App() {
 *   return (
 *     <>
 *       <PortalSlot>{({ msg }) => <div>Hello {msg}</div>}</PortalSlot>
 *       <SlotTarget msg="World" />
 *     </>
 *   )
 * }
 */
export declare function createPortalSlot<
  Bindings extends Record<string, any>,
  MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals =
    Record<"default", undefined>,
>(
  options?: CreatePortalSlotOptions<Bindings>,
): PortalSlotPair<Bindings, MapSlotNameToSlotProps>
```
