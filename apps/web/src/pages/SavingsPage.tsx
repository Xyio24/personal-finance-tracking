import { formatRupiah, goalProgress, type SavingsGoal, toMonthKey } from '@finance/shared'
import { ChevronRight, PiggyBank, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CategoryBadge } from '../components/Badges'
import { GoalForm } from '../components/GoalForm'
import { GoalProgressBar, GoalStatusPill, goalSummary } from '../components/GoalVisuals'
import { PageHeader } from '../components/PageHeader'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { Sheet } from '../components/Sheet'
import { HeaderIconButton } from '../components/SubPageHeader'
import { cardClass, primaryButtonClass } from '../components/ui'
import { todayKey } from '../lib/format'
import { useMonthTransactions, useSavingsGoals } from '../lib/queries'

export function SavingsPage() {
  const goals = useSavingsGoals()
  const thisMonth = useMonthTransactions(toMonthKey(new Date()))
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const today = todayKey()

  const all = goals.data ?? []
  const withProgress = all.map((goal) => ({ goal, progress: goalProgress(goal, today) }))
  const active = withProgress.filter((g) => !g.goal.archived && g.progress.status !== 'achieved')
  const achieved = withProgress.filter((g) => !g.goal.archived && g.progress.status === 'achieved')
  const archived = withProgress.filter((g) => g.goal.archived)

  const total = all.reduce((sum, goal) => sum + goal.balance, 0)
  const moves = thisMonth.data ?? []
  const deposited = moves
    .filter((t) => t.type === 'saving_deposit')
    .reduce((sum, t) => sum + t.amount, 0)
  const kidnaps = moves.filter((t) => t.type === 'saving_withdrawal')
  const kidnapped = kidnaps.reduce((sum, t) => sum + t.amount, 0)

  return (
    <>
      <PageHeader
        title="Tabungan"
        action={
          <HeaderIconButton label="Tabungan baru" onClick={() => setCreating(true)}>
            <Plus className="size-5" aria-hidden />
          </HeaderIconButton>
        }
      />

      {goals.isError ? (
        <LoadError error={goals.error} onRetry={() => goals.refetch()} />
      ) : goals.isPending ? (
        <ListSkeleton rows={3} />
      ) : all.length === 0 ? (
        <div className={`mx-4 flex flex-col items-center px-6 py-10 text-center ${cardClass}`}>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <PiggyBank className="size-7" aria-hidden />
          </span>
          <p className="mt-4 font-semibold">Belum ada tabungan</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Buat pos untuk dana darurat, liburan, atau barang impian. Pasang target dan deadline
            kalau mau.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={`${primaryButtonClass} mt-5 w-auto px-6`}
          >
            Buat tabungan
          </button>
        </div>
      ) : (
        <>
          <section className={`mx-4 p-4 ${cardClass}`} aria-label="Ringkasan tabungan">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total tabungan</p>
            <p className="mt-1 text-2xl font-bold">{formatRupiah(total)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <div className="min-w-0">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Diisi bulan ini</dt>
                <dd className="truncate font-semibold">{formatRupiah(deposited)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Diculik bulan ini 🥷</dt>
                <dd className="truncate font-semibold">{formatRupiah(kidnapped)}</dd>
              </div>
            </dl>
            {kidnaps.length > 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                Bulan ini kamu sudah menculik tabungan {kidnaps.length}× 🥷. Jangan keseringan ya.
              </p>
            )}
          </section>

          <GoalList title="Sedang dikumpulkan" items={active} />
          <GoalList title="Tercapai" items={achieved} />
          {archived.length > 0 && (
            <details className="mt-6">
              <summary className="mx-4 cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400">
                Diarsipkan ({archived.length})
              </summary>
              <GoalList items={archived} />
            </details>
          )}
        </>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Tabungan baru">
        {creating && (
          <GoalForm
            goal={null}
            onDone={(saved) => {
              setCreating(false)
              if (saved) navigate(`/tabungan/${saved.id}`)
            }}
          />
        )}
      </Sheet>
    </>
  )
}

type Item = { goal: SavingsGoal; progress: ReturnType<typeof goalProgress> }

function GoalList({ title, items }: { title?: string; items: Item[] }) {
  if (items.length === 0) return null
  return (
    <section className="mt-6">
      {title && <h2 className="mx-4 mb-2 font-semibold">{title}</h2>}
      <ul className="mx-4 space-y-3">
        {items.map(({ goal, progress }) => (
          <li key={goal.id}>
            <Link
              to={`/tabungan/${goal.id}`}
              className={`block p-4 transition active:scale-[0.98] active:bg-slate-100 motion-reduce:active:scale-100 dark:active:bg-slate-800 ${cardClass}`}
            >
              <span className="flex items-center gap-3">
                <CategoryBadge icon={goal.icon} color={goal.color} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{goal.name}</span>
                    <GoalStatusPill status={progress.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-sm">
                    <span className="font-semibold">{formatRupiah(goal.balance)}</span>
                    {goal.targetAmount && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}
                        dari {formatRupiah(goal.targetAmount)}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
              </span>
              {progress.ratio !== null && (
                <span className="mt-3 block">
                  <GoalProgressBar ratio={progress.ratio} label={`Progres ${goal.name}`} />
                </span>
              )}
              <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                {goalSummary(goal, progress)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
