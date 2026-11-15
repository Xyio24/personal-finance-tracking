import { type Account, type Debt, formatRupiah } from '@finance/shared'
import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { readLastAccount, rememberAccount } from '../lib/lastAccount'
import { useSaveTransaction } from '../lib/queries'
import { AmountInput } from './AmountInput'
import { AccountPicker, DateField } from './Pickers'
import { chipClass, inputClass, labelClass, primaryButtonClass } from './ui'

/** Pay back a hutang, or record money received for a piutang. Never more than what is left. */
export function DebtPaymentForm({
  debt,
  accounts,
  onDone,
}: {
  debt: Debt
  accounts: Account[]
  onDone: () => void
}) {
  const payable = debt.direction === 'payable'
  const choices = accounts.filter((a) => !a.archived)
  const last = readLastAccount()
  const [amount, setAmount] = useState(0)
  const [accountId, setAccountId] = useState(
    choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? '',
  )
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')
  const save = useSaveTransaction()

  const tooMuch = amount > debt.remaining
  const valid = amount > 0 && accountId !== '' && !tooMuch

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || save.isPending) return
    save.mutate(
      {
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
        onSuccess: () => {
          rememberAccount(accountId)
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
        <AmountInput id="payment-amount" value={amount} onChange={setAmount} autoFocus />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p
            className={`text-xs ${tooMuch ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {tooMuch ? 'Melebihi sisa. ' : ''}Sisa {formatRupiah(debt.remaining)}
          </p>
          <button
            type="button"
            onClick={() => setAmount(debt.remaining)}
            aria-pressed={amount === debt.remaining}
            className={`${chipClass(amount === debt.remaining)} h-8 text-xs`}
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
        {payable ? 'Bayar' : 'Terima'}
      </button>
    </form>
  )
}
