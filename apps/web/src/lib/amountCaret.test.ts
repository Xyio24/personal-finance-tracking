import { formatAmountInput, parseAmountInput } from '@finance/shared'
import { describe, expect, it } from 'vitest'
import { backspaceOverSeparator, caretAfterDigits, digitsBefore } from './amountCaret'

/** Types `typed` into `text` at `position`, then regroups like the field does. */
function typeAt(text: string, position: number, typed: string) {
  const raw = text.slice(0, position) + typed + text.slice(position)
  const digits = digitsBefore(raw, position + typed.length)
  const shown = formatAmountInput(parseAmountInput(raw))
  return { shown, caret: caretAfterDigits(shown, digits) }
}

describe('amount caret', () => {
  it('counts digits left of the caret, ignoring dots', () => {
    expect(digitsBefore('1.250.000', 0)).toBe(0)
    expect(digitsBefore('1.250.000', 2)).toBe(1)
    expect(digitsBefore('1.250.000', 5)).toBe(4)
  })

  it('places the caret after the n-th digit', () => {
    expect(caretAfterDigits('1.250.000', 0)).toBe(0)
    expect(caretAfterDigits('1.250.000', 1)).toBe(1)
    expect(caretAfterDigits('1.250.000', 4)).toBe(5)
    expect(caretAfterDigits('1.250.000', 99)).toBe(9)
  })

  it('keeps the caret in place when a digit is inserted mid-number', () => {
    // 125.000 → typing 3 after "12" gives 1.235.000 with the caret after the 3
    const { shown, caret } = typeAt('125.000', 2, '3')
    expect(shown).toBe('1.235.000')
    expect(shown.slice(0, caret)).toBe('1.23')
  })

  it('backspace right after a dot deletes the digit before it', () => {
    const edit = backspaceOverSeparator('1.250.000', 2, 2)
    expect(edit).not.toBeNull()
    const shown = formatAmountInput(parseAmountInput(edit?.text ?? ''))
    expect(shown).toBe('250.000')
    expect(caretAfterDigits(shown, edit?.digits ?? -1)).toBe(0)

    const middle = backspaceOverSeparator('1.250.000', 6, 6)
    expect(formatAmountInput(parseAmountInput(middle?.text ?? ''))).toBe('125.000')
    expect(middle?.digits).toBe(3)
  })

  it('leaves every other backspace to the browser', () => {
    expect(backspaceOverSeparator('1.250.000', 4, 4)).toBeNull() // after a digit
    expect(backspaceOverSeparator('1.250.000', 2, 5)).toBeNull() // a selection
    expect(backspaceOverSeparator('1.250', 0, 0)).toBeNull()
  })
})
