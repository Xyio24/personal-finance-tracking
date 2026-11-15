import { errorMessage } from '../lib/errors'
import { cardClass } from './ui'

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={`mx-4 divide-y divide-slate-100 dark:divide-slate-800 ${cardClass}`} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="size-11 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A failed load: what went wrong and a way to try again. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className={`mx-4 p-5 text-center ${cardClass}`}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
      >
        Coba lagi
      </button>
    </div>
  )
}
