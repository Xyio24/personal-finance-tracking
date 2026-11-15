import type { Account, Category, TransactionFilters, TransactionType } from '@finance/shared'
import { transactionTypes } from '../lib/visuals'
import { AccountBadge, CategoryBadge } from './Badges'
import { SegmentedControl } from './SegmentedControl'
import { Sheet } from './Sheet'
import { chipClass, labelClass, primaryButtonClass, secondaryButtonClass } from './ui'

type Props = {
  open: boolean
  onClose: () => void
  filters: TransactionFilters
  onChange: (patch: Partial<TransactionFilters>) => void
  onReset: () => void
  accounts: Account[]
  categories: Category[]
}

const typeOptions = [
  { value: 'all', label: 'Semua' },
  ...(['expense', 'income', 'transfer'] as const).map((t) => ({
    value: t,
    label: transactionTypes[t].label,
  })),
] as const

/** Filters apply immediately; "Selesai" just closes the sheet. */
export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  accounts,
  categories,
}: Props) {
  const visible = (item: { id: string; archived: boolean }, selected?: string) =>
    !item.archived || item.id === selected
  const categoryChoices = categories.filter(
    (c) => visible(c, filters.categoryId) && (!filters.type || c.type === filters.type),
  )

  function changeType(value: TransactionType | 'all') {
    const type = value === 'all' ? undefined : value
    const category = categories.find((c) => c.id === filters.categoryId)
    // A transfer has no category, and a category only fits its own type.
    const keepCategory = category && type !== 'transfer' && (!type || category.type === type)
    onChange({ type, categoryId: keepCategory ? filters.categoryId : undefined })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Filter transaksi">
      <div className="space-y-5">
        <fieldset>
          <legend className={labelClass}>Jenis</legend>
          <SegmentedControl
            label="Jenis transaksi"
            value={filters.type ?? 'all'}
            options={typeOptions}
            onChange={changeType}
          />
        </fieldset>

        {filters.type !== 'transfer' && (
          <fieldset>
            <legend className={labelClass}>Kategori</legend>
            <div className="flex flex-wrap gap-2">
              {categoryChoices.map((category) => {
                const selected = category.id === filters.categoryId
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ categoryId: selected ? undefined : category.id })}
                    className={`${chipClass(selected)} h-9 pl-1 text-xs`}
                  >
                    <span className="scale-75">
                      <CategoryBadge icon={category.icon} color={category.color} size="sm" />
                    </span>
                    {category.name}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className={labelClass}>Dompet</legend>
          <div className="flex flex-wrap gap-2">
            {accounts
              .filter((a) => visible(a, filters.accountId))
              .map((account) => {
                const selected = account.id === filters.accountId
                return (
                  <button
                    key={account.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ accountId: selected ? undefined : account.id })}
                    className={`${chipClass(selected)} pl-1.5`}
                  >
                    <AccountBadge type={account.type} size="sm" />
                    {account.name}
                  </button>
                )
              })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={onReset} className={secondaryButtonClass}>
            Reset
          </button>
          <button type="button" onClick={onClose} className={primaryButtonClass}>
            Selesai
          </button>
        </div>
      </div>
    </Sheet>
  )
}
