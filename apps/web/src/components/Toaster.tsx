import { CircleCheck, Info } from 'lucide-react'
import { dismissToast, useToast } from '../lib/toast'

/**
 * Where toasts appear: above the bottom navigation and the form's save bar. Always mounted, so
 * screen readers hear every new message (aria-live).
 */
export function Toaster() {
  const toast = useToast()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-50 flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className="toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-900 py-2 pr-2 pl-4 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          {toast.tone === 'success' ? (
            <CircleCheck
              className="size-4 shrink-0 text-emerald-400 dark:text-emerald-600"
              aria-hidden
            />
          ) : (
            <Info className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
          )}
          <span className="min-w-0 flex-1 py-1.5">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                const run = toast.action?.run
                dismissToast()
                run?.()
              }}
              className="shrink-0 rounded-xl px-3 py-1.5 font-semibold text-emerald-300 active:bg-white/10 dark:text-emerald-700 dark:active:bg-slate-900/10"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
