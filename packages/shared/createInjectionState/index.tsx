import type { Context, PropsWithChildren, ReactNode } from 'react'
import { createContext, useContext } from 'react'

export interface CreateInjectionStateOptions<Return> {
  /**
   * Custom injectionKey for InjectionState — the React equivalent of upstream's string/symbol key.
   * React keys a context by object identity, so pass a `createContext(...)` instance; consumers may
   * then read it directly with `useContext`.
   */
  injectionKey?: Context<Return | undefined>
  /**
   * Default value used by `useInjectedState` when no provider is rendered above the consumer.
   * Implemented natively through `createContext`; when a custom `injectionKey` is supplied, that
   * context's own default is used instead.
   */
  defaultValue?: Return
}

export type CreateInjectionStateProvider<Props extends object, ProvideReturn = ReactNode> = (props: PropsWithChildren<Props>) => ProvideReturn

export type CreateInjectionStateReturn<Props extends object, ProvideReturn, InjectReturn> = Readonly<[
  /**
   * Render this component to create and provide the state to its descendants.
   */
  Provider: CreateInjectionStateProvider<Props, ProvideReturn>,
  /**
   * Call this hook in a consumer component to inject the state.
   */
  useInjectedState: () => InjectReturn,
]>

/**
 * Create a state that can be injected into descendant components — React
 * port of VueUse's `createInjectionState`.
 *
 * Map from @vueuse/shared `createInjectionState`
 * Mapping: React has no provide/inject pair, so the providing side becomes a component and the
 * state travels through a React Context created by the factory (or supplied through
 * `options.injectionKey`). Slot 0 of the returned tuple is `Provider` — render it (it may wrap
 * children) and the composable runs during its render, exactly once per render, with the props
 * passed to it. Slot 1 is `useInjectedState`, which reads the nearest `Provider` above the calling
 * component with `useContext`. Because JSX can only pass a single props object, the factory
 * receives one object — upstream's `(initialValue: number) =>...` becomes `({ initialValue }: {
 * initialValue: number }) =>...`.
 *
 * The second type parameter (`ProvideReturn`) is upstream's `useProvidingState` return slot, which
 * in this port is the provider component's render output (`ReactNode`).
 *
 * Deviations from upstream:
 * - `options.injectionKey` takes a React `Context` instead of a string/symbol
 *   key: React keys a context by object identity, so the factory's own
 *   `Context` is the default key and a custom context can be shared with a
 *   plain `useContext`.
 * - The providing side is a component (`Provider`) rather than a callable
 *   `useProvidingState`: React cannot provide during a hook call of the same
 *   component that consumes it.
 * - The factory takes a single props object instead of variadic arguments.
 * - `children` is a reserved prop: it is consumed by `Provider` for rendering
 *   and is not forwarded to the factory.
 *
 * @see https://vueuse.org/createInjectionState
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const [CounterStoreProvider, useCounterStore] = createInjectionState(
 *   ({ initialValue }: { initialValue: number }) => {
 *     const [count, setCount] = useState(initialValue)
 *     return { count, inc: () => setCount(c => c + 1) }
 *   },
 * )
 *
 * function Counter() {
 *   const { count, inc } = useCounterStore()!
 *   return <button onClick={inc}>{count}</button>
 * }
 *
 * <CounterStoreProvider initialValue={0}>
 *   <Counter />
 * </CounterStoreProvider>
 */
export function createInjectionState<Props extends object, Return>(
  composable: (props: Props) => Return,
  options: { defaultValue: Return } & CreateInjectionStateOptions<Return>,
): CreateInjectionStateReturn<Props, ReactNode, Return>
export function createInjectionState<Props extends object, Return>(
  composable: (props: Props) => Return,
  options?: CreateInjectionStateOptions<Return>,
): CreateInjectionStateReturn<Props, ReactNode, Return | undefined>
export function createInjectionState<Props extends object, Return>(
  composable: (props: Props) => Return,
  options?: CreateInjectionStateOptions<Return>,
): CreateInjectionStateReturn<Props, ReactNode, Return | undefined> {
  const InjectionContext = options?.injectionKey ?? createContext<Return | undefined>(options?.defaultValue)

  function Provider(props: PropsWithChildren<Props>): ReactNode {
    const { children, ...rest } = props
    // the composable runs during the provider's render, so any hooks it calls
    // follow the Rules of Hooks
    const state = composable(rest as Props)
    return <InjectionContext.Provider value={state}>{children}</InjectionContext.Provider>
  }

  Provider.displayName = composable.name ? `${composable.name}Provider` : 'InjectionStateProvider'

  const useInjectedState = (): Return | undefined => useContext(InjectionContext)

  return [Provider, useInjectedState]
}
