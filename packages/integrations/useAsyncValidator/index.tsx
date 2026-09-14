import type { Rules, ValidateError, ValidateOption } from 'async-validator'
import Schema from 'async-validator'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// async-validator publishes an ESM/CJS interop shape where the schema class can
// sit on `default` (e.g. when the CJS build is loaded in SSR). The interop line
// is kept verbatim from upstream; the cast is required because the published
// types declare only the class itself, not the `default` property.
const AsyncValidatorSchema: typeof Schema = (Schema as unknown as { default?: typeof Schema }).default || Schema

export type AsyncValidatorError = Error & {
  errors: ValidateError[]
  fields: Record<string, ValidateError[]>
}

export interface UseAsyncValidatorExecuteReturn {
  pass: boolean
  errors: ValidateError[]
  errorInfo: AsyncValidatorError | null
  errorFields: Record<string, ValidateError[]>
}

export interface UseAsyncValidatorReturn {
  pass: boolean
  isFinished: boolean
  errors: ValidateError[]
  errorInfo: AsyncValidatorError | null
  errorFields: Record<string, ValidateError[]>
  execute: () => Promise<UseAsyncValidatorExecuteReturn>
}

export interface UseAsyncValidatorOptions {
  /**
   * @see https://github.com/yiminghe/async-validator#options
   */
  validateOption?: ValidateOption
  /**
   * The validation will be triggered right away for the first time. Only works when `manual` is not
   * set to true.
   *
   * @default true
   */
  immediate?: boolean
  /**
   * If set to true, the validation will not be triggered automatically.
   */
  manual?: boolean
}

interface LiveState {
  pass: boolean
  isFinished: boolean
  errorInfo: AsyncValidatorError | null
}

/**
 * Map from @vueuse/integrations `useAsyncValidator`
 * (`source/vueuse/packages/integrations/useAsyncValidator/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const { pass, isFinished, errors, errorFields, execute } = useAsyncValidator(
 *   form,
 *   { name: { type: 'string', min: 5, max: 20 }, age: { type: 'number' } },
 * )
 * // `pass` becomes true once the initial validation resolves
 *
 * @see https://vueuse.org/useAsyncValidator
 * @see https://github.com/yiminghe/async-validator
 */
export function useAsyncValidator(
  value: Record<string, any>,
  rules: Rules,
  options?: UseAsyncValidatorOptions,
): UseAsyncValidatorReturn & PromiseLike<UseAsyncValidatorReturn> {
  const {
    validateOption = {},
    immediate = true,
    manual = false,
  } = options || {}

  const valueValue = value
  const rulesValue = rules

  const [errorInfo, setErrorInfo] = useState<AsyncValidatorError | null>(null)
  const [isFinished, setIsFinished] = useState(true)
  const [pass, setPass] = useState(!immediate || manual)

  const validator = useMemo(() => new AsyncValidatorSchema(rulesValue), [rulesValue])

  // latest-value mirrors synced every render so the stable `execute` closure
  // always reads the newest inputs (house pattern)
  const valueRef = useRef(value)
  valueRef.current = value
  const validatorRef = useRef(validator)
  validatorRef.current = validator
  const validateOptionRef = useRef(validateOption)
  validateOptionRef.current = validateOption

  // live mirror of the exposed state — the shell getters read this so a
  // captured object (e.g. the value an `await useAsyncValidator(...)` resolves
  // to) still exposes fresh values. `execute` updates it synchronously
  // (upstream refs are synchronous too; React state only commits on the next
  // render) and the render body re-syncs it after every commit. `errorInfo` is
  // mirrored as well because React bails out of a `setErrorInfo(null)` that
  // follows a previous `null` (clearing a resolved error would otherwise never
  // re-render and the getters would keep serving the stale error).
  const liveRef = useRef<LiveState>({ pass, isFinished, errorInfo })
  liveRef.current.pass = pass
  liveRef.current.isFinished = isFinished
  liveRef.current.errorInfo = errorInfo

  const mountedRef = useRef(true)
  // synchronous mirror of `isFinished` — React state updates are async, so
  // `waitUntilFinished` must not race the commit
  const finishedRef = useRef(isFinished)
  const waitersRef = useRef<Array<{ resolve: (value: UseAsyncValidatorReturn) => void }>>([])

  const execute = useCallback(async (): Promise<UseAsyncValidatorExecuteReturn> => {
    finishedRef.current = false
    liveRef.current.pass = false
    liveRef.current.isFinished = false
    setPass(false)
    setIsFinished(false)

    let nextPass = false
    let nextErrorInfo: AsyncValidatorError | null = null

    try {
      await validatorRef.current.validate(valueRef.current, validateOptionRef.current)
      nextPass = true
      nextErrorInfo = null
    }
    catch (err) {
      nextErrorInfo = err as AsyncValidatorError
    }

    const result: UseAsyncValidatorExecuteReturn = {
      pass: nextPass,
      errorInfo: nextErrorInfo,
      errors: nextErrorInfo?.errors || [],
      errorFields: nextErrorInfo?.fields || {},
    }

    // an unmounted component must not be mutated (the promise may outlive it)
    if (!mountedRef.current)
      return result

    finishedRef.current = true
    liveRef.current.pass = nextPass
    liveRef.current.isFinished = true
    liveRef.current.errorInfo = nextErrorInfo
    setPass(nextPass)
    setErrorInfo(nextErrorInfo)
    setIsFinished(true)

    return result
  }, [])

  // upstream runs the validation from `watch(..., { immediate })` during setup;
  // React runs it from an effect. The effect deliberately has NO dependency
  // array: `value`/`rules` are usually re-created by the caller on every render,
  // so keying the effect on those identities would re-validate on every render
  // and loop (the validation itself updates state). Instead the last validated
  // identities are kept in refs and the validation runs only when they change —
  // there is no deep observation to hook into (see the JSDoc note above).
  const lastValueRef = useRef(valueValue)
  const lastRulesRef = useRef(rulesValue)
  const hasAutoRunRef = useRef(false)
  useEffect(() => {
    if (manual)
      return
    const first = !hasAutoRunRef.current
    const changed = first
      || lastValueRef.current !== valueValue
      || lastRulesRef.current !== rulesValue
    if (!changed)
      return
    hasAutoRunRef.current = true
    lastValueRef.current = valueValue
    lastRulesRef.current = rulesValue
    // `immediate` only governs the first automatic run
    if (first && !immediate)
      return
    void execute()
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // the base shell is deliberately NOT a thenable — the waiters resolve with
  // this plain object (the `then` lives on the composite below) so promise
  // resolution can never re-adopt `then`
  const baseRef = useRef<UseAsyncValidatorReturn>(undefined as unknown as UseAsyncValidatorReturn)

  const base: UseAsyncValidatorReturn = {
    get pass() {
      return liveRef.current.pass
    },
    get isFinished() {
      return liveRef.current.isFinished
    },
    get errorInfo() {
      return liveRef.current.errorInfo
    },
    get errors() {
      return liveRef.current.errorInfo?.errors || []
    },
    get errorFields() {
      return liveRef.current.errorInfo?.fields || {}
    },
    execute,
  }
  baseRef.current = base

  const waitUntilFinished = useCallback((): Promise<UseAsyncValidatorReturn> => {
    return new Promise<UseAsyncValidatorReturn>((resolve) => {
      if (finishedRef.current) {
        resolve(baseRef.current)
        return
      }
      waitersRef.current.push({ resolve })
    })
  }, [])

  // resolve `await useAsyncValidator(...)` waiters once a validation cycle
  // finished
  useEffect(() => {
    if (!isFinished)
      return
    const waiters = waitersRef.current
    waitersRef.current = []
    waiters.forEach(waiter => waiter.resolve(baseRef.current))
  }, [isFinished])

  // the composite shell is built via `Object.create` (NOT object spread —
  // spread materializes accessor values into dead data properties, which would
  // freeze the members to the values captured at render time) so every member
  // stays a live getter over the live refs
  const shell = Object.create(base) as UseAsyncValidatorReturn & PromiseLike<UseAsyncValidatorReturn>
  shell.then = function then<TResult1 = UseAsyncValidatorReturn, TResult2 = never>(
    onFulfilled?: ((value: UseAsyncValidatorReturn) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return waitUntilFinished().then(onFulfilled, onRejected)
  }

  return shell
}
