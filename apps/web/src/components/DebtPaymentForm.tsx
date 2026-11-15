import { type Account, type Debt, formatRupiah, type Transaction } from '@finance/shared'
import { LoaderCircle, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { clearDraft, useDraftField } from '../lib/drafts'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { readLastAccount, rememberAccount } from '../lib/lastAccount'
import { useMounted } from '../lib/navigation'
import { undoCreate, useSaveTransaction } from '../lib/queries'
import { toast, undoable } from '../lib/toast'
import { AmountInput } from './AmountInput'
import { AccountPicker, DateField } from './Pickers'
import { SheetFooter } from './Sheet'
import { chipClass, dangerButtonClass, inputClass, labelClass, primaryButtonClass } from './ui'

/**
 * Pay back a hutang, or record money received for a piutang; or correct such a payment
 * (`payment`). Never more than what is left, counting the payment being corrected as unpaid.
 */
export function DebtPaymentForm({
  debt,
  accounts,
  payment,
  onDone,
  onDelete,
}: {
  debt: Debt
  accounts: Account[]
  payment?: Transaction
  onDone: () => void
  /** Correcting only: shows a delete button; the page asks for confirmation. */
  onDelete?: () => void
}) {
  const payable = debt.direction === 'payable'
  // An archived wallet stays selectable for the payment that already uses it.
  const choices = accounts.filter((a) => !a.archived || a.id === payment?.accountId)
  const last = readLastAccount()
  // Typed values survive the sheet closing by accident; saving clears them.
  const draftKey = payment ? null : `pay:${debt.id}`
  const [amount, setAmount] = useDraftField(draftKey, 'amount', () => payment?.amount ?? 0)
  const [accountId, setAccountId] = useDraftField(
    draftKey,
    'accountId',
    () => payment?.accountId ?? choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? '',
  )
  const [date, setDate] = useDraftField(draftKey, 'date', () => payment?.date ?? todayKey())
  const [note, setNote] = useDraftField(draftKey, 'note', () => payment?.note ?? '')
  const save = useSaveTransaction()
  const mounted = useMounted()

  // Same rule as the server: the amount minus every other payment (a write-off doesn't count).
  const limit = payment ? debt.amount - debt.paid + payment.amount : debt.remaining
  const tooMuch = amount > limit
  const valid = amount > 0 && accountId !== '' && !tooMuch

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || save.isPending) return
    // mutateAsync: the sheet may be closed while saving; the draft must still be cleared.
    save
      .mutateAsync({
        id: payment?.id,
        input: {
          type: payable ? 'debt_repay' : 'debt_collect',
          amount,
          accountId,
          debtId: debt.id,
          date,
          note: note.trim() || null,
        },
      })
      .then(
        (saved) => {
          rememberAccount(accountId)
          clearDraft(draftKey)
          if (payment) toast('Pembayaran diperbarui')
          else {
            undoable(`Pembayaran ${formatRupiah(amount)} dicatat`, () => undoCreate(saved.id))
          }
          if (mounted.current) onDone()
        },
        () => {}, // shown through save.error
      )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="payment-amount" className={labelClass}>
          Jumlah
        </label>
        <AmountInput id="payment-amount" value={amount} onChange={setAmount} autoFocus={!payment} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p
            className={`text-xs ${tooMuch ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {tooMuch ? 'Melebihi sisa. ' : ''}
            {payment ? 'Paling banyak' : 'Sisa'} {formatRupiah(limit)}
          </p>
          <button
            type="button"
            onClick={() => setAmount(limit)}
            aria-pressed={amount === limit}
            className={`${chipClass(amount === limit)} h-8 text-xs`}
          >
            Lunasi semua
          </button>
        </div>
      </div>

      <AccountPicker
        label={payable ? 'Bayar dari dompet' : 'Masuk ke dompet'}
        accounts={choices}
        value={accountId}
        onChange={setAccountId}
      />
      <DateField value={date} onChange={setDate} />

      <div>
        <label htmlFor="payment-note" className={labelClass}>
          Catatan
        </label>
        <input
          id="payment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Opsional, mis. cicilan ke-2"
          autoComplete="off"
          enterKeyHint="done"
          className={inputClass}
        />
      </div>

      {payment && onDelete && (
        <button type="button" onClick={onDelete} className={dangerButtonClass}>
          <Trash2 className="size-4" aria-hidden />
          Hapus pembayaran ini
        </button>
      )}

      <SheetFooter error={save.error ? errorMessage(save.error) : null}>
        <button type="submit" disabled={!valid || save.isPending} className={primaryButtonClass}>
          {save.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {payment ? 'Simpan' : payable ? 'Bayar' : 'Terima'}
        </button>
      </SheetFooter>
    </form>
  )
}
