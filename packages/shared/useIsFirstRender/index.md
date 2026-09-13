---
category: Lifecycle
---

# useIsFirstRender

`true` on the very first render of a component instance and `false` on every render after it — a React port of `@mantine/hooks`' `useIsFirstRender` (upstream mapping file: `source/mantine/packages/@mantine/hooks/src/use-is-first-render/use-is-first-render.ts`, 12 LOC; upstream docs [`use-is-first-render`](https://mantine.dev/hooks/use-is-first-render/) — fetched and verified — describe it as "Detects if the component is rendered for the first time").

## Usage

```tsx
import { useIsFirstRender } from '@reause/shared'
import { useEffect } from 'react'

function Query() {
  const isFirstRender = useIsFirstRender()

  useEffect(() => {
    // skip the mount render, then react to every change after it
    if (!isFirstRender)
      refetch()
  }, [deps])
}
```

The returned value is a plain `boolean`, not a ref or a state pair, so it can be read directly during render.

The flag belongs to one component instance, not to the module: two sibling components are each on their own first render, and an unmount followed by a remount starts over with `true`, because the underlying ref is created fresh with the instance.

The ref is read and flipped during the render phase, deliberately, and that is upstream's design rather than an oversight. The value has to be correct in the same render pass that reads it — a consumer that branches on `isFirstRender` inside its own effect needs that effect to be skipped on the mount commit — so deferring the flip to an effect would make the hook one render late for every caller. The write is idempotent per instance, which is what keeps a render-phase write safe here.

Under `<StrictMode>` the mount render reports `false`, not `true` (measured, React 19.2.8). StrictMode double-invokes the mount render and both passes share the same ref, so the first pass observes `true` and flips it, the second pass already reads `false`, and React commits the second pass — the `true` is discarded. This is upstream's behaviour, mirrored on purpose; the hook stays StrictMode-safe (nothing is invented, no state is written during render), but it is not StrictMode-invisible. Production builds, where the render runs once, report `true` correctly. React treats this as inherent to a render-phase flag rather than a bug to fix (facebook/react#24527). If the distinction has to survive StrictMode, gate on a value change instead (`useWhenever`) or hold an explicit ref guard in your own effect.
