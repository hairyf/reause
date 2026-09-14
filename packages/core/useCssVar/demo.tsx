import type { CSSProperties } from 'react'
import { useCssVar } from '@reause/core'
import { useRef, useState } from 'react'

export default function UseCssVarDemo() {
  // DOM targets are React refs — the hook resolves the ref when its read
  // effect runs, so a `useRef` populated at commit time is picked up
  const el = useRef<HTMLDivElement | null>(null)
  const [color, setColor] = useCssVar('--color', el)

  function switchColor() {
    setColor(current => (current === '#df8543' ? '#7fa998' : '#df8543'))
  }

  const elv = useRef<HTMLDivElement | null>(null)
  const [key, setKey] = useState('--color')
  const [colorVal] = useCssVar(key, elv)

  function changeVar() {
    setKey(current => (current === '--color' ? '--color-one' : '--color'))
  }

  return (
    <div>
      <div ref={el} style={{ '--color': '#7fa998', 'color': 'var(--color)' } as CSSProperties}>
        {`Sample text, ${color}`}
      </div>
      <button onClick={switchColor}>
        Change Color
      </button>
      <div ref={elv} style={{ '--color': '#7fa998', '--color-one': '#df8543', 'color': colorVal } as CSSProperties}>
        {`Sample text, ${key}: ${colorVal}`}
      </div>
      <button onClick={changeVar}>
        Change Color Variable
      </button>
    </div>
  )
}
