import {
  type CategoryColor,
  type CategoryIcon,
  formatRupiah,
  type SavingsGoal,
} from '@finance/shared'
import { Archive, ArchiveRestore, LoaderCircle, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { useCreateGoal, useUpdateGoal } from '../lib/queries'
import { AmountInput } from './AmountInput'
import { CategoryBadge } from './Badges'
import { ColorPicker, IconPicker } from './Pickers'
import {
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui'

const amountBox = 'rounded-xl border border-slate-200 px-4 dark:border-slate-700'
const hintClass = 'mt-1.5 text-xs text-slate-500 dark:text-slate-400'

/** Create or edit a savings goal. `onDone` receives the saved goal. */
export function GoalForm({
  goal,
  onDone,
  onDelete,
}: {
  goal: SavingsGoal | null
  onDone: (saved: SavingsGoal) => void
  /** Editing only: shows a delete button; the page asks for confirmation. */
  onDelete?: () => void
}) {
  const [name, setName] = useState(goal?.name ?? '')
  const [icon, setIcon] = useState<CategoryIcon>(goal?.icon ?? 'piggy-bank')
  const [color, setColor] = useState<CategoryColor>(goal?.color ?? 'emerald')
  const [target, setTarget] = useState(goal?.targetAmount ?? 0)
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [initial, setInitial] = useState(goal?.initialAmount ?? 0)

  const create = useCreateGoal()
  const update = useUpdateGoal()
  const saving = create.isPending || update.isPending
  const saveError = create.error ?? update.error
  // Same rule as the server: lowering the starting amount can't leave the goal below zero
  // once part of it has been taken out (raising it, or keeping it, is always fine).
  const minimumInitial = goal ? Math.max(goal.initialAmount - goal.balance, 0) : 0
  const belowWithdrawn = goal !== null && initial < goal.initialAmount && initial < minimumInitial
  const valid = name.trim().length > 0 && !belowWithdrawn

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || saving) return
    const fields = {
      name: name.trim(),
      icon,
      color,
      targetAmount: target || null,
      deadline: deadline || null,
      initialAmount: initial,
    }
    if (goal) update.mutate({ id: goal.id, ...fields }, { onSuccess: onDone })
    else create.mutate(fields, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3">
        <CategoryBadge icon={icon} color={color} size="lg" />
        <div className="min-w-0 flex-1">
          <label htmlFor="goal-name" className={labelClass}>
            Nama tabungan
          </label>
          <input
            id="goal-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="mis. Dana darurat, Liburan"
            autoComplete="off"
          />
        </div>
      </div>

      <div>
        <label htmlFor="goal-target" className={labelClass}>
          Target <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <div className={amountBox}>
          <AmountInput id="goal-target" size="md" value={target} onChange={setTarget} />
        </div>
      </div>

      <div>
        <label htmlFor="goal-deadline" className={labelClass}>
          Deadline <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="goal-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          />
          {deadline && (
            <button
              type="button"
              onClick={() => setDeadline('')}
              aria-label="Hapus deadline"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200 dark:bg-slate-800"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>
        {deadline && !target && (
          <p className={hintClass}>
            Isi target juga supaya bisa dihitung berapa yang perlu ditabung tiap bulan.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="goal-initial" className={labelClass}>
          Sudah terkumpul
        </label>
        <div className={amountBox}>
          <AmountInput id="goal-initial" size="md" value={initial} onChange={setInitial} />
        </div>
        {belowWithdrawn && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
            Sebagian sudah diculik, jadi minimal {formatRupiah(minimumInitial)}.
          </p>
        )}
        <p className={hintClass}>
          Tabungan yang sudah ada sebelum mulai mencatat. Isi dan culik berikutnya dicatat terpisah;
          kalau salah ketik di salah satunya, ketuk catatannya di Riwayat.
        </p>
      </div>

      <IconPicker value={icon} color={color} onChange={setIcon} />
      <ColorPicker value={color} onChange={setColor} />

      {saveError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {errorMessage(saveError)}
        </p>
      )}

      <button type="submit" disabled={!valid || saving} className={primaryButtonClass}>
        {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Simpan
      </button>

      {goal && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                update.mutate({ id: goal.id, archived: !goal.archived }, { onSuccess: onDone })
              }
              className={secondaryButtonClass}
            >
              {goal.archived ? (
                <ArchiveRestore className="size-4" aria-hidden />
              ) : (
                <Archive className="size-4" aria-hidden />
              )}
              {goal.archived ? 'Aktifkan' : 'Arsipkan'}
            </button>
            {onDelete && (
              <button type="button" onClick={onDelete} className={dangerButtonClass}>
                <Trash2 className="size-4" aria-hidden />
                Hapus
              </button>
            )}
          </div>
        </>
      )}
    </form>
  )
}
