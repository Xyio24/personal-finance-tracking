import { formatAmountInput, parseAmountInput } from '@finance/shared'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { backspaceOverSeparator, caretAfterDigits, digitsBefore } from '../lib/amountCaret'

type Props = {
  id: string
  value: number
  onChange: (value: number) => void
  autoFocus?: boolean
  /** Text color class, e.g. red for expenses. */
  toneClass?: string
  size?: 'lg' | 'md'
}

/**
 * Rupiah amount field: numeric keypad on phones, thousand separators while typing. The caret
 * stays where the user is typing even though the digits are regrouped on every keystroke.
 */
export function AmountInput({
  id,
  value,
  onChange,
  autoFocus,
  toneClass = '',
  size = 'lg',
}: Props) {
  const large = size === 'lg'
  const ref = useRef<HTMLInputElement>(null)
  /** Where the caret belongs after the next render, as "after this many digits". */
  const caret = useRef<number | null>(null)
  const latestOnChange = useRef(onChange)
  useLayoutEffect(() => {
    latestOnChange.current = onChange
  })

  useLayoutEffect(() => {
    const input = ref.current
    if (!input || caret.current === null || document.activeElement !== input) return
    const position = caretAfterDigits(input.value, caret.current)
    input.setSelectionRange(position, position)
    caret.current = null
  })

  // Backspace right after a dot deletes the digit before it. A native listener: soft keyboards on
  // Android often send no usable keydown, and React's onBeforeInput doesn't fire for deletions.
  useEffect(() => {
    const input = ref.current
    if (!input) return
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType !== 'deleteContentBackward') return
      const edit = backspaceOverSeparator(
        input.value,
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
      )
      if (!edit) return
      event.preventDefault()
      caret.current = edit.digits
      latestOnChange.current(parseAmountInput(edit.text))
    }
    input.addEventListener('beforeinput', onBeforeInput)
    return () => input.removeEventListener('beforeinput', onBeforeInput)
  }, [])

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-semibold text-slate-400 ${large ? 'text-2xl' : 'text-base'}`}
        aria-hidden
      >
        Rp
      </span>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: the amount is the first thing to type on this screen
        autoFocus={autoFocus}
        // React focuses on mount, which does nothing inside a sheet that is not shown yet;
        // Sheet focuses the element marked like this once it opens.
        data-autofocus={autoFocus || undefined}
        placeholder="0"
        value={formatAmountInput(value)}
        onChange={(e) => {
          const { value: text, selectionStart } = e.target
          caret.current = digitsBefore(text, selectionStart ?? text.length)
          onChange(parseAmountInput(text))
        }}
        className={`w-full min-w-0 bg-transparent font-bold tabular-nums outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
          large ? 'text-4xl' : 'h-12 text-xl'
        } ${toneClass}`}
      />
    </div>
  )
}
