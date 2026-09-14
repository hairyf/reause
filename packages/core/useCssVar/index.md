---
category: Browser
---

# useCssVar

Manipulate CSS variables

## Usage

```tsx
import { useCssVar } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)
const [color1, setColor1] = useCssVar('--color', el)
// force a re-render (e.g. with your own state) once `el` is populated

const [key] = useState('--color')
const [colorVal, setColorVal] = useCssVar(key, el)

const [color2, setColor2] = useCssVar('--color', el, { initialValue: '#eee' })
setColor2(null) // removes the --color property from the element
```
