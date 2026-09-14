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
 * Map from @vueuse/shared `createInjectionState`.
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
