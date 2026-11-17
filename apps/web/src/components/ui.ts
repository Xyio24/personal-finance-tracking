// Shared class strings for form controls and buttons, so every screen looks the same.

// Fields are content, not glass, but sit on glass sheets: a light fill instead of solid white.
export const inputClass =
  'h-12 w-full rounded-xl border border-slate-900/10 bg-white/80 px-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100'

export const labelClass = 'mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300'

// Buttons are glass capsules (index.css: .btn-*, .glass-press); see docs/LIQUID-GLASS.md.
const buttonBase =
  'glass-press flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50'

export const primaryButtonClass = `${buttonBase} btn-primary`

export const secondaryButtonClass = `${buttonBase} btn-secondary`

export const dangerButtonClass = `${buttonBase} btn-danger`

/** Round clear-glass icon button (header actions, back, close, month arrows). */
export const glassIconButtonClass =
  'glass glass-sm glass-button flex size-10 shrink-0 items-center justify-center rounded-full text-slate-800 dark:text-slate-100'

export const cardClass = 'rounded-2xl bg-white dark:bg-slate-900'

/** Small chip used for pickers (accounts, quick dates). */
export const chipClass = (selected: boolean) =>
  `flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
    selected
      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-400/10 dark:text-emerald-300'
      : 'border-slate-900/10 bg-white/70 text-slate-600 active:bg-slate-900/5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
  }`
