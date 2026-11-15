import type { AccountType, CategoryColor, CategoryIcon } from '@finance/shared'
import { ArrowLeftRight } from 'lucide-react'
import { accountTypes, categoryColors, categoryIcons } from '../lib/visuals'

const sizes = { sm: 'size-9 rounded-xl', md: 'size-11 rounded-xl', lg: 'size-14 rounded-2xl' }
const iconSizes = { sm: 'size-4', md: 'size-5', lg: 'size-7' }
type Size = keyof typeof sizes

export function CategoryBadge({
  icon,
  color,
  size = 'md',
}: {
  icon: CategoryIcon
  color: CategoryColor
  size?: Size
}) {
  const Icon = categoryIcons[icon]
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${sizes[size]} ${categoryColors[color].soft}`}
    >
      <Icon className={iconSizes[size]} aria-hidden />
    </span>
  )
}

export function AccountBadge({ type, size = 'md' }: { type: AccountType; size?: Size }) {
  const Icon = accountTypes[type].icon
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${sizes[size]}`}
    >
      <Icon className={iconSizes[size]} aria-hidden />
    </span>
  )
}

export function TransferBadge({ size = 'md' }: { size?: Size }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 ${sizes[size]}`}
    >
      <ArrowLeftRight className={iconSizes[size]} aria-hidden />
    </span>
  )
}
