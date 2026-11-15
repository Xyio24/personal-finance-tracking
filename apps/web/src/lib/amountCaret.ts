/**
 * Caret helpers for the amount field, which regroups its digits ("1.250.000") on every
 * keystroke. The caret is tracked as "after the n-th digit", which survives regrouping.
 */

/** How many digits are left of `position` in `text`. */
export function digitsBefore(text: string, position: number) {
  return text.slice(0, position).replace(/\D/g, '').length
}

/** The position right after the `digits`-th digit of `text` (clamped to the end). */
export function caretAfterDigits(text: string, digits: number) {
  if (digits <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i] ?? '') && ++seen === digits) return i + 1
  }
  return text.length
}

/**
 * Backspace with the caret right after a thousands dot: delete the digit before the dot
 * (the browser alone would only remove the dot, which comes straight back).
 * Returns the edited text and the caret as digits, or null when it is a normal backspace.
 */
export function backspaceOverSeparator(text: string, start: number, end: number) {
  if (start !== end || start < 2 || text[start - 1] !== '.') return null
  return {
    text: text.slice(0, start - 2) + text.slice(start - 1),
    digits: digitsBefore(text, start) - 1,
  }
}
