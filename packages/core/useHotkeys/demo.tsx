import { getHotkeyHandler, useHotkeys } from '@reause/core'
import { useState } from 'react'

export default function UseHotkeysDemo() {
  const [lastHotkey, setLastHotkey] = useState('none')
  const [count, setCount] = useState(0)
  const [draft, setDraft] = useState('')
  const [submitted, setSubmitted] = useState('nothing yet')

  useHotkeys([
    ['mod+k', () => setLastHotkey('mod+k')],
    ['mod+j', () => setLastHotkey('mod+j')],
    ['alt+shift+l', () => setLastHotkey('alt+shift+l')],
    ['ArrowUp', () => setCount(value => value + 1)],
    ['ArrowDown', () => setCount(value => value - 1)],
  ])

  return (
    <div>
      <p>
        Global hotkeys —
        {' '}
        <code>mod+k</code>
        ,
        {' '}
        <code>mod+j</code>
        ,
        {' '}
        <code>alt+shift+l</code>
        ,
        {' '}
        <code>ArrowUp</code>
        {' / '}
        <code>ArrowDown</code>
        .
      </p>
      <p>
        Last hotkey:
        {' '}
        <strong>{lastHotkey}</strong>
        {' — counter: '}
        <strong>{count}</strong>
      </p>
      <p>
        Typing in a field is ignored by those global hotkeys, but an element-scoped
        {' '}
        <code>mod+Enter</code>
        {' still fires: '}
        <input
          type="text"
          placeholder="type, then press mod+Enter"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={getHotkeyHandler([['mod+Enter', () => setSubmitted(draft || '(empty)')]])}
        />
      </p>
      <p>
        Submitted:
        {' '}
        <strong>{submitted}</strong>
      </p>
    </div>
  )
}
