import { useMask } from '@reause/core'

/**
 * Demos for `useMask`. Upstream's story is built on `TextInput` from
 * `@mantine/core`; the whole point of this port is that the hook returns a
 * callback ref for a **native** input, so these demos bind a plain `<input>`
 * and nothing else.
 */
export default function UseMaskDemo() {
  const phone = useMask({ mask: '(999) 999-9999' })
  const promo = useMask({
    mask: 'AAAA-9999',
    slotChar: 'XXXX-0000',
    transform: char => char.toUpperCase(),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 360 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>Phone number</span>
        <input ref={phone.ref} placeholder="(___) ___-____" />
        <small>
          Masked:
          {' '}
          {phone.value || '—'}
          {' · Raw: '}
          {phone.rawValue || '—'}
          {phone.isComplete ? ' · complete' : ''}
        </small>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>Promo code (auto-uppercase, hint placeholders)</span>
        <input ref={promo.ref} placeholder="XXXX-0000" />
        <small>
          {promo.isComplete ? 'Complete' : 'Typing…'}
          {' · Raw: '}
          {promo.rawValue || '—'}
        </small>
      </label>

      <div>
        <button
          type="button"
          onClick={() => {
            phone.reset()
            promo.reset()
          }}
        >
          Reset both
        </button>
      </div>
    </div>
  )
}
