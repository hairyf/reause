---
category: Browser
---

# useCssSupports

SSR compatible and reactive [`CSS.supports`](https://developer.mozilla.org/docs/Web/API/CSS/supports_static)

## Usage

```tsx
import { useCssSupports } from '@reause/core'

const { isSupported } = useCssSupports('container-type', 'scroll-state')
```

Both the single-argument condition-text form and the property + value form are supported, and every input accepts a
string or a React ref:

```tsx
import { useCssSupports } from '@reause/core'
import { useState } from 'react'

const [property, setProperty] = useState('display')
const [value, setValue] = useState('flex')
const { isSupported: propValueSupported } = useCssSupports(property, value)

const condition = { current: 'selector(:has(a))' }
const { isSupported: conditionSupported } = useCssSupports(condition)
```

### Server Side Rendering

During SSR and before the mount effect runs, the result is `options.ssrValue` (default `false`), so the server-rendered
HTML matches the pre-hydration client render:

```tsx
const { isSupported } = useCssSupports('display: flex', { ssrValue: false })
```
