---
category: Animation
---

# useSpring

Re-export of `useSpring` from
[`@react-spring/web`](https://github.com/pmndrs/react-spring) — the upstream
hook itself, not a reimplementation. reause adds no wrapper: the same function
object is exported, with the upstream signature, overloads and return value
untouched. The `animated` component and the rest of the `@react-spring/web`
surface are deliberately out of scope — import them from the upstream package.

`@react-spring/web` is an optional peer dependency of `@reause/integrations`
(declared `^10`, verified against `v10.1.2`), so install it alongside reause:
`npm i @react-spring/web@^10`. It is optional because the package stays
installable, and pulls in no spring physics, unless a page actually imports this
hook.

Upstream sources read for this page: `@react-spring/web/dist/react-spring_web.modern.mjs`
(whose only hook-relevant statement is the star re-export of
`@react-spring/core` — `@react-spring/web` does not define `useSpring` itself)
and `@react-spring/core/dist/react-spring_core.modern.d.mts` (the three
`useSpring` overload declarations).

## Usage

```tsx
import { animated } from '@react-spring/web'
import { useSpring } from '@reause/integrations'

const styles = useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })

return <animated.div style={styles}>Hello World</animated.div>
```

Passing a function plus a dependency array selects upstream's other overload,
which returns the `[springs, api]` tuple instead of the bare `SpringValues`
object. The re-export preserves that exactly:

```tsx
const [styles, api] = useSpring(() => ({ opacity: 1 }), [])

api.start({ opacity: 0 })
```

The `animated` element above comes from `@react-spring/web`, not from reause —
see the upstream [useSpring reference](https://www.react-spring.dev/docs/components/use-spring)
for the full prop list (`from`, `to`, `loop`, `delay`, `immediate`, `reset`,
`reverse`, `pause`, `cancel`, `ref`, `config`, `events`).
