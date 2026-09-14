/**
 * Map from @mantine/hooks `useMask` (`source/mantine/packages/@mantine/hooks/src/use-mask/`)
 *
 * The `useMask` input-masking hook, ported from `@mantine/hooks`' `use-mask`. The masking engine it
 * drives lives in the sibling `./engine` module — see the header there for why — and the engine's
 * public half (the hook's options and return types, `DEFAULT_TOKENS` and the four pure helpers) is
 * re-exported from this file, so those imports keep working while `meta/functions.md` only ever
 * sees `useMask` as this page's own export.
 *
 * Unlike upstream, the hook returns a callback `ref` bound to a **native** `<input>`: there is no
 * `@mantine/core` and no `TextInput` in this port, which is why `use-mask.story.tsx` (the upstream
 * demo, built on `TextInput`) is not mirrored.
 */
import type { MaskSlot, UndoState, UseMaskOptions, UseMaskReturnValue } from './engine'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyMaskToRaw,
  buildDisplayValue,
  checkComplete,
  extractRaw,
  findNextEditablePosition,
  findNextTokenIndex,
  findPrevTokenIndex,
  getResolvedOptions,
  MAX_UNDO_HISTORY,
  processInput,
} from './engine'

/**
 * Input masking hook: formats what the user types into `mask` and keeps the unmasked characters in
 * `rawValue`.
 *
 * The returned `ref` is a **callback ref** for a native `<input>`. Attaching it is what wires the
 * hook up: `refCallback` adds the `input`, `focus`, `blur`, `mousedown`, `mouseup`, `keydown` and
 * `paste` listeners to the node, initialises the field from whatever value the node already
 * carries, applies `aria-invalid`, and removes every listener again when React calls it with
 * `null`. The port deliberately stays on a native element — no `@mantine/core`, no `TextInput` — so
 * any input in any component tree can take it.
 *
 * The hook owns the field: `keydown`, `paste` and `input` are intercepted (`preventDefault` on the
 * two it fully handles), the value is rebuilt through the mask, and both the DOM `value` and the
 * caret are written back directly while the React state (`value` / `rawValue`) mirrors them. Typing
 * a character whose slot rejects it is a no-op rather than a rejected keystroke, and the caret
 * skips literals so it always lands on an editable slot.
 *
 * Undo/redo is a two-stack history of `UndoState` entries: `Ctrl/Cmd+Z` undoes, `Ctrl/Cmd+Shift+Z`
 * and `Ctrl+Y` redo, `reset` clears both stacks, and the undo stack is capped at `MAX_UNDO_HISTORY`
 * entries. Each push records the raw value and the current caret so undo restores the editing
 * position too.
 *
 * `alwaysShowMask` and `showMaskOnFocus` are separate switches: the first keeps the pattern visible
 * while the field is empty and unfocused, the second (true by default) is what reveals the
 * placeholders on focus. `autoClear` empties the field on blur while the mask is incomplete; even
 * without it, blurring a field whose raw content is empty clears the display it had shown on focus.
 *
 * `isComplete` reflects the committed value — it is recomputed during render from `processedRef`
 * rather than from the `maskedValue` state, so it stays in step with the DOM write in the same
 * commit.
 */
export function useMask(options: UseMaskOptions): UseMaskReturnValue {
  // Written during render on purpose: every handler below is a stable callback
  // that reads the options through this ref, so it always sees the props of the
  // latest render without the callbacks themselves being re-created (which
  // would churn the listener identity `refCallback` installs).
  const optionsRef = useRef(options)
  optionsRef.current = options

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [maskedValue, setMaskedValue] = useState('')
  const [rawValue, setRawValue] = useState('')
  // `processedRef` holds the masked value as it currently stands in the DOM,
  // which is *not* the raw value the name might suggest: it is the output of
  // `processInput` / `applyMaskToRaw`, complete with literals, and it may keep
  // placeholders when the field is focused with `showMaskOnFocus`.
  const processedRef = useRef('')
  const displayValueRef = useRef('')
  const rawValueRef = useRef('')
  const wasCompleteRef = useRef(false)
  const isFocusedRef = useRef(false)
  const undoStackRef = useRef<UndoState[]>([])
  const redoStackRef = useRef<UndoState[]>([])

  const getOptions = useCallback(() => {
    const opts = optionsRef.current
    return getResolvedOptions(opts, rawValue)
  }, [rawValue])

  /**
   * Commit one masked value everywhere at once: the refs, the React state, the DOM `value` and the
   * caret. `cursorPos` is clamped to the processed length and only applied while the element is
   * focused, so committing a value never steals the caret from somewhere else on the page.
   *
   * `onChangeRaw` fires on every notified commit, while `onComplete` fires only on the transition
   * into completeness — `wasCompleteRef` remembers the previous commit's verdict, so an
   * already-complete field is not re-announced on each further edit.
   */
  const applyValue = useCallback(
    ({
      reprocessed,
      newRaw,
      displayValue,
      resolvedSlots,
      cursorPos,
      notifyChange,
    }: {
      reprocessed: string
      newRaw: string
      displayValue: string
      resolvedSlots: MaskSlot[]
      cursorPos?: number
      notifyChange: boolean
    }) => {
      const opts = optionsRef.current

      processedRef.current = reprocessed
      displayValueRef.current = displayValue
      rawValueRef.current = newRaw
      setMaskedValue(displayValue)
      setRawValue(newRaw)

      if (inputRef.current) {
        inputRef.current.value = displayValue
        if (cursorPos !== undefined && document.activeElement === inputRef.current) {
          const pos = Math.min(cursorPos, reprocessed.length)
          inputRef.current.setSelectionRange(pos, pos)
        }
      }

      if (notifyChange && opts.onChangeRaw) {
        opts.onChangeRaw(newRaw, displayValue)
      }

      const complete = checkComplete(reprocessed, resolvedSlots)
      if (notifyChange && complete && !wasCompleteRef.current && opts.onComplete) {
        opts.onComplete(displayValue, newRaw)
      }
      wasCompleteRef.current = complete
    },
    [],
  )

  /**
   * Take a masked value, re-derive the raw characters from it, push the pair back through the mask
   * and commit the result.
   *
   * `getResolvedOptions` runs twice with different raw values on purpose: the first pair exists
   * only to recover the raw characters out of `newMasked` (`modify` is resolved against the same
   * value `extractRaw` will use), and the second re-resolves `modify` against that raw value, so a
   * per-keystroke override sees the post-edit raw string.
   *
   * Placeholders are shown when `alwaysShowMask` is set or the field is focused, and — unless
   * `showMaskOnFocus` was switched off — only for a field that already holds something.
   */
  const updateValue = useCallback(
    (newMasked: string, cursorPos?: number) => {
      const opts = optionsRef.current
      const { slots } = getResolvedOptions(
        opts,
        extractRaw(newMasked, getResolvedOptions(opts, '').slots),
      )
      const raw = extractRaw(newMasked, slots)

      const { slots: resolvedSlots, slotChar } = getResolvedOptions(opts, raw)

      const reprocessed = processInput(newMasked, resolvedSlots, slotChar)
      const newRaw = extractRaw(reprocessed, resolvedSlots)

      const showSlots = opts.alwaysShowMask || isFocusedRef.current
      const showOnFocus = opts.showMaskOnFocus !== false
      const shouldShowSlots = showSlots && (showOnFocus || reprocessed.length > 0)

      const displayValue = buildDisplayValue(reprocessed, resolvedSlots, slotChar, shouldShowSlots)

      applyValue({
        reprocessed,
        newRaw,
        displayValue,
        resolvedSlots,
        cursorPos,
        notifyChange: true,
      })

      return { displayValue, newRaw, reprocessed, resolvedSlots }
    },
    [applyValue],
  )

  /**
   * Adopt the value a node already carries — an uncontrolled input rendered with `defaultValue`, or
   * a server-rendered one — by running the same two-stage resolve as `updateValue`, then commit it
   * **without notifying**: attaching the ref is not a user edit, so `onChangeRaw` / `onComplete`
   * stay silent. Returns whether there was anything to adopt; `refCallback` uses that to decide
   * whether the empty-field mask still has to be painted.
   */
  const initializeInputValue = useCallback(
    (node: HTMLInputElement) => {
      const opts = optionsRef.current

      if (!node.value) {
        return false
      }

      const { slots: initialSlots, slotChar: initialSlotChar } = getResolvedOptions(opts, '')
      const initialProcessed = processInput(node.value, initialSlots, initialSlotChar)
      const initialRaw = extractRaw(initialProcessed, initialSlots)
      const { slots: resolvedSlots, slotChar } = getResolvedOptions(opts, initialRaw)
      const reprocessed = processInput(node.value, resolvedSlots, slotChar)
      const newRaw = extractRaw(reprocessed, resolvedSlots)
      const showSlots = opts.alwaysShowMask || isFocusedRef.current
      const showOnFocus = opts.showMaskOnFocus !== false
      const shouldShowSlots = showSlots && (showOnFocus || reprocessed.length > 0)
      const displayValue = buildDisplayValue(reprocessed, resolvedSlots, slotChar, shouldShowSlots)

      applyValue({
        reprocessed,
        newRaw,
        displayValue,
        resolvedSlots,
        notifyChange: false,
      })

      return true
    },
    [applyValue],
  )

  /**
   * Record the state an edit is about to replace. A push that would duplicate the top of the stack
   * is dropped, so holding a key or a no-op reformat does not fill the history with identical
   * entries. Any push discards the redo stack, which is what makes redo unavailable after a fresh
   * edit.
   */
  const pushUndoState = useCallback(() => {
    const input = inputRef.current
    const selectionStart = input?.selectionStart ?? rawValueRef.current.length
    const state: UndoState = {
      rawValue: rawValueRef.current,
      selectionStart,
    }
    const stack = undoStackRef.current
    const top = stack[stack.length - 1]
    if (top && top.rawValue === state.rawValue && top.selectionStart === state.selectionStart) {
      return
    }
    stack.push(state)
    if (stack.length > MAX_UNDO_HISTORY) {
      stack.shift()
    }
    redoStackRef.current = []
  }, [])

  /**
   * Replay an `UndoState`: re-mask its raw value and hand it to `updateValue` with the stored
   * caret, so undo restores both the content and the position.
   */
  const applyHistoryState = useCallback(
    (target: UndoState) => {
      const opts = optionsRef.current
      const { slots, slotChar, transform } = getResolvedOptions(opts, target.rawValue)
      const newMasked = applyMaskToRaw(target.rawValue, slots, slotChar, transform)
      updateValue(newMasked, target.selectionStart)
    },
    [updateValue],
  )

  /**
   * Rebuild the mask from a native `input` event by diffing the new DOM value against the last
   * display value: the common prefix and suffix cancel out, and whatever is left in the middle is
   * the inserted text (empty for a deletion). The raw characters on either side are recovered from
   * the previous* display — literals carry no raw content and placeholders are indistinguishable
   * from typed characters — re-masked together with the inserted text, and the caret is parked
   * after the reformatted prefix.
   *
   * This is the path a paste, a cut, a drag-drop, `execCommand` or an IME commit takes, since none
   * of those produce the individual keystrokes the `keydown` handler intercepts.
   */
  const handleInput = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement
      const opts = optionsRef.current

      const { slots: resolvedSlots, slotChar, transform } = getResolvedOptions(opts, '')
      const prev = displayValueRef.current
      const curr = input.value

      let prefixLen = 0
      const maxPrefix = Math.min(prev.length, curr.length)
      while (prefixLen < maxPrefix && prev[prefixLen] === curr[prefixLen]) {
        prefixLen++
      }

      let suffixLen = 0
      const maxSuffix = Math.min(prev.length - prefixLen, curr.length - prefixLen)
      while (
        suffixLen < maxSuffix
        && prev[prev.length - 1 - suffixLen] === curr[curr.length - 1 - suffixLen]
      ) {
        suffixLen++
      }

      const insertedText = curr.slice(prefixLen, curr.length - suffixLen)
      const removedEnd = prev.length - suffixLen

      const beforeRaw = extractRaw(prev.slice(0, prefixLen), resolvedSlots.slice(0, prefixLen))
      const afterRaw = extractRaw(prev.slice(removedEnd), resolvedSlots.slice(removedEnd))
      const reformatted = applyMaskToRaw(
        beforeRaw + insertedText + afterRaw,
        resolvedSlots,
        slotChar,
        transform,
      )
      const maskedPrefix = applyMaskToRaw(
        beforeRaw + insertedText,
        resolvedSlots,
        slotChar,
        transform,
      )

      if (reformatted !== prev) {
        pushUndoState()
      }
      updateValue(reformatted, maskedPrefix.length)
    },
    [pushUndoState, updateValue],
  )

  /**
   * Pull a collapsed caret back into range: when a click or a `Tab` leaves it past the end of the
   * masked value, or before the first editable slot, it is parked at the end of the processed value
   * (past its trailing literals). A real selection is left untouched — dragging across the field is
   * a selection, not a caret move.
   *
   * Note the calls into `findNextEditablePosition` / `findNextTokenIndex` are always guarded by the
   * `processed.length > 0` ternary: `findPrevTokenIndex` in the key handler throws for a caret at
   * or past `slots.length`, and the same class of index is avoided here.
   */
  const clampCursorToProcessed = useCallback((input: HTMLInputElement) => {
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    if (start !== end) {
      return
    }

    const opts = optionsRef.current
    const { slots } = getResolvedOptions(opts, '')
    const processed = processedRef.current
    const endPos
      = processed.length > 0
        ? findNextEditablePosition(processed.length, slots, processed)
        : findNextTokenIndex(slots, 0)
    const startPos = findNextTokenIndex(slots, 0)

    if (start > endPos || start < startPos) {
      input.setSelectionRange(endPos, endPos)
    }
  }, [])

  /**
   * Reveal the placeholders on focus (unless `showMaskOnFocus: false`) and flip `isFocusedRef`,
   * which is what lets `updateValue` show slots for an otherwise empty field. The clamp runs in a
   * `requestAnimationFrame` so the browser has already placed the caret from the click that caused
   * the focus (React does not control caret placement); the callback is deliberately block-bodied
   * because it reads refs and would be rewritten into an eager `requestAnimationFrame(fn, arg)`
   * form by the ESLint autofix.
   */
  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
    const opts = optionsRef.current
    const input = inputRef.current

    if (!input) {
      return
    }

    const { slots, slotChar } = getResolvedOptions(opts, '')
    const showOnFocus = opts.showMaskOnFocus !== false
    const processed = processedRef.current

    if (showOnFocus || opts.alwaysShowMask) {
      const display = buildDisplayValue(processed, slots, slotChar, true)
      input.value = display
      displayValueRef.current = display
      setMaskedValue(display)
    }

    requestAnimationFrame(() => {
      if (input === document.activeElement) {
        clampCursorToProcessed(input)
      }
    })
  }, [clampCursorToProcessed])

  /**
   * Re-clamp after the browser has moved the caret for a click. `mouseup` is the event that fires
   * once the drag is finished, so a caret that was dragged into a literal (or past the typed
   * content) is pulled back.
   */
  const handleMouseUp = useCallback(() => {
    const input = inputRef.current
    if (!input || input !== document.activeElement) {
      return
    }

    clampCursorToProcessed(input)
  }, [clampCursorToProcessed])

  /**
   * Same clamp as `handleMouseUp`, but on `mousedown`: the caret position is read from inside a
   * `requestAnimationFrame` because at mousedown time the browser has not yet moved it. Here a
   * click past the typed content is pushed back to the end of the processed value and nothing else
   * is touched — this path never pulls a caret backwards, only forwards.
   *
   * Block-bodied for the same ESLint-autofix reason as `handleFocus`.
   */
  const handleMouseDown = useCallback(() => {
    const input = inputRef.current
    if (!input) {
      return
    }

    requestAnimationFrame(() => {
      if (input !== document.activeElement) {
        return
      }

      const start = input.selectionStart ?? 0
      const end = input.selectionEnd ?? 0
      if (start !== end) {
        return
      }

      const opts = optionsRef.current
      const { slots } = getResolvedOptions(opts, '')
      const processed = processedRef.current
      const endPos
        = processed.length > 0
          ? findNextEditablePosition(processed.length, slots, processed)
          : findNextTokenIndex(slots, 0)

      if (start > endPos) {
        input.setSelectionRange(endPos, endPos)
      }
    })
  }, [])

  /**
   * Decide what the field keeps once focus leaves.
   *
   * The DOM value is trusted only when it is still the display the hook painted on focus; otherwise
   * the user (or the browser) changed it behind the hook's back and it is re-processed through the
   * mask first.
   *
   * With `autoClear`, an incomplete field is emptied — including the display the hook had shown —
   * `onChangeRaw` is notified with two empty strings, and `alwaysShowMask` immediately repaints the
   * empty mask. Without `autoClear`, a field whose raw content is empty is cleared and also
   * notified, while a partially filled one just drops its placeholders (`showSlots: false`) and
   * keeps what the user typed.
   */
  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    const opts = optionsRef.current
    const input = inputRef.current

    if (!input) {
      return
    }

    const { slots, slotChar } = getResolvedOptions(opts, rawValue)
    const expectedFocusDisplay = buildDisplayValue(processedRef.current, slots, slotChar, true)
    const processed
      = input.value === expectedFocusDisplay
        ? processedRef.current
        : processInput(input.value, slots, slotChar)
    const complete = checkComplete(processed, slots)

    if (opts.autoClear && !complete && processed.length > 0) {
      input.value = ''
      processedRef.current = ''
      displayValueRef.current = ''
      rawValueRef.current = ''
      setMaskedValue('')
      setRawValue('')
      wasCompleteRef.current = false

      if (opts.onChangeRaw) {
        opts.onChangeRaw('', '')
      }

      if (opts.alwaysShowMask) {
        const emptyDisplay = buildDisplayValue('', slots, slotChar, true)
        input.value = emptyDisplay
        displayValueRef.current = emptyDisplay
        setMaskedValue(emptyDisplay)
      }
      return
    }

    if (!opts.alwaysShowMask && !complete) {
      if (extractRaw(processed, slots).length === 0) {
        input.value = ''
        processedRef.current = ''
        displayValueRef.current = ''
        rawValueRef.current = ''
        setMaskedValue('')
        setRawValue('')
        wasCompleteRef.current = false

        if (opts.onChangeRaw) {
          opts.onChangeRaw('', '')
        }
        return
      }

      const display = buildDisplayValue(processed, slots, slotChar, false)
      input.value = display
      displayValueRef.current = display
      setMaskedValue(display)
    }
  }, [rawValue])

  /**
   * The editing core. Every branch works on the processed value and rewrites the whole field
   * through `applyMaskToRaw`, so the mask is never edited locally:
   *
   * - `Ctrl/Cmd+Z` pops the undo stack and pushes the current state onto redo;
   *   `Ctrl/Cmd+Shift+Z` and `Ctrl+Y` do the reverse. `modifier` treats `Ctrl`
   *   without `Alt` as a modifier so `AltGr` combinations stay plain input.
   * - `Backspace` removes the selection, or the nearest character to the left
   *   skipping literals; with `Ctrl`/`Cmd` it removes everything from the caret
   *   leftwards.
   * - `Delete` mirrors it to the right, again skipping literals.
   * - `ArrowRight` / `ArrowLeft` hop over literal slots without `Shift`, so the
   *   caret lands on editable positions only. The left branch is guarded by
   *   `start > 0` and passes `start - 1` because `findPrevTokenIndex` throws on
   *   an index at or past `slots.length`.
   * - Any other single printable character is validated against the **target
   *   slot's** pattern (after `transform`) before insertion; a character the
   *   slot rejects is swallowed rather than passed through, and the caret is
   *   moved to the next editable position after the insertion.
   *
   * Every mutating branch pushes an undo state before committing.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const input = e.target as HTMLInputElement
      const opts = optionsRef.current

      const { slots, slotChar, transform } = getResolvedOptions(opts, rawValue)
      const start = input.selectionStart ?? 0
      const end = input.selectionEnd ?? 0
      const processed = processedRef.current

      const modifier = e.metaKey || (e.ctrlKey && !e.altKey)
      const key = e.key.toLowerCase()

      if (modifier && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const prev = undoStackRef.current.pop()
        if (!prev) {
          return
        }
        redoStackRef.current.push({
          rawValue: rawValueRef.current,
          selectionStart: input.selectionStart ?? 0,
        })
        applyHistoryState(prev)
        return
      }

      if (modifier && ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey))) {
        e.preventDefault()
        const next = redoStackRef.current.pop()
        if (!next) {
          return
        }
        undoStackRef.current.push({
          rawValue: rawValueRef.current,
          selectionStart: input.selectionStart ?? 0,
        })
        applyHistoryState(next)
        return
      }

      if (e.key === 'Backspace') {
        e.preventDefault()

        if (e.metaKey || (e.ctrlKey && !e.altKey)) {
          const clampedStart = Math.min(start, processed.length)
          const afterRaw = extractRaw(processed.slice(clampedStart), slots.slice(clampedStart))
          const newValue = applyMaskToRaw(afterRaw, slots, slotChar, transform)
          pushUndoState()
          updateValue(newValue, 0)
          return
        }

        if (start !== end) {
          const clampedEnd = Math.min(end, processed.length)
          const before = processed.slice(0, start)
          const afterRaw = extractRaw(processed.slice(clampedEnd), slots.slice(clampedEnd))
          const newValue = applyMaskToRaw(
            extractRaw(before, slots) + afterRaw,
            slots,
            slotChar,
            transform,
          )
          pushUndoState()
          updateValue(newValue, start)
          return
        }

        if (start === 0) {
          return
        }

        let deletePos = start - 1
        while (deletePos >= 0 && slots[deletePos] && slots[deletePos].type === 'literal') {
          deletePos--
        }

        if (deletePos < 0) {
          return
        }

        const beforeRaw = extractRaw(processed.slice(0, deletePos), slots.slice(0, deletePos))
        const afterRaw = extractRaw(processed.slice(deletePos + 1), slots.slice(deletePos + 1))
        const newValue = applyMaskToRaw(beforeRaw + afterRaw, slots, slotChar, transform)
        pushUndoState()
        updateValue(newValue, deletePos)
      }
      else if (e.key === 'Delete') {
        e.preventDefault()

        if (start !== end) {
          const clampedEnd = Math.min(end, processed.length)
          const before = processed.slice(0, start)
          const afterRaw = extractRaw(processed.slice(clampedEnd), slots.slice(clampedEnd))
          const newValue = applyMaskToRaw(
            extractRaw(before, slots) + afterRaw,
            slots,
            slotChar,
            transform,
          )
          pushUndoState()
          updateValue(newValue, start)
          return
        }

        let deletePos = start
        while (
          deletePos < slots.length
          && slots[deletePos]
          && slots[deletePos].type === 'literal'
        ) {
          deletePos++
        }

        if (deletePos >= processed.length) {
          return
        }

        const beforeRaw = extractRaw(processed.slice(0, start), slots.slice(0, start))
        const afterRaw = extractRaw(processed.slice(deletePos + 1), slots.slice(deletePos + 1))
        const newValue = applyMaskToRaw(beforeRaw + afterRaw, slots, slotChar, transform)
        pushUndoState()
        updateValue(newValue, start)
      }
      else if (e.key === 'ArrowRight' && !e.shiftKey) {
        const nextPos = findNextEditablePosition(start + 1, slots, input.value)
        if (nextPos !== start + 1) {
          e.preventDefault()
          input.setSelectionRange(nextPos, nextPos)
        }
      }
      else if (e.key === 'ArrowLeft' && !e.shiftKey) {
        if (start > 0) {
          const prevToken = findPrevTokenIndex(slots, start - 1)
          if (prevToken >= 0 && prevToken !== start - 1) {
            e.preventDefault()
            input.setSelectionRange(prevToken + 1, prevToken + 1)
          }
        }
      }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()

        let insertPos = Math.min(start, processed.length)
        while (
          insertPos < slots.length
          && slots[insertPos]
          && slots[insertPos].type === 'literal'
        ) {
          insertPos++
        }

        if (insertPos >= slots.length) {
          return
        }

        const slot = slots[insertPos]
        const ch = transform ? transform(e.key) : e.key
        if (!slot.pattern!.test(ch)) {
          return
        }

        const beforeRaw = extractRaw(processed.slice(0, insertPos), slots.slice(0, insertPos))
        const afterRaw
          = start < end
            ? extractRaw(
                processed.slice(Math.min(end, processed.length)),
                slots.slice(Math.min(end, processed.length)),
              )
            : extractRaw(processed.slice(insertPos), slots.slice(insertPos))
        const newValue = applyMaskToRaw(beforeRaw + ch + afterRaw, slots, slotChar, transform)
        const newCursorPos = findNextEditablePosition(insertPos + 1, slots, newValue)
        pushUndoState()
        updateValue(newValue, newCursorPos)
      }
    },
    [applyHistoryState, pushUndoState, rawValue, updateValue],
  )

  /**
   * Splice clipboard text into the raw value at the current selection, re-mask it and park the
   * caret after the pasted prefix. The paste is always `preventDefault`ed so the browser's own
   * insertion never reaches the field — the mask rebuild is what decides which pasted characters
   * survive — and the caret write is skipped unless the element still holds focus.
   */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      e.preventDefault()
      const input = e.target as HTMLInputElement
      const opts = optionsRef.current

      const pastedText = e.clipboardData?.getData('text') ?? ''
      const start = input.selectionStart ?? 0
      const end = input.selectionEnd ?? 0
      const processed = processedRef.current

      const { slots, slotChar, transform } = getResolvedOptions(opts, '')
      const clampedStart = Math.min(start, processed.length)
      const clampedEnd = Math.min(end, processed.length)
      const beforeRaw = extractRaw(processed.slice(0, clampedStart), slots.slice(0, clampedStart))
      const afterRaw = extractRaw(processed.slice(clampedEnd), slots.slice(clampedEnd))
      const newValue = applyMaskToRaw(
        beforeRaw + pastedText + afterRaw,
        slots,
        slotChar,
        transform,
      )

      pushUndoState()
      updateValue(newValue)

      const maskedPrefix = applyMaskToRaw(beforeRaw + pastedText, slots, slotChar, transform)
      const pasteEndPos = Math.min(maskedPrefix.length, slots.length)
      if (input === document.activeElement) {
        input.setSelectionRange(pasteEndPos, pasteEndPos)
      }
    },
    [pushUndoState, updateValue],
  )

  /**
   * Reflect the `invalid` option on the element. The attribute is removed rather than set to
   * `'false'`, so a consumer's own `aria-invalid` typing (or absence of it) is preserved when the
   * option is off.
   */
  const setAriaAttributes = useCallback((input: HTMLInputElement) => {
    const opts = optionsRef.current

    if (opts.invalid) {
      input.setAttribute('aria-invalid', 'true')
    }
    else {
      input.removeAttribute('aria-invalid')
    }
  }, [])

  /**
   * The returned `ref`. Attaching a node detaches every listener from the previous one first, so a
   * re-parented or swapped input does not keep a stale handler alive; detaching (`node === null`)
   * only removes.
   *
   * On attach it also adopts any existing value, applies the ARIA state, and — when
   * `alwaysShowMask` is on and there was no value to adopt — paints the empty mask so the pattern
   * is visible before the field is ever focused.
   *
   * `options` is read **directly** rather than through `optionsRef` here, and is therefore in this
   * callback's dependency array: the empty-mask paint is a commit-time decision that must follow
   * the current props, whereas the event handlers never need re-binding. That asymmetry is
   * upstream's and is preserved.
   */
  const refCallback = useCallback(
    (node: HTMLInputElement | null) => {
      const prevInput = inputRef.current

      if (prevInput) {
        prevInput.removeEventListener('input', handleInput)
        prevInput.removeEventListener('focus', handleFocus)
        prevInput.removeEventListener('blur', handleBlur)
        prevInput.removeEventListener('mousedown', handleMouseDown)
        prevInput.removeEventListener('mouseup', handleMouseUp)
        prevInput.removeEventListener('keydown', handleKeyDown as EventListener)
        prevInput.removeEventListener('paste', handlePaste as EventListener)
      }

      inputRef.current = node

      if (node) {
        node.addEventListener('input', handleInput)
        node.addEventListener('focus', handleFocus)
        node.addEventListener('blur', handleBlur)
        node.addEventListener('mousedown', handleMouseDown)
        node.addEventListener('mouseup', handleMouseUp)
        node.addEventListener('keydown', handleKeyDown as EventListener)
        node.addEventListener('paste', handlePaste as EventListener)

        setAriaAttributes(node)

        const hasInitialValue = initializeInputValue(node)

        if (options.alwaysShowMask && !hasInitialValue) {
          const { slots, slotChar } = getResolvedOptions(options, '')
          const display = buildDisplayValue('', slots, slotChar, true)
          node.value = display
          displayValueRef.current = display
          setMaskedValue(display)
        }
      }
    },
    [
      handleInput,
      handleFocus,
      handleBlur,
      handleMouseDown,
      handleMouseUp,
      handleKeyDown,
      handlePaste,
      initializeInputValue,
      setAriaAttributes,
      options,
    ],
  )

  /**
   * Re-apply the ARIA state when `invalid` flips. The ref callback only runs on attach, so a later
   * change to the option needs this effect to reach an already-mounted input.
   */
  useEffect(() => {
    const input = inputRef.current
    if (!input) {
      return
    }

    setAriaAttributes(input)
  }, [options.invalid, setAriaAttributes])

  /**
   * Completeness of the committed value, recomputed inline on every render. It reads `processedRef`
   * rather than the `maskedValue` state because the DOM write in `applyValue` and this computation
   * must agree within the same commit; the IIFE keeps the `getOptions()` call out of the
   * component's top-level scope, where it would run before `processedRef` is meaningful.
   */
  const isComplete = (() => {
    const { slots } = getOptions()
    return checkComplete(processedRef.current, slots)
  })()

  /**
   * Empty the field and drop the whole history: refs and state are cleared, the DOM value becomes
   * `''` (or the empty mask under `alwaysShowMask`), and `onChangeRaw` is notified with two empty
   * strings so a controlled consumer follows along. Because the undo and redo stacks are cleared
   * too, `Ctrl+Z` after a reset has nothing to restore.
   */
  const reset = useCallback(() => {
    const opts = optionsRef.current
    const input = inputRef.current

    processedRef.current = ''
    displayValueRef.current = ''
    rawValueRef.current = ''
    undoStackRef.current = []
    redoStackRef.current = []
    setMaskedValue('')
    setRawValue('')
    wasCompleteRef.current = false

    if (input) {
      if (opts.alwaysShowMask) {
        const { slots, slotChar } = getResolvedOptions(opts, '')
        const display = buildDisplayValue('', slots, slotChar, true)
        input.value = display
        displayValueRef.current = display
        setMaskedValue(display)
      }
      else {
        input.value = ''
      }
    }

    if (opts.onChangeRaw) {
      opts.onChangeRaw('', '')
    }
  }, [])

  return {
    ref: refCallback,
    value: maskedValue,
    rawValue,
    isComplete,
    reset,
  }
}

// The four pure helpers and the token map are the part of the engine that
// upstream documents as public API alongside the hook, so they are re-exported
// — **by name**, not with `export *`, which would also publish the sixteen
// file-local internals (`parseMask`, `processInput`, `getResolvedOptions`, …)
// that upstream never exports and that this port has no reason to pin down.
//
// The line sits **after** `useMask` because `scripts/update.ts` pairs a
// `Map from` annotation with the first `export` declaration that follows it in
// source order: an export above the hook would capture this file's own
// provenance claim and leave `useMask` resolving as `reause-only`.
export {
  DEFAULT_TOKENS,
  formatMask,
  generatePattern,
  isMaskComplete,
  unformatMask,
} from './engine'
export type {
  MaskSlot,
  MaskState,
  UndoState,
  UseMaskOptions,
  UseMaskReturnValue,
} from './engine'
