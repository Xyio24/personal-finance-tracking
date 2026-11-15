import {
  type Account,
  type Category,
  isSavingsType,
  type Transaction,
  type TransactionInput,
} from '@finance/shared'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { AmountInput } from '../components/AmountInput'
import { CategoryBadge } from '../components/Badges'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { AccountPicker, DateField } from '../components/Pickers'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { SegmentedControl } from '../components/SegmentedControl'
import { HeaderIconButton, SubPageHeader } from '../components/SubPageHeader'
import { inputClass, labelClass, primaryButtonClass } from '../components/ui'
import { errorMessage } from '../lib/errors'
import { todayKey } from '../lib/format'
import { useGoBack } from '../lib/navigation'
import {
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useSaveTransaction,
  useTransaction,
} from '../lib/queries'
import { transactionTypes } from '../lib/visuals'

/** The kinds this form records. Savings deposits/withdrawals have their own screens. */
const FORM_TYPES = ['expense', 'income', 'transfer'] as const
type FormType = (typeof FORM_TYPES)[number]

/** Create (/transaksi/baru?type=expense) or edit (/transaksi/:id) a transaction. */
export function TransactionFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const transaction = useTransaction(id)
  const accounts = useAccounts()
  const categories = useCategories()

  const title = id ? 'Ubah transaksi' : 'Catat transaksi'
  const failed = [transaction, accounts, categories].find((q) => q.isError)

  if (failed) {
    return (
      <Screen title={title}>
        <LoadError error={failed.error} onRetry={() => failed.refetch()} />
      </Screen>
    )
  }
  if ((id && !transaction.data) || !accounts.data || !categories.data) {
    return (
      <Screen title={title}>
        <ListSkeleton rows={3} />
      </Screen>
    )
  }

  // Savings entries are managed on their goal's page.
  if (transaction.data && isSavingsType(transaction.data.type)) {
    return <Navigate to={`/tabungan/${transaction.data.goalId}`} replace />
  }

  const requested = params.get('type') as FormType | null
  const type = requested && FORM_TYPES.includes(requested) ? requested : 'expense'

  return (
    <TransactionForm
      key={transaction.data?.id ?? 'new'}
      existing={transaction.data}
      initialType={type}
      accounts={accounts.data}
      categories={categories.data}
    />
  )
}

function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <SubPageHeader title={title} backTo="/transaksi" />
      {children}
    </div>
  )
}

// Remember the last wallet used, so the next entry starts there. Purely a convenience:
// storage may be unavailable (private mode), and then the first wallet is used.
const LAST_ACCOUNT_KEY = 'finance:last-account'
const readLastAccount = () => {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY)
  } catch {
    return null
  }
}
const rememberAccount = (id: string) => {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, id)
  } catch {
    // ignore
  }
}

type Draft = {
  type: FormType
  amount: number
  accountId: string
  toAccountId: string
  categoryId: string
  date: string
  note: string
}

function initialDraft(
  existing: Transaction | undefined,
  type: FormType,
  accounts: Account[],
): Draft {
  if (existing) {
    return {
      type: existing.type as FormType, // savings entries never reach this form
      amount: existing.amount,
      accountId: existing.accountId,
      toAccountId: existing.toAccountId ?? '',
      categoryId: existing.categoryId ?? '',
      date: existing.date,
      note: existing.note ?? '',
    }
  }
  const active = accounts.filter((a) => !a.archived)
  const last = readLastAccount()
  const from = active.find((a) => a.id === last)?.id ?? active[0]?.id ?? ''
  const to = active.find((a) => a.id !== from)?.id ?? ''
  return {
    type,
    amount: 0,
    accountId: from,
    toAccountId: to,
    categoryId: '',
    date: todayKey(),
    note: '',
  }
}

// Expense first: it is what gets recorded most, and matches the quick-add sheet.
const typeOptions = (['expense', 'income', 'transfer'] as const).map((t) => ({
  value: t,
  label: transactionTypes[t].label,
}))

function TransactionForm({
  existing,
  initialType,
  accounts,
  categories,
}: {
  existing: Transaction | undefined
  initialType: FormType
  accounts: Account[]
  categories: Category[]
}) {
  const [draft, setDraft] = useState(() => initialDraft(existing, initialType, accounts))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const save = useSaveTransaction()
  const remove = useDeleteTransaction()
  const goBack = useGoBack('/transaksi')
  const _today = todayKey()

  // Archived wallets and categories stay visible only when this entry already uses them.
  const usable = (item: { id: string; archived: boolean }, ...ids: string[]) =>
    !item.archived || ids.includes(item.id)
  const accountChoices = accounts.filter((a) => usable(a, draft.accountId, draft.toAccountId))
  // The wallet list may still be loading or refreshing when the form opens: fall back to the
  // first suitable wallet instead of leaving a picker empty (and the save button disabled).
  const accountId = draft.accountId || accountChoices[0]?.id || ''
  const toAccountId = draft.toAccountId || accountChoices.find((a) => a.id !== accountId)?.id || ''
  const categoryChoices = categories.filter(
    (c) => c.type === draft.type && usable(c, draft.categoryId),
  )

  const isTransfer = draft.type === 'transfer'
  const valid =
    draft.amount > 0 &&
    accountId !== '' &&
    (isTransfer
      ? toAccountId !== '' && toAccountId !== accountId
      : categoryChoices.some((c) => c.id === draft.categoryId))

  function changeType(type: FormType) {
    const keepCategory = categories.some((c) => c.id === draft.categoryId && c.type === type)
    set({ type, categoryId: keepCategory ? draft.categoryId : '' })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || save.isPending) return
    const common = { amount: draft.amount, date: draft.date, note: draft.note.trim() || null }
    const { type } = draft
    const input: TransactionInput =
      type === 'transfer'
        ? { type, ...common, accountId, toAccountId }
        : { type, ...common, accountId, categoryId: draft.categoryId }
    save.mutate(
      { id: existing?.id, input },
      {
        onSuccess: () => {
          rememberAccount(accountId)
          goBack()
        },
      },
    )
  }

  if (accountChoices.length === 0) {
    return (
      <Screen title="Catat transaksi">
        <p className="mx-4 text-slate-600 dark:text-slate-300">
          Belum ada dompet aktif.{' '}
          <Link to="/pengaturan/dompet" className="font-medium text-emerald-600 underline">
            Tambahkan dompet
          </Link>{' '}
          dulu untuk mulai mencatat.
        </p>
      </Screen>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <SubPageHeader
        title={existing ? 'Ubah transaksi' : 'Catat transaksi'}
        backTo="/transaksi"
        action={
          existing && (
            <HeaderIconButton label="Hapus transaksi" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-5" aria-hidden />
            </HeaderIconButton>
          )
        }
      />

      <form
        id="transaction-form"
        onSubmit={submit}
        className="space-y-6 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]"
      >
        <SegmentedControl
          label="Jenis transaksi"
          value={draft.type}
          options={typeOptions}
          onChange={changeType}
        />

        <div>
          <label htmlFor="amount" className={labelClass}>
            Jumlah
          </label>
          <AmountInput
            id="amount"
            value={draft.amount}
            onChange={(amount) => set({ amount })}
            autoFocus={!existing}
            toneClass={transactionTypes[draft.type].amountClass}
          />
        </div>

        {isTransfer ? (
          <>
            <AccountPicker
              label="Dari dompet"
              accounts={accountChoices}
              value={accountId}
              onChange={(accountId) =>
                set({
                  accountId,
                  // Never leave both sides on the same wallet.
                  toAccountId:
                    accountId === toAccountId
                      ? (accountChoices.find((a) => a.id !== accountId)?.id ?? '')
                      : toAccountId,
                })
              }
            />
            <AccountPicker
              label="Ke dompet"
              accounts={accountChoices.filter((a) => a.id !== accountId)}
              value={toAccountId}
              onChange={(toAccountId) => set({ toAccountId })}
            />
            {accountChoices.length < 2 && (
              <p className="text-sm text-slate-500">
                Transfer butuh minimal dua dompet.{' '}
                <Link to="/pengaturan/dompet" className="font-medium text-emerald-600 underline">
                  Tambah dompet
                </Link>
              </p>
            )}
          </>
        ) : (
          <>
            <fieldset>
              <div className="mb-1.5 flex items-center justify-between">
                <legend className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Kategori
                </legend>
                <Link
                  to="/pengaturan/kategori"
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Atur
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {categoryChoices.map((category) => {
                  const selected = category.id === draft.categoryId
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => set({ categoryId: category.id })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition ${
                        selected
                          ? 'bg-emerald-50 ring-2 ring-emerald-500 dark:bg-emerald-950'
                          : 'active:bg-slate-100 dark:active:bg-slate-800'
                      }`}
                    >
                      <CategoryBadge icon={category.icon} color={category.color} />
                      <span className="line-clamp-2 text-center text-xs leading-tight">
                        {category.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <AccountPicker
              label="Dompet"
              accounts={accountChoices}
              value={accountId}
              onChange={(accountId) => set({ accountId })}
            />
          </>
        )}

        <DateField value={draft.date} onChange={(date) => set({ date })} />

        <div>
          <label htmlFor="note" className={labelClass}>
            Catatan
          </label>
          <input
            id="note"
            value={draft.note}
            onChange={(e) => set({ note: e.target.value })}
            maxLength={200}
            placeholder="Opsional, mis. nasi padang"
            autoComplete="off"
            className={inputClass}
          />
        </div>

        {save.error && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {errorMessage(save.error)}
          </p>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto max-w-md">
          <button
            type="submit"
            form="transaction-form"
            disabled={!valid || save.isPending}
            className={primaryButtonClass}
          >
            {save.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Simpan
          </button>
        </div>
      </div>

      {existing && (
        <ConfirmSheet
          open={confirmDelete}
          title="Hapus transaksi?"
          message="Transaksi ini akan dihapus permanen dan saldo dompet dihitung ulang."
          confirmLabel="Hapus"
          pending={remove.isPending}
          error={remove.error ? errorMessage(remove.error) : null}
          onConfirm={() => remove.mutate(existing.id, { onSuccess: goBack })}
          onClose={() => {
            setConfirmDelete(false)
            remove.reset()
          }}
        />
      )}
    </div>
  )
}
