import {
  type Debt,
  type DebtDirection,
  type DebtStatus,
  debtStatus,
  debtTotals,
  formatRupiah,
} from '@finance/shared'
import { ChevronRight, HandCoins, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DebtForm } from '../components/DebtForm'
import { DebtStatusPill, PersonAvatar } from '../components/DebtVisuals'
import { PageHeader } from '../components/PageHeader'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { SegmentedControl } from '../components/SegmentedControl'
import { Sheet } from '../components/Sheet'
import { HeaderIconButton } from '../components/SubPageHeader'
import { cardClass, primaryButtonClass } from '../components/ui'
import { formatDate, formatSignedRupiah, todayKey } from '../lib/format'
import { useChoiceParam } from '../lib/navigation'
import { useAccounts, useDebts } from '../lib/queries'

/** Most urgent first: overdue, due soon, then by due date, then the oldest. */
const urgency: Record<DebtStatus, number> = {
  overdue: 0,
  due_soon: 1,
  open: 2,
  settled: 3,
  written_off: 3,
}

export function DebtsPage() {
  const debts = useDebts()
  const accounts = useAccounts()
  const navigate = useNavigate()
  const [side, setSide] = useChoiceParam<DebtDirection>(
    'sisi',
    { payable: 'hutang', receivable: 'piutang' },
    'payable',
  )
  const [creating, setCreating] = useState(false)
  const today = todayKey()

  const all = (debts.data ?? []).map((debt) => ({ debt, status: debtStatus(debt, today) }))
  const totals = debtTotals(debts.data ?? [])
  const ofSide = all
    .filter(({ debt }) => debt.direction === side)
    .sort(
      (a, b) =>
        urgency[a.status] - urgency[b.status] ||
        (a.debt.dueDate ?? '9999').localeCompare(b.debt.dueDate ?? '9999') ||
        a.debt.date.localeCompare(b.debt.date),
    )
  const open = ofSide.filter(({ debt }) => debt.remaining > 0)
  const closed = ofSide.filter(({ debt }) => debt.remaining === 0)
  const overdue = all.filter((d) => d.status === 'overdue').length
  const dueSoon = all.filter((d) => d.status === 'due_soon').length
  const count = (direction: DebtDirection) =>
    all.filter(({ debt }) => debt.direction === direction && debt.remaining > 0).length

  return (
    <>
      <PageHeader
        title="Hutang & Piutang"
        action={
          <HeaderIconButton label="Catat hutang atau piutang" onClick={() => setCreating(true)}>
            <Plus className="size-5" aria-hidden />
          </HeaderIconButton>
        }
      />

      {debts.isError ? (
        <LoadError error={debts.error} onRetry={() => debts.refetch()} />
      ) : !debts.data ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <section className={`mx-4 p-4 ${cardClass}`} aria-label="Ringkasan hutang dan piutang">
            <dl className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Piutang (orang ke kamu)
                </dt>
                <dd className="truncate text-lg font-semibold">
                  {formatRupiah(totals.receivable)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  Hutang (kamu ke orang)
                </dt>
                <dd className="truncate text-lg font-semibold">{formatRupiah(totals.payable)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Selisih</span>
              <span className="font-semibold tabular-nums">{formatSignedRupiah(totals.net)}</span>
            </div>
            {(overdue > 0 || dueSoon > 0) && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {[
                  overdue > 0 && `${overdue} lewat jatuh tempo`,
                  dueSoon > 0 && `${dueSoon} jatuh tempo dalam 7 hari`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </section>

          <div className="mx-4 mt-4">
            <SegmentedControl
              label="Jenis"
              value={side}
              options={[
                { value: 'payable', label: `Hutang (${count('payable')})` },
                { value: 'receivable', label: `Piutang (${count('receivable')})` },
              ]}
              onChange={setSide}
            />
          </div>

          {open.length === 0 ? (
            <div
              className={`mx-4 mt-4 flex flex-col items-center px-6 py-8 text-center ${cardClass}`}
            >
              <HandCoins className="size-10 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="mt-3 font-medium">
                {side === 'payable'
                  ? 'Tidak ada hutang yang berjalan'
                  : 'Tidak ada piutang yang berjalan'}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {side === 'payable'
                  ? 'Catat kalau kamu meminjam uang atau memakai paylater.'
                  : 'Catat kalau ada yang meminjam uangmu.'}
              </p>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={`${primaryButtonClass} mt-5 w-auto px-6`}
              >
                Catat {side === 'payable' ? 'hutang' : 'piutang'}
              </button>
            </div>
          ) : (
            <DebtList items={open} today={today} />
          )}

          {closed.length > 0 && (
            <details className="mt-6">
              <summary className="mx-4 cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400">
                Selesai ({closed.length})
              </summary>
              <DebtList items={closed} today={today} />
            </details>
          )}
        </>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Catat hutang atau piutang">
        {creating && accounts.data && (
          <DebtForm
            debt={null}
            accounts={accounts.data}
            initialDirection={side}
            onDone={(saved) => {
              setCreating(false)
              if (saved) navigate(`/hutang/${saved.id}`)
            }}
          />
        )}
      </Sheet>
    </>
  )
}

function DebtList({
  items,
  today,
}: {
  items: { debt: Debt; status: DebtStatus }[]
  today: string
}) {
  return (
    <ul className="mx-4 mt-4 space-y-3">
      {items.map(({ debt, status }) => {
        const ratio = debt.amount > 0 ? Math.min(debt.paid / debt.amount, 1) : 0
        return (
          <li key={debt.id}>
            <Link
              to={`/hutang/${debt.id}`}
              className={`block p-4 active:bg-slate-50 dark:active:bg-slate-800 ${cardClass}`}
            >
              <span className="flex items-center gap-3">
                <PersonAvatar debt={debt} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{debt.person}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {debt.note || formatDate(debt.date)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums">
                    {formatRupiah(debt.remaining)}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {debt.remaining > 0 ? 'sisa' : 'selesai'}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
              </span>
              {debt.remaining > 0 && debt.paid > 0 && (
                <span
                  className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-label={`Sudah dibayar ${debt.person}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(ratio * 100)}
                >
                  <span
                    className="block h-full rounded-full bg-emerald-500"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
              )}
              <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <DebtStatusPill debt={debt} status={status} today={today} />
                <span>
                  {debt.paid > 0
                    ? `Dibayar ${formatRupiah(debt.paid)} dari ${formatRupiah(debt.amount)}`
                    : `Total ${formatRupiah(debt.amount)}`}
                  {debt.dueDate && debt.remaining > 0 && ` · tempo ${formatDate(debt.dueDate)}`}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
