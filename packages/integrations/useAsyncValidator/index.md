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
