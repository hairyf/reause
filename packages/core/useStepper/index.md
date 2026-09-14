---
category: Utilities
---

# useStepper

Provides helpers for building a multi-step wizard interface.

## Usage

### Steps as array

```tsx
import { useStepper } from '@reause/core'

const {
  index,
  setIndex,
  steps,
  stepNames,
  current,
  next,
  previous,
  isFirst,
  isLast,
  goTo,
  goToNext,
  goToPrevious,
  goBackTo,
  isNext,
  isPrevious,
  isCurrent,
  isBefore,
  isAfter,
} = useStepper([
  'billing-address',
  'terms',
  'payment',
])

// Access the step through `current`
console.log(current) // 'billing-address'
```
