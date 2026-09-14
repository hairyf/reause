---
category: Reactivity
related: syncStates
---

# syncState

Two-way state synchronization between two writable `State<T>` sources

## Usage

```tsx
import { syncState } from '@reause/shared'
import { useState } from 'react'

function App() {
  const [a, setA] = useState('a')
  const [b, setB] = useState('b')

  const stop = syncState(
    { value: a, onChange: setA },
    { value: b, onChange: setB },
  )

  console.log(a) // a

  setB('foo') // then the component re-renders

  console.log(a) // foo

  setA('bar') // then the component re-renders

  console.log(b) // bar

  // stop()
}
```

### One directional

```tsx
import { syncState } from '@reause/shared'

// right follows left
const stopLTR = syncState(
  { value: a, onChange: setA },
  { value: b, onChange: setB },
  { direction: 'ltr' },
)

// left follows right
const stopRTL = syncState(
  { value: a, onChange: setB },
  { value: b, onChange: setA },
  { direction: 'rtl' }
)
```

### Custom Transform

```tsx
import { syncState } from '@reause/shared'
import { useState } from 'react'

const [a, setA] = useState(10)
const [b, setB] = useState(2)

const stop = syncState(
  { value: a, onChange: setA },
  { value: b, onChange: setB },
  {
    transform: {
      ltr: left => left * 2,
      rtl: right => right / 2,
    },
  }
)

console.log(a) // 10
console.log(b) // 20
```
