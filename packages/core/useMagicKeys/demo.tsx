import type { ReactNode } from 'react'
import { useMagicKeys } from '@reause/core'
import { useMemo } from 'react'

function Key({ value, children }: { value: boolean, children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'monospace',
        padding: '8px 16px',
        borderRadius: 4,
        ...(value
          ? { color: '#3eaf7c', backgroundColor: 'rgba(62, 175, 124, 0.15)' }
          : { opacity: 0.5, backgroundColor: 'rgba(107, 114, 128, 0.1)' }),
      }}
    >
      {children}
    </span>
  )
}

export default function UseMagicKeysDemo() {
  const { shift, r, e, a, s, u, v_u_e, u_s_e, current } = useMagicKeys()
  const keys = useMemo(() => Array.from(current), [current])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div>
        Press the following keys to test out
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Key value={r}>R</Key>
        <Key value={e}>e</Key>
        <Key value={a}>a</Key>
        <span style={{ width: 8 }} />
        <Key value={u}>U</Key>
        <Key value={s}>s</Key>
        <Key value={e}>e</Key>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Key value={shift}>Shift</Key>
        <Key value={v_u_e}>Vue</Key>
        <Key value={u_s_e}>Use</Key>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div>Keys Pressed</div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', minHeight: '1.5em', fontFamily: 'monospace' }}>
          {keys.map(key => (
            <code key={key}>{key}</code>
          ))}
        </div>
      </div>
    </div>
  )
}
