import { type Account, type Debt, type DebtDirection, formatRupiah } from '@finance/shared'
import { LoaderCircle, Trash2, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { clearDraft, useDraftField } from '../lib/drafts'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { readLastAccount, rememberAccount } from '../lib/lastAccount'
import { useMounted } from '../lib/navigation'
import { useCreateDebt, useUpdateDebt } from '../lib/queries'
import { AmountInput } from './AmountInput'
import { AccountPicker, DateField } from './Pickers'
import { SegmentedControl } from './SegmentedControl'
import { SheetFooter } from './Sheet'
import { dangerButtonClass, inputClass, labelClass, primaryButtonClass } from './ui'

const directionOptions = [
  { value: 'payable', label: 'Aku pinjam' },
  { value: 'receivable', label: 'Aku meminjamkan' },
] as const

const hintClass = 'mt-1.5 text-xs text-slate-500 dark:text-slate-400'

/**
 * Create a hutang/piutang, or correct one. Everything stays editable; the money move it opened
 * with follows the direction, amount, date and wallet. Only the direction is fixed once a
 * payment exists, because payments are recorded as "bayar" or "terima" by direction.
 */
export function DebtForm({
  debt,
  accounts,
  initialDirection = 'payable',
  onDone,
  onDelete,
}: {
  debt: Debt | null
  accounts: Account[]
  initialDirection?: DebtDirection
  onDone: (saved: Debt) => void
  /** Editing only: shows a delete button; the page asks for confirmation. */
  onDelete?: () => void
}) {
  // An archived wallet stays selectable for the debt that already uses it.
  const choices = accounts.filter((a) => !a.archived || a.id === debt?.accountId)
  const last = readLastAccount()
  // Typed values survive the sheet closing by accident; saving clears them.
  const draftKey = debt ? null : `debt:new:${initialDirection}`
  const [direction, setDirection] = useDraftField<DebtDirection>(
    draftKey,
    'direction',
    () => debt?.direction ?? initialDirection,
  )
  const [person, setPerson] = useDraftField(draftKey, 'person', () => debt?.person ?? '')
  const [amount, setAmount] = useDraftField(draftKey, 'amount', () => debt?.amount ?? 0)
  const [date, setDate] = useDraftField(draftKey, 'date', () => debt?.date ?? todayKey())
  const [accountId, setAccountId] = useDraftField(draftKey, 'accountId', () =>
    debt
      ? (debt.accountId ?? '')
      : (choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? ''),
  )
  const [dueDate, setDueDate] = useDraftField(draftKey, 'dueDate', () => debt?.dueDate ?? '')
  const [note, setNote] = useDraftField(draftKey, 'note', () => debt?.note ?? '')

  const create = useCreateDebt()
  const mounted = useMounted()
  const update = useUpdateDebt()
  const saving = create.isPending || update.isPending
  const saveError = create.error ?? update.error
  const hasPayments = debt !== null && debt.paid > 0
  const belowPaid = debt !== null && amount < debt.paid
  const valid = person.trim().length > 0 && amount > 0 && !belowPaid

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || saving) return
    const fields = {
      direction,
      person: person.trim(),
      amount,
      date,
      dueDate: dueDate || null,
      note: note.trim() || null,
      accountId: accountId || null,
    }
    // mutateAsync: the sheet may be closed while saving; the draft must still be cleared.
    const request = debt
      ? update.mutateAsync({ id: debt.id, ...fields })
      : create.mutateAsync(fields)
    request.then(
      (result: Debt) => {
        if (accountId) rememberAccount(accountId) // the next entry starts with this wallet too
        clearDraft(draftKey)
        if (mounted.current) onDone(result)
      },
      () => {}, // shown through the form's error
    )
  }

  const payable = direction === 'payable'
  const walletNotice = debt && walletChange(debt, { direction, amount, date, accountId }, accounts)

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        {hasPayments ? (
          <p className="rounded-xl bg-slate-900/5 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
            {payable ? 'Hutang (aku pinjam)' : 'Piutang (aku meminjamkan)'}
          </p>
        ) : (
          <SegmentedControl
            label="Jenis"
            value={direction}
            options={directionOptions}
            onChange={setDirection}
          />
        )}
        {hasPayments && (
          <p className={hintClass}>
            Sudah ada pembayaran, jadi jenisnya tidak bisa diganti. Kalau salah, hapus catatan ini
            lalu catat ulang.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="debt-person" className={labelClass}>
          {payable ? 'Pinjam dari siapa' : 'Dipinjamkan ke siapa'}
        </label>
        <input
          id="debt-person"
          className={inputClass}
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          maxLength={60}
          placeholder={payable ? 'mis. Kakak, Paylater' : 'mis. Budi'}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="debt-amount" className={labelClass}>
          Jumlah
        </label>
        <AmountInput id="debt-amount" value={amount} onChange={setAmount} />
        {belowPaid && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            Sudah dibayar {formatRupiah(debt.paid)}, jumlah tidak boleh lebih kecil dari itu.
          </p>
        )}
      </div>

      <DateField value={date} onChange={setDate} />
      <div>
        <AccountPicker
          label={payable ? 'Uang masuk ke' : 'Uang keluar dari'}
          accounts={choices}
          value={accountId}
          onChange={setAccountId}
          noneLabel="Tanpa dompet"
        />
        {!accountId && (
          <p className={hintClass}>
            Tidak ada uang yang berpindah, mis. beli barang dengan paylater.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="debt-due" className={labelClass}>
          Jatuh tempo <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="debt-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              aria-label="Hapus jatuh tempo"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-500 active:bg-slate-900/10 dark:bg-white/5"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="debt-note" className={labelClass}>
          Catatan
        </label>
        <input
          id="debt-note"
          className={inputClass}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Opsional, mis. buat servis motor"
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>

      {debt && onDelete && (
        <button type="button" onClick={onDelete} className={dangerButtonClass}>
          <Trash2 className="size-4" aria-hidden />
          Hapus {debt.direction === 'payable' ? 'hutang' : 'piutang'} ini
        </button>
      )}

      <SheetFooter notice={walletNotice} error={saveError ? errorMessage(saveError) : null}>
        <button type="submit" disabled={!valid || saving} className={primaryButtonClass}>
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Simpan
        </button>
      </SheetFooter>
    </form>
  )
}

/**
 * What saving the edit does to wallet money, in words, or null when no wallet is involved
 * before or after (e.g. a paylater debt stays without a wallet) or nothing about money changed.
 */
function walletChange(
  debt: Debt,
  next: { direction: DebtDirection; amount: number; date: string; accountId: string },
  accounts: Account[],
): string | null {
  const nextWallet = next.accountId || null
  const changed =
    next.direction !== debt.direction ||
    next.amount !== debt.amount ||
    next.date !== debt.date ||
    nextWallet !== debt.accountId
  if (!changed || (!debt.accountId && !nextWallet)) return null

  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'dompet terhapus'
  const way = (direction: DebtDirection) => (direction === 'payable' ? 'masuk ke' : 'keluar dari')
  const recount = 'dan saldo dompet dihitung ulang.'
  if (!debt.accountId && nextWallet) {
    return `Uang ${formatRupiah(next.amount)} dicatat ${way(next.direction)} ${name(nextWallet)}, ${recount}`
  }
  const recorded = `Uang yang tercatat ${way(debt.direction)} ${name(debt.accountId ?? '')} saat itu`
  return nextWallet
    ? `${recorded} ikut diperbaiki, ${recount}`
    : `${recorded} dibatalkan, ${recount}`
}
