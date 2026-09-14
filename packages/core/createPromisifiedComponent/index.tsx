import type { ComponentType, ReactNode } from 'react'
import { Fragment, useSyncExternalStore } from 'react'

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

export type PromisifiedComponent<Return, Args extends any[] = []> = ComponentType<{
  /**
   * The template to render for each active promise instance — a render prop receiving the instance
   * props (the React equivalent of upstream's `v-slot`).
   */
  children: (props: PromisifiedComponentProps<Return, Args>) => ReactNode
}> & {
  start: (...args: Args) => Promise<Return>
}

/**
 * Creates a promisified component — React port of VueUse's `createTemplatePromise`.
 *
 * Map from @vueuse/core `createTemplatePromise`
 * (`source/vueuse/packages/core/createTemplatePromise/`). The factory returns
 * a component that renders one template instance per active promise: each `start(...)` call creates
 * an instance (with the passed args), mounts the template and returns a promise that settles when
 * the template calls `resolve` / `reject`. Once settled, the instance is removed and the template
 * unmounts automatically.
 *
 * React divergences:
 * - the template is a **children-as-function render prop** instead of a
 *   `v-slot`: the function receives the instance props (promise, resolve,
 *   reject, args, isResolving, options, key);
 * - the reactive instances list is backed by a `useSyncExternalStore` store in the factory closure,
 * so mutations from `start` / `resolve` / `reject` re-render the mounted templates;
 * - `resolve` / `reject` must be called from event handlers or effects, not
 *   during render (Vue's reactivity tolerates in-render mutation, React does
 *   not);
 * - `transition` is accepted for API parity but has no runtime effect — React
 *   has no built-in transition-group system;
 * - instances live in the factory closure, so an unmounted component does not
 *   settle its pending promises: they resolve once `resolve` is called, and
 *   re-mounting the component re-renders the remaining instances.
 *
 * SSR-safe: nothing touches `window` or the DOM during render — the instance list only gains
 * entries when `start()` is called (i.e. in effects or event handlers), so server renders are
 * empty.
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
export function createPromisifiedComponent<Return, Args extends any[] = []>(
  options: PromisifiedComponentOptions = {},
): PromisifiedComponent<Return, Args> {
  let index = 0
  const instances: PromisifiedComponentProps<Return, Args>[] = []

  // Snapshot + subscriber set backing the component's `useSyncExternalStore`,
  // so mutations outside React (start / resolve / reject) re-render the
  // mounted templates — upstream keeps the list in a `deepRef` instead.
  let snapshot: readonly PromisifiedComponentProps<Return, Args>[] = []
  const subscribers = new Set<() => void>()

  function emit() {
    subscribers.forEach(fn => fn())
  }

  function commit() {
    snapshot = [...instances]
    emit()
  }

  function subscribe(fn: () => void): () => void {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  }

  function getSnapshot() {
    return snapshot
  }

  function create(...args: Args) {
    const props = {
      key: index++,
      args,
      promise: undefined,
      resolve: () => {},
      reject: () => {},
      isResolving: false,
      options,
    } as PromisifiedComponentProps<Return, Args>

    props.promise = new Promise<Return>((_resolve, _reject) => {
      props.resolve = (v) => {
        props.isResolving = true
        commit()
        _resolve(v)
      }
      props.reject = _reject
    })
      .finally(() => {
        props.promise = undefined
        const index = instances.indexOf(props)
        if (index !== -1)
          instances.splice(index, 1)
        commit()
      })

    instances.push(props)
    commit()

    return props.promise
  }

  function start(...args: Args) {
    if (options.singleton && instances.length > 0)
      return instances[0].promise as Promise<Return>
    return create(...args)
  }

  function PromisifiedComponent({ children }: { children?: (props: PromisifiedComponentProps<Return, Args>) => ReactNode }): ReactNode {
    const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    return list.map(props => (
      <Fragment key={props.key}>
        {children?.(props)}
      </Fragment>
    ))
  }

  const component = PromisifiedComponent as PromisifiedComponent<Return, Args>
  component.start = start

  return component
}
