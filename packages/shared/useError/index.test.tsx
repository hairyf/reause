import type { ReactNode } from 'react'
import { Component } from 'react'
import { expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useError } from '../useError'

/**
 * The hook's whole purpose is a throw from the effect phase, so every
 * assertion about it runs against a real Error Boundary — asserting on
 * `dispatchError` alone would not prove the hook works. `onCaughtError` is
 * handed to `createRoot` so React's *own* report of the caught error is
 * captured instead of the default `console.error` logging: that keeps the
 * suite free of expected error noise and lets the tests assert React saw the
 * throw itself.
 */

interface ErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error) => void
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { message: string | null }> {
  state: { message: string | null } = { message: null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.message !== null)
      return <p>{`boundary caught: ${this.state.message}`}</p>

    return this.props.children
  }
}

interface ThrowOnDispatchProps {
  /** Appends one entry per render of the dispatching component. */
  onRender: () => void
  /** Records whether calling `dispatchError` returned normally or threw. */
  onDispatch: (result: 'returned' | 'threw') => void
}

function ThrowOnDispatch({ onRender, onDispatch }: ThrowOnDispatchProps) {
  const dispatchError = useError()
  onRender()

  return (
    <button
      onClick={() => {
        try {
          dispatchError(new Error('boom'))
          onDispatch('returned')
        }
        catch {
          onDispatch('threw')
        }
      }}
    >
      dispatch
    </button>
  )
}

function captureRootOptions(reactReported: unknown[]) {
  return { onCaughtError: (error: unknown) => reactReported.push(error) }
}

/** Renders a fresh boundary around a dispatching component. */
async function renderBoundary(reactReported: unknown[] = []) {
  const caught: Error[] = []

  const screen = await render(
    <ErrorBoundary onError={error => caught.push(error)}>
      <ThrowOnDispatch onRender={() => {}} onDispatch={() => {}} />
    </ErrorBoundary>,
    { createRootOptions: captureRootOptions(reactReported) },
  )

  return { caught, screen }
}

it('re-throws on the next render so the nearest Error Boundary catches it', async () => {
  const events: string[] = []
  const caught: Error[] = []
  const reactReported: unknown[] = []

  const screen = await render(
    <ErrorBoundary onError={error => caught.push(error)}>
      <ThrowOnDispatch
        onRender={() => events.push(`render:${events.filter(e => e.startsWith('render')).length + 1}`)}
        onDispatch={result => events.push(`dispatch:${result}`)}
      />
    </ErrorBoundary>,
    { createRootOptions: captureRootOptions(reactReported) },
  )

  // renders normally while no error has been dispatched
  await expect.element(screen.getByRole('button', { name: 'dispatch' })).toBeVisible()
  expect(screen.getByText(/^boundary caught:/).query()).toBeNull()
  expect(reactReported).toHaveLength(0)

  await screen.getByRole('button', { name: 'dispatch' }).click()

  // the boundary — not the dispatch call — is what surfaces the error
  await expect.element(screen.getByText('boundary caught: boom')).toBeVisible()
  await expect.poll(() => caught.length).toBe(1)
  await expect.poll(() => reactReported.length).toBeGreaterThan(0)

  expect(caught[0]?.message).toBe('boom')
  expect(reactReported[0]).toBeInstanceOf(Error)
  expect(screen.getByRole('button', { name: 'dispatch' }).query()).toBeNull()

  // the ordering is the proof: the dispatch call returned normally, and only
  // then did a second render happen — the throw came from that render's
  // effect, never from the dispatch itself
  const dispatchAt = events.indexOf('dispatch:returned')
  expect(events[0]).toBe('render:1')
  expect(dispatchAt).toBe(1)
  expect(events.slice(dispatchAt + 1)).toContain('render:2')
})

it('renders normally while no error has been dispatched', async () => {
  const reactReported: unknown[] = []

  const screen = await render(
    <ErrorBoundary>
      <ThrowOnDispatch onRender={() => {}} onDispatch={() => {}} />
    </ErrorBoundary>,
    { createRootOptions: captureRootOptions(reactReported) },
  )

  await expect.element(screen.getByRole('button', { name: 'dispatch' })).toBeVisible()
  expect(screen.getByText(/^boundary caught:/).query()).toBeNull()
  expect(reactReported).toHaveLength(0)
})

it('returns a referentially stable dispatcher across re-renders', async () => {
  const { result, rerender, unmount } = await renderHook((_props?: number) => useError())

  const first = result.current
  await rerender(1)
  await rerender(2)

  expect(result.current).toBe(first)
  await unmount()
})

it('is not one-shot: a different error catches in a fresh boundary too', async () => {
  const firstReport: unknown[] = []
  const first = await renderBoundary(firstReport)
  await first.screen.getByRole('button', { name: 'dispatch' }).click()
  await expect.element(first.screen.getByText('boundary caught: boom')).toBeVisible()
  await expect.poll(() => first.caught.length).toBe(1)
  await expect.poll(() => firstReport.length).toBeGreaterThan(0)
  await first.screen.unmount()

  const secondReport: unknown[] = []
  const second = await renderBoundary(secondReport)
  await second.screen.getByRole('button', { name: 'dispatch' }).click()
  await expect.element(second.screen.getByText('boundary caught: boom')).toBeVisible()
  await expect.poll(() => second.caught.length).toBe(1)
  await expect.poll(() => secondReport.length).toBeGreaterThan(0)
})
