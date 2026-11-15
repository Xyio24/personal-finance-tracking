import {
  type Account,
  formatRupiah,
  type SavingsGoal,
  type SavingsType,
  type Transaction,
} from '@finance/shared'
import { LoaderCircle, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { clearDraft, useDraftField } from '../lib/drafts'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { readLastAccount, rememberAccount } from '../lib/lastAccount'
import { undoCreate, useSaveTransaction } from '../lib/queries'
import { toast, undoable } from '../lib/toast'
import { AmountInput } from './AmountInput'
import { AccountPicker, DateField } from './Pickers'
import { dangerButtonClass, inputClass, labelClass, primaryButtonClass } from './ui'

/**
 * Put money into a goal ("isi") or take it back out ("culik"), or correct such an entry
 * (`move`). The goal never goes below zero, with the same limits the server applies.
 */
export function GoalMoveForm({
  goal,
  type,
  accounts,
  move,
  onDone,
  onDelete,
}: {
  goal: SavingsGoal
  type: SavingsType
  accounts: Account[]
  move?: Transaction
  onDone: () => void
  /** Correcting only: shows a delete button; the page asks for confirmation. */
  onDelete?: () => void
}) {
  const isDeposit = type === 'saving_deposit'
  // An archived wallet stays selectable for the entry that already uses it.
  const choices = accounts.filter((a) => !a.archived || a.id === move?.accountId)
  const last = readLastAccount()
  // Typed values survive the sheet closing by accident; saving clears them.
  const draftKey = move ? null : `move:${goal.id}:${type}`
  const [amount, setAmount] = useDraftField(draftKey, 'amount', () => move?.amount ?? 0)
  const [accountId, setAccountId] = useDraftField(
    draftKey,
    'accountId',
    () => move?.accountId ?? choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? '',
  )
  const [date, setDate] = useDraftField(draftKey, 'date', () => move?.date ?? todayKey())
  const [note, setNote] = useDraftField(draftKey, 'note', () => move?.note ?? '')
  const save = useSaveTransaction()

  // What the goal holds without the entry being corrected.
  const balanceWithout = move
    ? goal.balance + (isDeposit ? -move.amount : move.amount)
    : goal.balance
  // A culik can take at most what is there; an isi can only shrink as far as what was already
  // taken out of it again allows.
  const tooMuch = !isDeposit && amount > balanceWithout
  const minimum = isDeposit ? Math.max(-balanceWithout, 0) : 0
  const tooLittle = isDeposit && amount > 0 && amount < minimum
  const valid = amount > 0 && accountId !== '' && !tooMuch && !tooLittle

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || save.isPending) return
    save.mutate(
      {
        id: move?.id,
        input: { type, amount, accountId, goalId: goal.id, date, note: note.trim() || null },
      },
      {
        onSuccess: (saved) => {
          rememberAccount(accountId)
          clearDraft(draftKey)
          if (move) toast('Perubahan disimpan')
          else {
            undoable(
              isDeposit
                ? `Isi ${formatRupiah(amount)} ke ${goal.name}`
                : `Culik ${formatRupiah(amount)} dari ${goal.name} 🥷`,
              () => undoCreate(saved.id),
            )
          }
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
        <AmountInput id="move-amount" value={amount} onChange={setAmount} autoFocus={!move} />
        {!isDeposit && (
          <p
            className={`mt-1 text-xs ${tooMuch ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {tooMuch ? 'Melebihi isi tabungan. ' : ''}
            {move ? 'Paling banyak' : 'Isi tabungan saat ini'} {formatRupiah(balanceWithout)}.
          </p>
        )}
        {tooLittle && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            Sebagian sudah diculik, jadi minimal {formatRupiah(minimum)}.
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
          enterKeyHint="done"
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
        {move ? 'Simpan' : isDeposit ? 'Isi tabungan' : 'Culik 🥷'}
      </button>

      {move && onDelete && (
        <button type="button" onClick={onDelete} className={dangerButtonClass}>
          <Trash2 className="size-4" aria-hidden />
          Hapus catatan ini
        </button>
      )}
    </form>
  )
}
