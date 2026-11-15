// Shared class strings for form controls and buttons, so every screen looks the same.

export const inputClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

export const labelClass = 'mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300'

const buttonBase =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 motion-reduce:active:scale-100'

export const primaryButtonClass = `${buttonBase} bg-emerald-600 text-white active:bg-emerald-700`

export const secondaryButtonClass = `${buttonBase} bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700`

export const dangerButtonClass = `${buttonBase} bg-rose-50 text-rose-600 active:bg-rose-100 dark:bg-rose-950 dark:text-rose-400 dark:active:bg-rose-900`

export const cardClass = 'rounded-2xl bg-white dark:bg-slate-900'

/** Small chip used for pickers (accounts, quick dates). */
export const chipClass = (selected: boolean) =>
  `flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
    selected
      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300'
      : 'border-slate-200 bg-white text-slate-600 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
  }`
