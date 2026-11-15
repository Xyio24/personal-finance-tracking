/**
 * Money is stored and sent as whole rupiah (integers). IDR has no cents in practice, and
 * integers keep every sum exact — no floating point anywhere.
 */
export const MAX_AMOUNT = 1_000_000_000_000 // Rp 1 triliun per value

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const groupFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** Format a number as Rupiah, e.g. 1250000 -> "Rp 1.250.000". */
export function formatRupiah(amount: number): string {
  // Intl separates "Rp" and the number with a non-breaking space; keep it so
  // the value never wraps onto two lines on narrow screens.
  return rupiahFormatter.format(amount)
}

/** Digits with thousand separators only, for amount inputs: 1250000 -> "1.250.000". */
export function formatAmountInput(amount: number): string {
  return amount ? groupFormatter.format(amount) : ''
}

/** Read what the user typed into an amount input ("1.250.000", "Rp 50rb" -> digits only). */
export function parseAmountInput(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, 13)
  return Math.min(digits ? Number(digits) : 0, MAX_AMOUNT)
}
