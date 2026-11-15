import {
  type Account,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryColor,
  type CategoryIcon,
  shiftDate,
} from '@finance/shared'
import { todayKey } from '../lib/format'
import { categoryColors, categoryIcons, colorNames } from '../lib/visuals'
import { AccountBadge } from './Badges'
import { chipClass, inputClass, labelClass } from './ui'

/** Grid of icons; the selected one is shown in the chosen color. */
export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: CategoryIcon
  color: CategoryColor
  onChange: (icon: CategoryIcon) => void
}) {
  return (
    <fieldset>
      <legend className={labelClass}>Ikon</legend>
      <div className="grid grid-cols-6 gap-2">
        {CATEGORY_ICONS.map((key) => {
          const Icon = categoryIcons[key]
          const selected = key === value
          return (
            <button
              key={key}
              type="button"
              aria-label={`Ikon ${key}`}
              aria-pressed={selected}
              onClick={() => onChange(key)}
              className={`flex aspect-square items-center justify-center rounded-xl transition ${
                selected
                  ? `${categoryColors[color].soft} ring-2 ring-emerald-500`
                  : 'bg-slate-100 text-slate-500 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: CategoryColor
  onChange: (color: CategoryColor) => void
}) {
  return (
    <fieldset>
      <legend className={labelClass}>Warna</legend>
      <div className="flex flex-wrap gap-2.5">
        {CATEGORY_COLORS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={colorNames[key]}
            aria-pressed={key === value}
            onClick={() => onChange(key)}
            className={`size-9 rounded-full ${categoryColors[key].dot} ${
              key === value
                ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-slate-900'
                : ''
            }`}
          />
        ))}
      </div>
    </fieldset>
  )
}

/** Horizontally scrolling wallet chips. */
export function AccountPicker({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string
  accounts: Account[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            aria-pressed={account.id === value}
            onClick={() => onChange(account.id)}
            className={`${chipClass(account.id === value)} pl-1.5`}
          >
            <AccountBadge type={account.type} size="sm" />
            {account.name}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** "Hari ini" / "Kemarin" shortcuts plus a date picker. */
export function DateField({
  value,
  onChange,
}: {
  value: string
  onChange: (date: string) => void
}) {
  const today = todayKey()
  return (
    <fieldset>
      <legend className={labelClass}>Tanggal</legend>
      <div className="flex gap-2">
        {[
          { label: 'Hari ini', date: today },
          { label: 'Kemarin', date: shiftDate(today, -1) },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={value === option.date}
            onClick={() => onChange(option.date)}
            className={chipClass(value === option.date)}
          >
            {option.label}
          </button>
        ))}
        <input
          type="date"
          aria-label="Pilih tanggal"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={`${inputClass} h-10 min-w-0 flex-1 px-3 text-sm`}
        />
      </div>
    </fieldset>
  )
}
