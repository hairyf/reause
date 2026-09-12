import type { ReactNode } from 'react'
import { useError } from '@reause/shared'
import { Component, useState } from 'react'

/** The demo needs a boundary of its own, otherwise the throw blanks the page. */
class DemoErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message }
  }

  render() {
    if (this.state.message !== null)
      return <p>{`caught by the Error Boundary: ${this.state.message}`}</p>

    return this.props.children
  }
}

function ThrowButton() {
  const dispatchError = useError()
  const [count, setCount] = useState(0)

  return (
    <div>
      <button
        onClick={() => {
          setCount(n => n + 1)
          dispatchError(new Error(`boom #${count + 1}`))
        }}
      >
        throw an error
      </button>
      <span>
        clicked
        {' '}
        {count}
        {' '}
        times
      </span>
    </div>
  )
}

export default function UseErrorDemo() {
  return (
    <DemoErrorBoundary>
      <ThrowButton />
    </DemoErrorBoundary>
  )
}
