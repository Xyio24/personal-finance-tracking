import {
  daysBetween,
  formatRupiah,
  goalProgress,
  type SavingsType,
  type Transaction,
} from '@finance/shared'
import { ArchiveRestore, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CategoryBadge } from '../components/Badges'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { GoalForm } from '../components/GoalForm'
import { GoalMoveForm } from '../components/GoalMoveForm'
import { GoalProgressBar, GoalStatusPill } from '../components/GoalVisuals'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { Sheet } from '../components/Sheet'
import { HeaderIconButton, SubPageHeader } from '../components/SubPageHeader'
import { cardClass, primaryButtonClass, secondaryButtonClass } from '../components/ui'
import { errorMessage } from '../lib/errors'
import {
  formatDate,
  formatDayHeading,
  formatShare,
  formatSignedRupiah,
  todayKey,
} from '../lib/format'
import {
  useAccounts,
  useDeleteGoal,
  useDeleteTransaction,
  useGoalHistory,
  useSavingsGoals,
  useUpdateGoal,
} from '../lib/queries'

export function GoalDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const goals = useSavingsGoals()
  const accounts = useAccounts()
  const history = useGoalHistory(id)
  const update = useUpdateGoal()
  const remove = useDeleteTransaction()
  const removeGoal = useDeleteGoal()

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState<SavingsType | null>(null)
  const [editingMove, setEditingMove] = useState<Transaction | null>(null)
  const [removing, setRemoving] = useState<Transaction | null>(null)

  const goal = goals.data?.find((g) => g.id === id)
  const failed = [goals, accounts].find((q) => q.isError)

  if (failed || !goals.data || !accounts.data || !goal) {
    return (
      <>
        <SubPageHeader title="Tabungan" backTo="/tabungan" />
        {failed ? (
          <LoadError error={failed.error} onRetry={() => failed.refetch()} />
        ) : goals.data && accounts.data ? (
          <p className={`mx-4 p-5 text-center text-sm text-slate-500 ${cardClass}`}>
            Tabungan ini tidak ditemukan, mungkin sudah dihapus.{' '}
            <Link to="/tabungan" className="font-medium text-emerald-600 underline">
              Kembali ke daftar
            </Link>
          </p>
        ) : (
          <ListSkeleton rows={3} />
        )}
      </>
    )
  }

  const today = todayKey()
  const progress = goalProgress(goal, today)
  const accountName = (accountId: string) =>
    accounts.data.find((a) => a.id === accountId)?.name ?? 'Dompet terhapus'
  const kidnaps = history.data?.filter((t) => t.type === 'saving_withdrawal') ?? []
  const daysLeft = goal.deadline ? daysBetween(today, goal.deadline) : null
  const moveCount = history.data?.length
  // Until the history has loaded, assume there are entries (and say so) rather than guess.
  const hasMoves = moveCount === undefined || moveCount > 0

  // Spell out what a delete does to wallets and net worth, so nothing changes by surprise.
  const deleteMessage = [
    `"${goal.name}" akan dihapus permanen.`,
    hasMoves &&
      `${moveCount ? `${moveCount} catatan isi/culik` : 'Semua catatan isi/culik'} ikut terhapus: uang yang diisi kembali ke dompet asalnya, dan yang diculik ditarik lagi dari dompetnya.`,
    goal.initialAmount > 0 &&
      `Saldo awal ${formatRupiah(goal.initialAmount)} ikut hilang dari kekayaan bersih.`,
    hasMoves && 'Kalau tabungan ini sudah selesai, arsipkan saja supaya riwayatnya tetap ada.',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <SubPageHeader
        title={goal.name}
        backTo="/tabungan"
        action={
          <>
            <HeaderIconButton label="Hapus tabungan" onClick={() => setDeleting(true)}>
              <Trash2 className="size-5" aria-hidden />
            </HeaderIconButton>
            <HeaderIconButton label="Ubah tabungan" onClick={() => setEditing(true)}>
              <Pencil className="size-5" aria-hidden />
            </HeaderIconButton>
          </>
        }
      />

      <section className={`mx-4 p-5 ${cardClass}`} aria-label="Ringkasan tabungan">
        <div className="flex items-start justify-between gap-3">
          <CategoryBadge icon={goal.icon} color={goal.color} size="lg" />
          <GoalStatusPill status={progress.status} />
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Terkumpul</p>
        <p className="text-3xl font-bold">{formatRupiah(goal.balance)}</p>
        {goal.targetAmount && progress.ratio !== null && (
          <>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              dari {formatRupiah(goal.targetAmount)} · {formatShare(progress.ratio)}
            </p>
            <div className="mt-3">
              <GoalProgressBar ratio={progress.ratio} label={`Progres ${goal.name}`} />
            </div>
          </>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {progress.remaining !== null && progress.remaining > 0 && (
            <Stat label="Kurang" value={formatRupiah(progress.remaining)} />
          )}
          {goal.deadline && daysLeft !== null && (
            <Stat
              label="Deadline"
              value={formatDate(goal.deadline)}
              hint={
                daysLeft < 0
                  ? `Lewat ${-daysLeft} hari`
                  : daysLeft === 0
                    ? 'Hari ini'
                    : `${daysLeft} hari lagi`
              }
            />
          )}
          {progress.monthlyNeeded !== null &&
            progress.monthlyNeeded > 0 &&
            progress.status !== 'overdue' && (
              <Stat label="Perlu ditabung" value={`${formatRupiah(progress.monthlyNeeded)}/bln`} />
            )}
          <Stat
            label="Laju 3 bulan terakhir"
            value={`${progress.pace < 0 ? formatSignedRupiah(progress.pace) : formatRupiah(progress.pace)}/bln`}
            hint="Isi dikurangi culik"
          />
        </dl>
      </section>

      {goal.archived ? (
        <div className={`mx-4 mt-4 p-4 text-sm ${cardClass}`}>
          <p className="text-slate-600 dark:text-slate-300">
            Tabungan ini diarsipkan. Aktifkan lagi untuk mengisi atau menculiknya.
          </p>
          {update.error && (
            <p role="alert" className="mt-2 text-rose-600 dark:text-rose-400">
              {errorMessage(update.error)}
            </p>
          )}
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: goal.id, archived: false })}
            className={`${secondaryButtonClass} mt-3`}
          >
            <ArchiveRestore className="size-4" aria-hidden />
            Aktifkan
          </button>
        </div>
      ) : (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMoving('saving_deposit')}
            className={primaryButtonClass}
          >
            <Plus className="size-5" aria-hidden />
            Isi
          </button>
          <button
            type="button"
            disabled={goal.balance <= 0}
            onClick={() => setMoving('saving_withdrawal')}
            className={secondaryButtonClass}
          >
            <span aria-hidden>🥷</span>
            Culik
          </button>
        </div>
      )}

      {kidnaps.length > 0 && (
        <p className="mx-4 mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Sudah diculik {kidnaps.length}× · total{' '}
          {formatRupiah(kidnaps.reduce((sum, t) => sum + t.amount, 0))} 🥷
        </p>
      )}

      <section className="mt-6" aria-labelledby="goal-history">
        <h2 id="goal-history" className="mx-4 font-semibold">
          Riwayat
        </h2>
        <p className="mx-4 mb-2 text-xs text-slate-500 dark:text-slate-400">
          Ketuk catatan untuk mengubah atau menghapusnya.
        </p>
        {history.isError ? (
          <LoadError error={history.error} onRetry={() => history.refetch()} />
        ) : !history.data ? (
          <ListSkeleton rows={3} />
        ) : history.data.length === 0 ? (
          <p
            className={`mx-4 p-5 text-center text-sm text-slate-500 dark:text-slate-400 ${cardClass}`}
          >
            Belum ada catatan. Tekan <span className="font-semibold">Isi</span> untuk mulai
            menabung.
          </p>
        ) : (
          <ul
            className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
          >
            {history.data.map((t) => {
              const isDeposit = t.type === 'saving_deposit'
              const detail = [formatDayHeading(t.date), accountName(t.accountId), t.note]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setEditingMove(t)}
                    aria-label={`Ubah ${isDeposit ? 'isi' : 'culik'} ${formatRupiah(t.amount)}, ${formatDate(t.date)}`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800"
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                        isDeposit
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-900/50'
                      }`}
                      aria-hidden
                    >
                      {isDeposit ? <Plus className="size-5" /> : '🥷'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{isDeposit ? 'Isi' : 'Culik'}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {detail}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        isDeposit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isDeposit ? '+' : '−'}
                      {formatRupiah(t.amount)}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Sheet
        open={moving !== null}
        onClose={() => setMoving(null)}
        title={moving === 'saving_withdrawal' ? 'Culik tabungan 🥷' : 'Isi tabungan'}
      >
        {moving && (
          <GoalMoveForm
            goal={goal}
            type={moving}
            accounts={accounts.data}
            onDone={() => setMoving(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={editingMove !== null}
        onClose={() => setEditingMove(null)}
        title={editingMove?.type === 'saving_withdrawal' ? 'Ubah culik 🥷' : 'Ubah isi tabungan'}
      >
        {editingMove && (
          <GoalMoveForm
            goal={goal}
            type={editingMove.type === 'saving_withdrawal' ? 'saving_withdrawal' : 'saving_deposit'}
            accounts={accounts.data}
            move={editingMove}
            onDone={() => setEditingMove(null)}
            onDelete={() => {
              setRemoving(editingMove)
              setEditingMove(null)
            }}
          />
        )}
      </Sheet>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Ubah tabungan">
        {editing && (
          <GoalForm
            goal={goal}
            onDone={() => setEditing(false)}
            onDelete={() => {
              setEditing(false)
              setDeleting(true)
            }}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={deleting}
        title="Hapus tabungan ini?"
        message={deleteMessage}
        confirmLabel="Hapus"
        pending={removeGoal.isPending}
        error={removeGoal.error ? errorMessage(removeGoal.error) : null}
        onConfirm={() =>
          removeGoal.mutate(
            { id: goal.id, withTransactions: hasMoves },
            { onSuccess: () => navigate('/tabungan', { replace: true }) },
          )
        }
        onClose={() => {
          setDeleting(false)
          removeGoal.reset()
        }}
      />

      <ConfirmSheet
        open={removing !== null}
        title="Hapus catatan ini?"
        message={
          removing
            ? `${removing.type === 'saving_deposit' ? 'Isi' : 'Culik'} ${formatRupiah(removing.amount)} pada ${formatDate(removing.date)} (${removing.type === 'saving_deposit' ? 'dari' : 'ke'} ${accountName(removing.accountId)}) akan dihapus. Saldo dompet dan tabungan dihitung ulang.`
            : ''
        }
        confirmLabel="Hapus"
        pending={remove.isPending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={() =>
          removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })
        }
        onClose={() => {
          setRemoving(null)
          remove.reset()
        }}
      />
    </>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
      {hint && <dd className="text-xs text-slate-500 dark:text-slate-400">{hint}</dd>}
    </div>
  )
}
