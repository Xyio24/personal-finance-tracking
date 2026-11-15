import { type Account, formatRupiah, type SavingsGoal, type SavingsType } from '@finance/shared'
import { LoaderCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { readLastAccount, rememberAccount } from '../lib/lastAccount'
import { useSaveTransaction } from '../lib/queries'
import { AmountInput } from './AmountInput'
import { AccountPicker, DateField } from './Pickers'
import { inputClass, labelClass, primaryButtonClass } from './ui'

/** Put money into a goal ("isi") or take it back out ("culik"). */
export function GoalMoveForm({
  goal,
  type,
  accounts,
  onDone,
}: {
  goal: SavingsGoal
  type: SavingsType
  accounts: Account[]
  onDone: () => void
}) {
  const isDeposit = type === 'saving_deposit'
  const choices = accounts.filter((a) => !a.archived)
  const last = readLastAccount()
  const [amount, setAmount] = useState(0)
  const [accountId, setAccountId] = useState(
    choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? '',
  )
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')
  const save = useSaveTransaction()

  const tooMuch = !isDeposit && amount > goal.balance
  const valid = amount > 0 && accountId !== '' && !tooMuch

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || save.isPending) return
    save.mutate(
      {
        input: { type, amount, accountId, goalId: goal.id, date, note: note.trim() || null },
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
        <label htmlFor="move-amount" className={labelClass}>
          Jumlah
        </label>
        <AmountInput id="move-amount" value={amount} onChange={setAmount} autoFocus />
        {!isDeposit && (
          <p
            className={`mt-1 text-xs ${tooMuch ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {tooMuch ? 'Melebihi isi tabungan. ' : ''}Isi tabungan saat ini{' '}
            {formatRupiah(goal.balance)}.
          </p>
        )}
      </div>

      <AccountPicker
        label={isDeposit ? 'Ambil dari dompet' : 'Masukkan ke dompet'}
        accounts={choices}
        value={accountId}
        onChange={setAccountId}
      />
      <DateField value={date} onChange={setDate} />

      <div>
        <label htmlFor="move-note" className={labelClass}>
          {isDeposit ? 'Catatan' : 'Alasan menculik'}
        </label>
        <input
          id="move-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder={isDeposit ? 'Opsional, mis. sisa gaji' : 'Opsional, mis. servis motor'}
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
        {isDeposit ? 'Isi tabungan' : 'Culik 🥷'}
      </button>
    </form>
  )
}
