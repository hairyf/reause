---
category: '@Integrations'
---

# useAsyncValidator

Wrapper for [`async-validator`](https://github.com/yiminghe/async-validator).

## Install

```bash
npm i async-validator@^4
```

## Usage

```tsx
import type { Rules } from 'async-validator'
import { useAsyncValidator } from '@reause/integrations'
import { useState } from 'react'

const rules: Rules = {
  name: { type: 'string', min: 5, max: 20, required: true },
  age: { type: 'number', required: true },
  email: [{ type: 'email', required: true }],
}

function Demo() {
  const [form, setForm] = useState({ name: '', age: '', email: '' })
  // pass a STABLE object (state/ref/memo) — see the note below
  const { pass, isFinished, errorFields } = useAsyncValidator(form, rules)

  return (
    <form>
      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      {errorFields.name?.length ? <div>{errorFields.name[0].message}</div> : null}
      <button disabled={!pass}>Submit</button>
      {isFinished ? null : <span>validating…</span>}
    </form>
  )
}
```

## Type Declarations

```ts
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
export declare function useAsyncValidator(
  value: Record<string, any>,
  rules: Rules,
  options?: UseAsyncValidatorOptions,
): UseAsyncValidatorReturn & PromiseLike<UseAsyncValidatorReturn>
```
