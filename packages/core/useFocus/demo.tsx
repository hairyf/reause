import type { CSSProperties } from 'react'
import { useFocus } from '@reause/core'
import { useRef } from 'react'

// Upstream VueUse demo.vue renders the focusable `<p>` with
// `class="demo-el px-2 rounded"` — only the paragraph carries extra inline
// spacing; the `<input>` / `<button>` inherit their look from the theme's
// `.react-demo input` / `.react-demo button` rules (demo.css).
const paragraphStyle: CSSProperties = {
  padding: '0.5rem',
  borderRadius: 4,
}

// Upstream `.demo-el:focus { opacity: 0.7; box-shadow: 0 0 2px 1px var(--vp-c-brand) }`
function focusStyle(focused: boolean): CSSProperties {
  return focused
    ? { opacity: 0.7, boxShadow: '0 0 2px 1px var(--vp-c-brand)' }
    : {}
}

export default function UseFocusDemo() {
  const text = useRef<HTMLParagraphElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  const [paragraphFocus, setParagraphFocus] = useFocus(text)
  const [inputFocus, setInputFocus] = useFocus(input, { initialValue: true })
  const [buttonFocus, setButtonFocus] = useFocus(button)

  return (
    <div>
      <p
        ref={text}
        tabIndex={0}
        style={{ ...paragraphStyle, ...focusStyle(paragraphFocus) }}
      >
        Paragraph that can be focused
      </p>
      <input
        ref={input}
        type="text"
        placeholder="Input that can be focused"
        style={focusStyle(inputFocus)}
      />
      <button
        ref={button}
        type="button"
        style={focusStyle(buttonFocus)}
      >
        Button that can be focused
      </button>
      <hr />
      <p className="mb-2">
        {paragraphFocus
          ? 'The paragraph has focus'
          : inputFocus
            ? 'The input control has focus'
            : buttonFocus
              ? 'The button has focus'
              : '\u00A0'}
      </p>
      <button
        type="button"
        className={`small ${paragraphFocus ? 'orange' : ''}`}
        onClick={() => { setParagraphFocus(prev => !prev) }}
      >
        Focus text
      </button>
      <button
        type="button"
        className={`small ${inputFocus ? 'orange' : ''}`}
        onClick={() => { setInputFocus(prev => !prev) }}
      >
        Focus input
      </button>
      <button
        type="button"
        className={`small ${buttonFocus ? 'orange' : ''}`}
        onClick={() => { setButtonFocus(prev => !prev) }}
      >
        Focus button
      </button>
    </div>
  )
}
