import type { ComponentType, ReactNode } from 'react'
import { makeDestructurable, objectPick } from '@reause/shared'

type ObjectLiteralWithPotentialObjectLiterals = Record<string, Record<string, any> | undefined>

type GenerateSlotsFromSlotMap<T extends ObjectLiteralWithPotentialObjectLiterals> = {
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
  children?: (bindings: Bindings & { $slots: GenerateSlotsFromSlotMap<MapSlotNameToSlotProps> }) => ReactNode
}>

export type SlotTargetComponent<
  Bindings extends Record<string, any>,
> = ComponentType<Bindings & {
  /**
   * Children passed to `<SlotTarget>` — exposed to the template as `$slots.default` (React's single
   * slot, mirroring upstream's default slot).
   */
  children?: ReactNode
}>

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
  props?: readonly (Exclude<keyof Bindings, 'children'>)[]
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
export function createPortalSlot<
  Bindings extends Record<string, any>,
  MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals = Record<'default', undefined>,
>(
  options: CreatePortalSlotOptions<Bindings> = {},
): PortalSlotPair<Bindings, MapSlotNameToSlotProps> {
  const { name = 'PortalSlot' } = options

  type SlotTargetProps = Bindings & { children?: ReactNode }
  type TemplateBindings = Bindings & { $slots: GenerateSlotsFromSlotMap<MapSlotNameToSlotProps> }
  type TemplateFn = (bindings: TemplateBindings) => ReactNode

  // Shared cell between the pair — the captured template, mirroring the
  // closure `shallowRef` of upstream's factory.
  const template: { current: TemplateFn | undefined } = { current: undefined }

  function PortalSlot({ children }: { children?: TemplateFn }): null {
    // Capture happens during render, exactly like upstream's define render
    // assigns `render.value = slots.default`. Idempotent under React's
    // double-invoked StrictMode renders.
    template.current = children
    return null
  }
  PortalSlot.displayName = `${name}.define`

  function SlotTarget(props: SlotTargetProps): ReactNode {
    if (!template.current) {
      // eslint-disable-next-line node/prefer-global/process -- browser package, no `require()` available; `typeof` keeps the reference safe in bundles that do not replace NODE_ENV
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')
        throw new Error('[reause] Failed to find the definition of the portal slot')
      return null
    }

    const { children, ...bindings } = props
    const forwarded: Record<string, any> = options.props == null
      ? camelizeKeys(bindings)
      : objectPick(bindings, [...options.props])

    return template.current({
      ...forwarded,
      $slots: { default: () => children } as GenerateSlotsFromSlotMap<MapSlotNameToSlotProps>,
    } as unknown as TemplateBindings)
  }
  SlotTarget.displayName = `${name}.reuse`

  return makeDestructurable(
    { define: PortalSlot, reuse: SlotTarget },
    [PortalSlot, SlotTarget],
  ) as PortalSlotPair<Bindings, MapSlotNameToSlotProps>
}

/**
 * `my-msg` → `myMsg`. Upstream camelizes attrs with `camelize` from `@vueuse/shared`; `camelize` is
 * deliberately unported in `@reause/shared` (only `hyphenate` exists there — see
 * `packages/shared/utils/index.tsx`, "port.ts (hyphenate only)"), so the helper is inlined here.
 */
function camelize(str: string): string {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
}

function camelizeKeys(obj: Record<string, any>): Record<string, any> {
  const newObj: Record<string, any> = {}
  for (const key in obj)
    newObj[camelize(key)] = obj[key]
  return newObj
}
