import type { RefCallback, RefObject } from 'react'
import type { ElementTarget } from '../useResizeObserver'
import { createRef } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { unrefElement } from '../unrefElement'

// Upstream's browser test also unwraps Vue component instances via `$el`;
// React has no component-instance analog (refs hold DOM nodes directly via
// `{ current }`), so those cases are intentionally not ported. Upstream's
// `unrefElement` also accepts a plain element / getter; reause binds DOM
// targets to React refs only, so those inputs are rejected at the type level.

describe('unrefElement', () => {
  it('should be defined', () => {
    expect(unrefElement).toBeDefined()
  })

  it('returns undefined for an empty ref', () => {
    expect(unrefElement({ current: null })).toBeUndefined()
    expect(unrefElement({ current: undefined })).toBeUndefined()
  })

  it('return the element if it is an element ref', async () => {
    const targetNodeRef = createRef<HTMLDivElement>()
    await render(
      <div>
        <div>Node 1</div>
        <div ref={targetNodeRef}>Node 2</div>
        <div>Node 3</div>
      </div>,
    )

    const unrefElementReturn = unrefElement(targetNodeRef)

    expect(unrefElementReturn).toBeInstanceOf(HTMLDivElement)
    expect(unrefElementReturn!.textContent).toBe('Node 2')
  })

  it('return null if the ref current is null', () => {
    const targetNodeRef = createRef<HTMLDivElement>()
    expect(targetNodeRef.current).toBeNull()
    expect(unrefElement(targetNodeRef)).toBeUndefined()
  })

  it('accepts only React ref objects, never plain elements or callback refs', () => {
    // A plain element, a getter and a callback ref are all rejected: the input
    // is a `RefObject` resolved to `.current`.
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<ElementTarget<HTMLElement>>()
    expectTypeOf<RefCallback<HTMLElement>>()
      .not
      .toMatchTypeOf<ElementTarget<HTMLElement>>()
    expectTypeOf<() => HTMLElement>()
      .not
      .toMatchTypeOf<ElementTarget<HTMLElement>>()
    // Positive control: a `{ current }` ref object is still accepted.
    expectTypeOf<RefObject<HTMLElement | null>>()
      .toMatchTypeOf<ElementTarget<HTMLElement>>()
    expectTypeOf<Parameters<typeof unrefElement<HTMLElement>>[0]>()
      .toEqualTypeOf<RefObject<HTMLElement | null | undefined>>()
  })
})
