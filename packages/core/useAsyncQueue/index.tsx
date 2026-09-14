import { noop } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'

export type UseAsyncQueueTask<T> = (...args: any[]) => T | Promise<T>

type MapQueueTask<T extends any[]> = {
  [K in keyof T]: UseAsyncQueueTask<T[K]>
}

export interface UseAsyncQueueResult<T> {
  state: 'aborted' | 'fulfilled' | 'pending' | 'rejected'
  data: T | null
}

export interface UseAsyncQueueReturn<T> {
  /** Current pending task index. */
  activeIndex: number
  /** The tasks result — an array of `{ state, data }` entries. */
  result: T
}

export interface UseAsyncQueueOptions {
  /**
   * Interrupt tasks when current task fails.
   *
   * @default true
   */
  interrupt?: boolean

  /**
   * Trigger it when the tasks fails.
   */
  onError?: () => void

  /**
   * Trigger it when the tasks ends.
   */
  onFinished?: () => void

  /**
   * A AbortSignal that can be used to abort the task.
   */
  signal?: AbortSignal
}

/**
 * Map from @vueuse/core `useAsyncQueue`
 * (`source/vueuse/packages/core/useAsyncQueue/`).
 *
 * @example
 * const { activeIndex, result } = useAsyncQueue([p1, p2])
 *
 * @see https://vueuse.org/core/useAsyncQueue/
 */
export function useAsyncQueue<T extends any[], S = MapQueueTask<T>>(
  tasks: S & Array<UseAsyncQueueTask<any>>,
  options?: UseAsyncQueueOptions,
): UseAsyncQueueReturn<{ [P in keyof T]: UseAsyncQueueResult<T[P]> }> {
  const {
    interrupt = true,
    onError = noop,
    onFinished = noop,
    signal,
  } = options || {}

  // latest-value mirrors synced every render so the mount effect always reads
  // the newest tasks/options (house pattern)
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const interruptRef = useRef(interrupt)
  interruptRef.current = interrupt
  const signalRef = useRef(signal)
  signalRef.current = signal
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished

  const [activeIndex, setActiveIndex] = useState(-1)
  const [result, setResult] = useState<Array<UseAsyncQueueResult<any>>>(() =>
    // `tasks` may be nullish for a plain-JS caller — upstream no-ops instead
    // of throwing, so the initializer must not dereference it either
    createInitialResult(tasks?.length ?? 0),
  )

  // upstream runs the reduce chain synchronously during setup; here it starts
  // from a mount effect. React StrictMode (dev) mounts effects twice, so the
  // started ref keeps the queue running exactly once — the chain itself is
  // identical: sequential execution, `interrupt` stops after a failure,
  // `signal` aborts the current task via `Promise.race`.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current)
      return
    startedRef.current = true

    const queue = tasksRef.current
    if (!queue || queue.length === 0) {
      onFinishedRef.current()
      return
    }

    // local mirrors of the exposed state so the promise chain can read the
    // current index/result synchronously (React state updates are async)
    let index = -1
    let aborted = false
    let currentResult = createInitialResult(queue.length)

    function updateResult(state: UseAsyncQueueResult<any>['state'], res: unknown) {
      // once a task has been marked `aborted` no later promise resolution may
      // overwrite the queue state — e.g. an in-flight task resolving after the
      // abort (upstream stays "aborted" only by virtue of synchronous
      // reactivity; here React state is updated asynchronously, so the queue
      // itself must guard against it)
      if (aborted)
        return
      if (state === 'aborted')
        aborted = true
      index += 1
      currentResult = currentResult.map((item, i) =>
        i === index ? { state, data: res } : item,
      )
      setActiveIndex(index)
      setResult(currentResult)
    }

    queue.reduce<Promise<unknown>>((prev, curr) => {
      return prev
        .then((prevRes) => {
          if (signalRef.current?.aborted) {
            updateResult('aborted', new Error('aborted'))
            return undefined
          }

          if (currentResult[index]?.state === 'rejected' && interruptRef.current) {
            onFinishedRef.current()
            return undefined
          }

          const done = Promise.resolve(curr(prevRes)).then((currentRes) => {
            updateResult('fulfilled', currentRes)
            if (index === queue.length - 1)
              onFinishedRef.current()
            return currentRes
          })

          const queueSignal = signalRef.current
          if (!queueSignal)
            return done

          return Promise.race([done, whenAborted(queueSignal)])
        })
        .catch((e) => {
          if (signalRef.current?.aborted) {
            updateResult('aborted', e)
            return e
          }

          updateResult('rejected', e)
          onErrorRef.current()
          if (index === queue.length - 1)
            onFinishedRef.current()
          return e
        })
    }, Promise.resolve())
  }, [])

  return { activeIndex, result } as unknown as UseAsyncQueueReturn<{ [P in keyof T]: UseAsyncQueueResult<T[P]> }>
}

function createInitialResult(length: number): Array<UseAsyncQueueResult<any>> {
  return Array.from({ length }, () => ({ state: 'pending', data: null }))
}

function whenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const error = new Error('aborted')

    if (signal.aborted)
      reject(error)
    else
      signal.addEventListener('abort', () => reject(error), { once: true })
  })
}
