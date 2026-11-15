import { type Account, type Debt, formatRupiah, type Transaction } from '@finance/shared'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { readLastAccount, rememberAccount } from '../lib/lastAccount'
import { undoCreate, useSaveTransaction } from '../lib/queries'
import { toast, undoable } from '../lib/toast'
import { AmountInput } from './AmountInput'
import { AccountPicker, DateField } from './Pickers'
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
  const [amount, setAmount] = useState(payment?.amount ?? 0)
  const [accountId, setAccountId] = useState(
    payment?.accountId ?? choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? '',
  )
  const [date, setDate] = useState(payment?.date ?? todayKey())
  const [note, setNote] = useState(payment?.note ?? '')
  const save = useSaveTransaction()

  // Same rule as the server: the amount minus every other payment (a write-off doesn't count).
  const limit = payment ? debt.amount - debt.paid + payment.amount : debt.remaining
  const tooMuch = amount > limit
  const valid = amount > 0 && accountId !== '' && !tooMuch

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || save.isPending) return
    save.mutate(
      {
        id: payment?.id,
        input: {
          type: payable ? 'debt_repay' : 'debt_collect',
          amount,
          accountId,
          debtId: debt.id,
          date,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: (saved) => {
          rememberAccount(accountId)
          if (payment) toast('Pembayaran diperbarui')
          else {
            undoable(`Pembayaran ${formatRupiah(amount)} dicatat`, () => undoCreate(saved.id))
          }
          onDone()
        },
      },
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
          className={inputClass}
        />
      </div>

      {save.error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {errorMessage(save.error)}
        </p>
      )}

      <button type="submit" disabled={!valid || save.isPending} className={primaryButtonClass}>
        {save.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {payment ? 'Simpan' : payable ? 'Bayar' : 'Terima'}
      </button>

      {payment && onDelete && (
        <button type="button" onClick={onDelete} className={dangerButtonClass}>
          <Trash2 className="size-4" aria-hidden />
          Hapus pembayaran ini
        </button>
      )}
    </form>
  )
}
