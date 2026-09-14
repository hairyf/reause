---
category: Sensors
---

# useFocusReturn

Return focus to the element that was active before an overlay opened.

## Usage

```tsx
import { useFocusReturn } from '@reause/core'
import { useState } from 'react'

function Modal() {
  const [opened, setOpened] = useState(false)
  const returnFocus = useFocusReturn({ opened })

  return (
    <div>
      <button onClick={() => setOpened(true)}>Open</button>
      <input placeholder="Focus me before opening" />
      {opened && (
        <div>
          <input autoFocus placeholder="Inside the overlay" />
          <button onClick={() => setOpened(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
```

The hook returns a function — call it yourself to restore focus, or let it run on the close:

```tsx
const returnFocus = useFocusReturn({ opened })

returnFocus() // focus the element that was active before the overlay opened
```

`document.activeElement` is snapshotted when `opened` flips to `true`, and the restore is deferred by a 10 ms timeout after `opened` flips to `false` so the closing transition can finish first. When that timeout fires, focus is restored only if nothing else claimed it during the close: the current active element has to be `null`, `document.body` (the overlay unmounted and focus fell back) or the element that was already active when the close rendered. A deliberate focus change wins over the snapshot. Restoring uses `focus({ preventScroll: true })`, and pressing `Tab` clears the pending timeout so a user who tabs away keeps their own focus target.

Pass `shouldReturnFocus: false` to keep the snapshot but never restore automatically — the returned function still works:

```tsx
const returnFocus = useFocusReturn({ opened, shouldReturnFocus: false })
```

To place it next to its siblings: `useFocus` and `useFocusWithin` own an element you hand them and track its focus state, while this hook owns nothing and keeps no state — it only remembers the previously active element so it can hand it back.
