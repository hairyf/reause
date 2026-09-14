---
category: Reactivity
---

# useStateDefault

Apply default value to a ref

## Usage

```tsx
import { useStateDefault } from '@reause/shared'

const raw = { current: undefined as string | undefined }
const [value, setValue] = useStateDefault(raw, 'default')

setValue('hello')
// the derived value updates on the next render (React derives it at render)
console.log(value) // 'hello' after the next render
console.log(raw.current) // 'hello' (written through immediately)

setValue(undefined)
console.log(value) // 'default' after the next render

raw.current = 'from outside' // external control — picked up on the next render
```
