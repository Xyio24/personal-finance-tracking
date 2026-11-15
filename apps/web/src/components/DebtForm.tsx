import { type Account, type Debt, type DebtDirection, formatRupiah } from '@finance/shared'
import { LoaderCircle, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { formatDate, todayKey } from '../lib/format'
import { readLastAccount } from '../lib/lastAccount'
import { useCreateDebt, useDeleteDebt, useUpdateDebt } from '../lib/queries'
import { AmountInput } from './AmountInput'
import { ConfirmSheet } from './ConfirmSheet'
import { AccountPicker, DateField } from './Pickers'
import { SegmentedControl } from './SegmentedControl'
import { dangerButtonClass, inputClass, labelClass, primaryButtonClass } from './ui'

const directionOptions = [
  { value: 'payable', label: 'Aku pinjam' },
  { value: 'receivable', label: 'Aku meminjamkan' },
] as const

const hintClass = 'mt-1.5 text-xs text-slate-500 dark:text-slate-400'

/**
 * Create a hutang/piutang, or edit one. The direction, date and opening wallet are fixed once
 * created (they define how money moved); person, amount, due date and note stay editable.
 */
export function DebtForm({
  debt,
  accounts,
  initialDirection = 'payable',
  onDone,
}: {
  debt: Debt | null
  accounts: Account[]
  initialDirection?: DebtDirection
  onDone: (saved?: Debt) => void
}) {
  const choices = accounts.filter((a) => !a.archived)
  const last = readLastAccount()
  const [direction, setDirection] = useState<DebtDirection>(debt?.direction ?? initialDirection)
  const [person, setPerson] = useState(debt?.person ?? '')
  const [amount, setAmount] = useState(debt?.amount ?? 0)
  const [date, setDate] = useState(debt?.date ?? todayKey())
  const [accountId, setAccountId] = useState(
    choices.find((a) => a.id === last)?.id ?? choices[0]?.id ?? '',
  )
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? '')
  const [note, setNote] = useState(debt?.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const create = useCreateDebt()
  const update = useUpdateDebt()
  const remove = useDeleteDebt()
  const saving = create.isPending || update.isPending
  const saveError = create.error ?? update.error
  const belowPaid = debt !== null && amount < debt.paid
  const valid = person.trim().length > 0 && amount > 0 && !belowPaid

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || saving) return
    const shared = {
      person: person.trim(),
      amount,
      dueDate: dueDate || null,
      note: note.trim() || null,
    }
    if (debt) {
      update.mutate({ id: debt.id, ...shared }, { onSuccess: (saved) => onDone(saved) })
    } else {
      create.mutate(
        { ...shared, direction, date, accountId: accountId || null },
        { onSuccess: (saved) => onDone(saved) },
      )
    }
  }

  const payable = direction === 'payable'
  const openingWallet = debt?.accountId
    ? (accounts.find((a) => a.id === debt.accountId)?.name ?? 'dompet terhapus')
    : null

  return (
    <form onSubmit={submit} className="space-y-5">
      {debt ? (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {payable ? 'Dipinjam' : 'Dipinjamkan'} {formatDate(debt.date)}
          {openingWallet
            ? ` · uang ${payable ? 'masuk ke' : 'keluar dari'} ${openingWallet}`
            : ' · tanpa dompet'}
        </p>
      ) : (
        <SegmentedControl
          label="Jenis"
          value={direction}
          options={directionOptions}
          onChange={setDirection}
        />
      )}

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

      {!debt && (
        <>
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
        </>
      )}

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
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200 dark:bg-slate-800"
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
        />
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {errorMessage(saveError)}
        </p>
      )}

      <button type="submit" disabled={!valid || saving} className={primaryButtonClass}>
        {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Simpan
      </button>

      {debt && (
        <>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className={dangerButtonClass}
          >
            <Trash2 className="size-4" aria-hidden />
            Hapus
          </button>
          <ConfirmSheet
            open={confirmDelete}
            title="Hapus catatan ini?"
            message={`${payable ? 'Hutang ke' : 'Piutang dari'} ${debt.person} akan dihapus permanen, termasuk uang yang tercatat ${payable ? 'masuk' : 'keluar'} saat itu. Yang sudah punya pembayaran tidak bisa dihapus.`}
            confirmLabel="Hapus"
            pending={remove.isPending}
            error={remove.error ? errorMessage(remove.error) : null}
            onConfirm={() => remove.mutate(debt.id, { onSuccess: () => onDone() })}
            onClose={() => {
              setConfirmDelete(false)
              remove.reset()
            }}
          />
        </>
      )}
    </form>
  )
}
