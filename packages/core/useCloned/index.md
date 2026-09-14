---
category: Utilities
---

# useCloned

Reactive clone of a value. By default, it use `JSON.parse(JSON.stringify())` to do the clone

## Usage

```tsx
import { useCloned } from '@reause/core'

const [original, setOriginal] = useState({ key: 'value' })

const [cloned, setCloned, { isModified, sync }] = useCloned({
  value: original,
  onChange: setOriginal,
})

// on the next render `cloned` is the new state and `isModified` is true
setCloned({ key: 'some new value' })

console.log(cloned.key) // 'some new value' (next render)

sync() // re-clone from the source, isModified back to false
```

## Manual cloning

```tsx
import { useCloned } from '@reause/core'

const [original, setOriginal] = useState({ key: 'value' })

const [cloned, , { sync }] = useCloned(
  { value: original, onChange: setOriginal },
  { manual: true }
)

setOriginal({ key: 'manual' })

console.log(cloned.key) // 'value'

sync()

console.log(cloned.key) // 'manual'
```

## Custom Clone Function

Using [`klona`](https://www.npmjs.com/package/klona) for example:

```tsx
import { useCloned } from '@reause/core'
import { klona } from 'klona'

const [original, setOriginal] = useState({ key: 'value' })

const [cloned, , { isModified, sync }] = useCloned(
  { value: original, onChange: setOriginal },
  { clone: klona }
)
```
