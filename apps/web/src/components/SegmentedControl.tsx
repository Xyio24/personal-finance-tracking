import { useLiquidPill } from './useLiquidPill'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}

/** Shared by the real options and their copy inside the pill, so the two line up to the pixel. */
const cellClass = 'flex h-full min-w-0 items-center justify-center px-2 text-sm font-medium'

/**
 * A row of mutually exclusive options, like the iOS segmented control: a recessed track with a
 * liquid glass pill on the chosen option that lifts, slides and can be dragged (useLiquidPill).
 */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  const { refs, handlers } = useLiquidPill(
    options.findIndex((option) => option.value === value),
    options.length,
    (i) => {
      const option = options[i]
      if (option) onChange(option.value)
    },
  )
  return (
    <div role="radiogroup" aria-label={label} className="segmented rounded-full p-1">
      {/* pan-y: a vertical swipe on it still scrolls the page or sheet; sideways drags the pill */}
      <div ref={refs.row} {...handlers} className="liquid-row relative h-9 touch-pan-y select-none">
        <div ref={refs.links} className="liquid-links grid h-full auto-cols-fr grid-flow-col">
          {options.map((option) => (
            // biome-ignore lint/a11y/useSemanticElements: styled buttons in a radiogroup, like a native segmented control
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={option.value === value}
              draggable={false}
              onClick={() => onChange(option.value)}
              // The chosen option gets its look from the pill sitting on it.
              className={`${cellClass} rounded-full text-slate-600 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500 dark:text-slate-300`}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
        <div
          ref={refs.pill}
          aria-hidden
          className="liquid-pill pointer-events-none absolute top-0 left-0 h-full"
        >
          <div ref={refs.shape} className="liquid-shape seg-pill absolute inset-0 rounded-full" />
          <div ref={refs.lens} className="absolute inset-0 overflow-hidden rounded-full">
            <div
              ref={refs.copy}
              className="absolute inset-y-0 left-0 grid auto-cols-fr grid-flow-col text-slate-900 dark:text-white"
            >
              {options.map((option) => (
                <span key={option.value} className={cellClass}>
                  <span className="truncate">{option.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
