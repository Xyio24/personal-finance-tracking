import { daysBetween, debtStatus, formatRupiah, type Transaction } from '@finance/shared'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  HeartHandshake,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { DebtForm } from '../components/DebtForm'
import { DebtPaymentForm } from '../components/DebtPaymentForm'
import { DebtStatusPill, debtTitle, PersonAvatar, writeOffLabel } from '../components/DebtVisuals'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { Sheet } from '../components/Sheet'
import { HeaderIconButton, SubPageHeader } from '../components/SubPageHeader'
import { cardClass, primaryButtonClass, secondaryButtonClass } from '../components/ui'
import { errorMessage } from '../lib/errors'
import { formatDate, formatDayHeading, formatShare, todayKey } from '../lib/format'
import { useGoBack } from '../lib/navigation'
import {
  setWrittenOff,
  undoDelete,
  useAccounts,
  useDebtHistory,
  useDebts,
  useDeleteDebt,
  useDeleteTransaction,
  useUpdateDebt,
} from '../lib/queries'
import { toast, undoable } from '../lib/toast'

const isOpening = (t: Transaction) => t.type === 'debt_borrow' || t.type === 'debt_lend'

export function DebtDetailPage() {
  const { id = '' } = useParams()
  const goBack = useGoBack('/hutang')
  const debts = useDebts()
  const accounts = useAccounts()
  const history = useDebtHistory(id)
  const update = useUpdateDebt()
  const removeDebt = useDeleteDebt()
  const removePayment = useDeleteTransaction()

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Transaction | null>(null)
  const [removingPayment, setRemovingPayment] = useState<Transaction | null>(null)
  const [writingOff, setWritingOff] = useState(false)

  const debt = debts.data?.find((d) => d.id === id)
  const failed = [debts, accounts].find((q) => q.isError)

  if (failed || !debts.data || !accounts.data || !debt) {
    return (
      <>
        <SubPageHeader title="Hutang & Piutang" backTo="/hutang" />
        {failed ? (
          <LoadError error={failed.error} onRetry={() => failed.refetch()} />
        ) : debts.data && accounts.data ? (
          <p className={`mx-4 p-5 text-center text-sm text-slate-500 ${cardClass}`}>
            Catatan ini tidak ditemukan, mungkin sudah dihapus.{' '}
            <Link to="/hutang" className="font-medium text-emerald-600 underline">
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
  const status = debtStatus(debt, today)
  const payable = debt.direction === 'payable'
  const ratio = debt.amount > 0 ? Math.min(debt.paid / debt.amount, 1) : 0
  const walletName = (accountId: string | null) =>
    accountId
      ? (accounts.data.find((a) => a.id === accountId)?.name ?? 'Dompet terhapus')
      : 'Tanpa dompet'
  const daysLeft = debt.dueDate ? daysBetween(today, debt.dueDate) : null
  const paymentCount = history.data?.filter((t) => !isOpening(t)).length

  // Spell out everything a delete takes along, so nothing disappears by surprise.
  const deleteMessage = [
    `${debtTitle(debt)} sebesar ${formatRupiah(debt.amount)} akan dihapus permanen.`,
    debt.accountId &&
      `Uang yang tercatat ${payable ? 'masuk ke' : 'keluar dari'} ${walletName(debt.accountId)} saat itu ikut dibatalkan.`,
    debt.paid > 0 &&
      `${paymentCount ? `${paymentCount} pembayaran` : 'Semua pembayarannya'} (total ${formatRupiah(debt.paid)}) juga ikut terhapus.`,
    (debt.accountId || debt.paid > 0) && 'Saldo dompet dihitung ulang.',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <SubPageHeader
        title={debt.person}
        backTo="/hutang"
        action={
          <>
            <HeaderIconButton
              label={`Hapus ${payable ? 'hutang' : 'piutang'}`}
              onClick={() => setDeleting(true)}
            >
              <Trash2 className="size-5" aria-hidden />
            </HeaderIconButton>
            <HeaderIconButton label="Ubah catatan" onClick={() => setEditing(true)}>
              <Pencil className="size-5" aria-hidden />
            </HeaderIconButton>
          </>
        }
      />

      <section className={`mx-4 p-5 ${cardClass}`} aria-label="Ringkasan">
        <div className="flex items-start justify-between gap-3">
          <PersonAvatar debt={debt} size="lg" />
          <DebtStatusPill debt={debt} status={status} today={today} />
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{debtTitle(debt)}</p>
        <p className="text-3xl font-bold">{formatRupiah(debt.remaining)}</p>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          sisa dari {formatRupiah(debt.amount)}
          {debt.paid > 0 && ` · ${formatShare(ratio)} dibayar`}
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"
          role="progressbar"
          aria-label="Sudah dibayar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Stat label="Sudah dibayar" value={formatRupiah(debt.paid)} />
          <Stat
            label={payable ? 'Dipinjam' : 'Dipinjamkan'}
            value={formatDate(debt.date)}
            hint={walletName(debt.accountId)}
          />
          {debt.dueDate && daysLeft !== null && (
            <Stat
              label="Jatuh tempo"
              value={formatDate(debt.dueDate)}
              hint={
                debt.remaining === 0
                  ? undefined
                  : daysLeft < 0
                    ? `Lewat ${-daysLeft} hari`
                    : daysLeft === 0
                      ? 'Hari ini'
                      : `${daysLeft} hari lagi`
              }
            />
          )}
          {debt.note && <Stat label="Catatan" value={debt.note} />}
        </dl>
      </section>

      {debt.writtenOff ? (
        <div className={`mx-4 mt-4 p-4 text-sm ${cardClass}`}>
          <p className="text-slate-600 dark:text-slate-300">
            {payable
              ? 'Sisa hutang ini dianggap lunas tanpa uang berpindah.'
              : 'Sisa piutang ini sudah diikhlaskan.'}
          </p>
          {update.error && !writingOff && (
            <p role="alert" className="mt-2 text-rose-600 dark:text-rose-400">
              {errorMessage(update.error)}
            </p>
          )}
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: debt.id, writtenOff: false })}
            className={`${secondaryButtonClass} mt-3`}
          >
            <Undo2 className="size-4" aria-hidden />
            Batalkan
          </button>
        </div>
      ) : debt.remaining > 0 ? (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setPaying(true)} className={primaryButtonClass}>
            {payable ? (
              <ArrowUpRight className="size-5" aria-hidden />
            ) : (
              <ArrowDownLeft className="size-5" aria-hidden />
            )}
            {payable ? 'Bayar' : 'Terima'}
          </button>
          <button
            type="button"
            onClick={() => setWritingOff(true)}
            className={secondaryButtonClass}
          >
            <HeartHandshake className="size-4" aria-hidden />
            {writeOffLabel(debt)}
          </button>
        </div>
      ) : (
        <p className="mx-4 mt-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
          Lunas 🎉
        </p>
      )}

      <section className="mt-6" aria-labelledby="debt-history">
        <h2 id="debt-history" className="mx-4 mb-2 font-semibold">
          Riwayat
        </h2>
        {history.isError ? (
          <LoadError error={history.error} onRetry={() => history.refetch()} />
        ) : !history.data ? (
          <ListSkeleton rows={2} />
        ) : history.data.length === 0 ? (
          <p
            className={`mx-4 p-5 text-center text-sm text-slate-500 dark:text-slate-400 ${cardClass}`}
          >
            Belum ada pembayaran
            {debt.accountId ? '' : ', dan tidak ada uang yang berpindah saat dicatat'}.
          </p>
        ) : (
          <>
            <p className="mx-4 -mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
              Ketuk catatan untuk mengubah atau menghapusnya.
            </p>
            <ul
              className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
            >
              {history.data.map((t) => {
                const opening = isOpening(t)
                const into = t.type === 'debt_borrow' || t.type === 'debt_collect'
                const title = opening ? (payable ? 'Dipinjam' : 'Dipinjamkan') : 'Pembayaran'
                const detail = [
                  formatDayHeading(t.date),
                  `${into ? 'masuk ke' : 'dari'} ${walletName(t.accountId)}`,
                  t.note,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <li key={t.id}>
                    {/* The opening move belongs to the debt itself, so it opens the debt's form. */}
                    <button
                      type="button"
                      onClick={() => (opening ? setEditing(true) : setEditingPayment(t))}
                      aria-label={`${opening ? 'Ubah catatan' : 'Ubah pembayaran'} ${formatRupiah(t.amount)}, ${formatDate(t.date)}`}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800"
                    >
                      <span
                        aria-hidden
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          into
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                        }`}
                      >
                        {into ? (
                          <ArrowDownLeft className="size-5" />
                        ) : (
                          <ArrowUpRight className="size-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{title}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {detail}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatRupiah(t.amount)}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <Sheet
        open={paying}
        onClose={() => setPaying(false)}
        title={payable ? `Bayar ke ${debt.person}` : `Terima dari ${debt.person}`}
      >
        {paying && (
          <DebtPaymentForm debt={debt} accounts={accounts.data} onDone={() => setPaying(false)} />
        )}
      </Sheet>

      <Sheet
        open={editingPayment !== null}
        onClose={() => setEditingPayment(null)}
        title="Ubah pembayaran"
      >
        {editingPayment && (
          <DebtPaymentForm
            debt={debt}
            accounts={accounts.data}
            payment={editingPayment}
            onDone={() => setEditingPayment(null)}
            onDelete={() => {
              setRemovingPayment(editingPayment)
              setEditingPayment(null)
            }}
          />
        )}
      </Sheet>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Ubah catatan">
        {editing && (
          <DebtForm
            debt={debt}
            accounts={accounts.data}
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
        title={`Hapus ${payable ? 'hutang' : 'piutang'} ini?`}
        message={deleteMessage}
        confirmLabel="Hapus"
        pending={removeDebt.isPending}
        error={removeDebt.error ? errorMessage(removeDebt.error) : null}
        onConfirm={() =>
          removeDebt.mutate(
            { id: debt.id, withTransactions: debt.paid > 0 },
            {
              onSuccess: () => {
                toast(`${debtTitle(debt)} dihapus`)
                goBack()
              },
            },
          )
        }
        onClose={() => {
          setDeleting(false)
          removeDebt.reset()
        }}
      />

      <ConfirmSheet
        open={writingOff}
        title={`${writeOffLabel(debt)}?`}
        message={
          payable
            ? `Sisa ${formatRupiah(debt.remaining)} ke ${debt.person} dianggap lunas tanpa uang berpindah. Bisa dibatalkan nanti.`
            : `Sisa ${formatRupiah(debt.remaining)} dari ${debt.person} tidak ditagih lagi. Kekayaan bersihmu berkurang sebesar itu. Bisa dibatalkan nanti.`
        }
        confirmLabel={writeOffLabel(debt)}
        pending={update.isPending}
        error={update.error ? errorMessage(update.error) : null}
        onConfirm={() =>
          update.mutate(
            { id: debt.id, writtenOff: true },
            {
              onSuccess: () => {
                setWritingOff(false)
                undoable(payable ? 'Sisa hutang dianggap lunas' : 'Sisa piutang diikhlaskan', () =>
                  setWrittenOff(debt.id, false),
                )
              },
            },
          )
        }
        onClose={() => {
          setWritingOff(false)
          update.reset()
        }}
      />

      <ConfirmSheet
        open={removingPayment !== null}
        title="Hapus pembayaran ini?"
        message={
          removingPayment
            ? `Pembayaran ${formatRupiah(removingPayment.amount)} pada ${formatDate(removingPayment.date)} (${payable ? 'dari' : 'masuk ke'} ${walletName(removingPayment.accountId)}) akan dihapus. Sisa ${payable ? 'hutang' : 'piutang'} dan saldo dompet dihitung ulang.`
            : ''
        }
        confirmLabel="Hapus"
        pending={removePayment.isPending}
        error={removePayment.error ? errorMessage(removePayment.error) : null}
        onConfirm={() =>
          removingPayment &&
          removePayment.mutate(removingPayment.id, {
            onSuccess: () => {
              undoable('Pembayaran dihapus', () => undoDelete(removingPayment))
              setRemovingPayment(null)
            },
          })
        }
        onClose={() => {
          setRemovingPayment(null)
          removePayment.reset()
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
      {hint && <dd className="truncate text-xs text-slate-500 dark:text-slate-400">{hint}</dd>}
    </div>
  )
}
