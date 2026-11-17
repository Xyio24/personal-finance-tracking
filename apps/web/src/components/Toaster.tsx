import { CircleCheck, Info } from 'lucide-react'
import { dismissToast, pauseToast, resumeToast, useToast } from '../lib/toast'

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
        // biome-ignore lint/a11y/noStaticElementInteractions: these handlers only hold the timer while a finger or focus is on the toast; the action itself is a button
        <div
          key={toast.id}
          onPointerEnter={pauseToast}
          onPointerDown={pauseToast}
          onPointerLeave={resumeToast}
          onFocus={pauseToast}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resumeToast()
          }}
          className="toast glass-regular pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-3xl py-2 pr-2 pl-4 text-sm text-slate-900 dark:text-white"
        >
          {toast.tone === 'success' ? (
            <CircleCheck
              className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          ) : (
            <Info className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
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
              className="shrink-0 rounded-full px-3 py-1.5 font-semibold text-emerald-700 active:bg-slate-900/5 dark:text-emerald-300 dark:active:bg-white/10"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
