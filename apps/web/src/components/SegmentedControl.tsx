type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}

/** A row of mutually exclusive options (like iOS segmented controls). */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: styled buttons in a radiogroup, like a native segmented control
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`h-9 rounded-lg text-sm font-medium transition ${
              selected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-500 active:text-slate-700 dark:text-slate-400'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
