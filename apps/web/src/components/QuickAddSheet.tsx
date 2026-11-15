import { ArrowLeftRight, type LucideIcon, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

type Option = { label: string; icon: LucideIcon; tone: string }

const options: Option[] = [
  {
    label: 'Pengeluaran',
    icon: TrendingDown,
    tone: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  },
  {
    label: 'Pemasukan',
    icon: TrendingUp,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    label: 'Transfer',
    icon: ArrowLeftRight,
    tone: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  },
]

/** Bottom sheet opened by the center "+" button. Entry forms arrive in Phase 1. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Tapping the dimmed backdrop (the dialog element itself) closes the sheet.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Catat cepat"
      className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-3xl bg-white p-0 text-slate-900 backdrop:bg-black/40 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Catat cepat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {options.map(({ label, icon: Icon, tone }) => (
            <button
              key={label}
              type="button"
              disabled
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm font-medium disabled:opacity-60 dark:border-slate-800"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="size-6" aria-hidden />
              </span>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Form pencatatan hadir di Fase 1.
        </p>
      </div>
    </dialog>
  )
}
