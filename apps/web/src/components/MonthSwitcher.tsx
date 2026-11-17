import { shiftMonth } from '@finance/shared'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonth } from '../lib/format'
import { glassIconButtonClass } from './ui'

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string
  onChange: (month: string) => void
}) {
  return (
    <div className="mx-4 flex items-center justify-between">
      <button
        type="button"
        aria-label="Bulan sebelumnya"
        onClick={() => onChange(shiftMonth(month, -1))}
        className={glassIconButtonClass}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <h2 className="font-semibold" aria-live="polite">
        {formatMonth(month)}
      </h2>
      <button
        type="button"
        aria-label="Bulan berikutnya"
        onClick={() => onChange(shiftMonth(month, 1))}
        className={glassIconButtonClass}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  )
}
