import { formatAmountInput, parseAmountInput } from '@finance/shared'

type Props = {
  id: string
  value: number
  onChange: (value: number) => void
  autoFocus?: boolean
  /** Text color class, e.g. red for expenses. */
  toneClass?: string
  size?: 'lg' | 'md'
}

/** Rupiah amount field: numeric keypad on phones, thousand separators while typing. */
export function AmountInput({
  id,
  value,
  onChange,
  autoFocus,
  toneClass = '',
  size = 'lg',
}: Props) {
  const large = size === 'lg'
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-semibold text-slate-400 ${large ? 'text-2xl' : 'text-base'}`}
        aria-hidden
      >
        Rp
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: the amount is the first thing to type on this screen
        autoFocus={autoFocus}
        placeholder="0"
        value={formatAmountInput(value)}
        onChange={(e) => onChange(parseAmountInput(e.target.value))}
        className={`w-full min-w-0 bg-transparent font-bold tabular-nums outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
          large ? 'text-4xl' : 'h-12 text-xl'
        } ${toneClass}`}
      />
    </div>
  )
}
