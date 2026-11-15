const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format a number as Rupiah, e.g. 1250000 -> "Rp 1.250.000". */
export function formatRupiah(amount: number): string {
  // Intl separates "Rp" and the number with a non-breaking space; keep it so
  // the value never wraps onto two lines on narrow screens.
  return rupiahFormatter.format(amount)
}
