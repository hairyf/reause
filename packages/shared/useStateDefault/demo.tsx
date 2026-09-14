import { useStateDefault } from '@reause/shared'
import { useState } from 'react'

export default function UseStateDefaultDemo() {
  // externally-controlled `{ value, onChange }` source — `value` reflects the
  // source's current value, falling back to the default while it is `undefined`
  const [raw, setRaw] = useState<string | null | undefined>(undefined)
  const [value, setValue] = useStateDefault({ value: raw, onChange: setRaw }, 'default')
  const [input, setInput] = useState('')

  const update = (next: string) => {
    setInput(next)
    setValue(next)
  }

  return (
    <div>
      <input
        type="text"
        value={input}
        placeholder="Type anything, then clear..."
        onChange={event => update(event.target.value)}
      />
      <p>
        Current:
        {' '}
        <strong>{value}</strong>
      </p>
      <p>
        Raw source (raw):
        {' '}
        {raw === undefined ? 'undefined' : raw}
      </p>
      <button
        onClick={() => {
          setInput('')
          setValue(undefined)
        }}
      >
        Clear
      </button>
      <p>
        While the source is undefined, the value falls back to the default.
      </p>
    </div>
  )
}
