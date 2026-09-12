import { createMemo } from '@reause/shared'
import { useRef, useState } from 'react'

// Demo-only counter, incremented inside the memoised body: it grows only when
// `createMemo` misses — that is, when the *reference* of a raw argument changes.
let computations = 0

// the intended usage: the factory is called once, at module scope, and its
// result is a hook — hence the `useFullName` name
const useFullName = createMemo((first: string, last: string) => {
  computations += 1
  return `${first} ${last}`
})

function FullName({ first, last }: { first: string, last: string }) {
  // the hook call above may bump `computations`, so the value rendered here is
  // already the count for *this* render
  const fullName = useFullName(first, last)
  const renders = useRef(0)
  renders.current += 1

  return (
    <p>
      full name:
      {' '}
      <strong>{fullName}</strong>
      {' · renders: '}
      <strong>{renders.current}</strong>
      {' · memo computations: '}
      <strong>{computations}</strong>
    </p>
  )
}

export default function CreateMemoDemo() {
  const [first, setFirst] = useState('Ada')
  const [last, setLast] = useState('Lovelace')
  const [reRenders, setReRenders] = useState(0)

  return (
    <div>
      <FullName first={first} last={last} />
      <button onClick={() => setFirst(value => (value === 'Ada' ? 'Grace' : 'Ada'))}>
        change first name
      </button>
      {' '}
      <button onClick={() => setLast(value => (value === 'Lovelace' ? 'Hopper' : 'Lovelace'))}>
        change last name
      </button>
      {' '}
      <button onClick={() => setReRenders(prev => prev + 1)}>
        {`re-render with the same args (${reRenders})`}
      </button>
    </div>
  )
}
