// A binding alias rather than a bare re-export statement, deliberately: the
// provenance generator (`scripts/update.ts`) discovers a page's exports by
// matching top-level function and const declarations in this file, so a bare
// re-export statement is invisible to it and the generated `meta/functions.md`
// row would silently disappear. `useSpringUpstream` IS the upstream binding, so
// `useSpring === useSpringUpstream` — an alias, not a wrapper — and
// `index.test.tsx` asserts that identity directly.
import { useSpring as useSpringUpstream } from '@react-spring/web'

/**
 * Re-export of `useSpring` from [`@react-spring/web`](https://github.com/pmndrs/react-spring) —
 * a pure re-export, not a port. The exported binding is the upstream function
 * object itself: reause adds no wrapper around it, and the upstream signature,
 * overloads, defaults and return shape are untouched.
 *
 * Map from @react-spring/web `useSpring`
 *
 * `useSpring` animates a value from its current state towards the props in
 * `to`, returning a `SpringValues` object that is passed straight to an
 * `animated` element's `style` prop. Given a function plus a dependency array
 * it instead returns the `[springs, api]` tuple, exactly as upstream documents.
 * The `animated` component — and the rest of the `@react-spring/web` surface —
 * is deliberately out of scope here; import it from the upstream package.
 *
 * `@react-spring/web` is an **optional peer dependency** of
 * `@reause/integrations` (declared as `^10` and marked optional under
 * `peerDependenciesMeta`), so this package stays installable without it and
 * pulls in no spring physics unless you ask for it.
 *
 * Upstream note: `@react-spring/web` v10 does not define this hook itself — its
 * bundle re-exports it from `@react-spring/core` (see
 * `@react-spring/web/dist/react-spring_web.modern.mjs`, which contains the
 * star re-export of `@react-spring/core`), so this binding is also the same
 * function object as `@react-spring/core`'s. The import path used here is the
 * one consumers are meant to use.
 *
 * @example
 * import { animated } from '@react-spring/web'
 * import { useSpring } from '@reause/integrations'
 *
 * const styles = useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })
 * return <animated.div style={styles}>Hello World</animated.div>
 *
 * @see https://www.react-spring.dev/docs/components/use-spring
 */
export const useSpring = useSpringUpstream
