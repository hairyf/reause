---
category: Reactivity
---

# useStateManualReset

A state with manual reset functionality.

## Usage

```tsx
import { useStateManualReset } from '@reause/shared'

const [message, setMessage, resetMessage] = useStateManualReset('default message')

setMessage('message has set')

resetMessage()

console.log(message) // 'default message'
```
