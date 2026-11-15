import { ACCOUNT_TYPES, type Account, type AccountType, formatRupiah } from '@finance/shared'
import { Archive, ArchiveRestore, ChevronRight, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { AmountInput } from '../components/AmountInput'
import { AccountBadge } from '../components/Badges'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { SegmentedControl } from '../components/SegmentedControl'
import { Sheet, SheetFooter } from '../components/Sheet'
import { HeaderIconButton, SubPageHeader } from '../components/SubPageHeader'
import {
  cardClass,
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/ui'
import { errorMessage } from '../lib/errors'
import {
  setArchived,
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../lib/queries'
import { toast, undoable } from '../lib/toast'
import { accountTypes } from '../lib/visuals'

type Editing = Account | 'new' | null

export function AccountsPage() {
  const { data: accounts, isPending, isError, error, refetch } = useAccounts()
  const [editing, setEditing] = useState<Editing>(null)

  const active = accounts?.filter((a) => !a.archived) ?? []
  const archived = accounts?.filter((a) => a.archived) ?? []
  const total = accounts?.reduce((sum, a) => sum + a.balance, 0) ?? 0

  return (
    <>
      <SubPageHeader
        title="Dompet"
        backTo="/pengaturan"
        action={
          <HeaderIconButton label="Tambah dompet" onClick={() => setEditing('new')}>
            <Plus className="size-5" aria-hidden />
          </HeaderIconButton>
        }
      />

      {isPending ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <LoadError error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <section className={`mx-4 mb-4 p-4 ${cardClass}`}>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total saldo semua dompet</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatRupiah(total)}</p>
          </section>

          <AccountList accounts={active} onSelect={setEditing} />
          {active.length === 0 && (
            <div className={`mx-4 p-5 text-center ${cardClass}`}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada dompet aktif.</p>
              <button
                type="button"
                onClick={() => setEditing('new')}
                className={`${primaryButtonClass} mt-3`}
              >
                Tambah dompet
              </button>
            </div>
          )}

          {archived.length > 0 && (
            <>
              <h2 className="mx-4 mt-6 mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Diarsipkan
              </h2>
              <AccountList accounts={archived} onSelect={setEditing} />
            </>
          )}
        </>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Dompet baru' : 'Ubah dompet'}
      >
        {editing && (
          <AccountForm
            key={editing === 'new' ? 'new' : editing.id}
            account={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  )
}

function AccountList({
  accounts,
  onSelect,
}: {
  accounts: Account[]
  onSelect: (account: Account) => void
}) {
  if (accounts.length === 0) return null
  return (
    <ul
      className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
    >
      {accounts.map((account) => (
        <li key={account.id}>
          <button
            type="button"
            onClick={() => onSelect(account)}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-slate-100 dark:active:bg-slate-800"
          >
            <AccountBadge type={account.type} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{account.name}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {accountTypes[account.type].label}
              </span>
            </span>
            <span
              className={`font-semibold tabular-nums ${account.balance < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}
            >
              {formatRupiah(account.balance)}
            </span>
            <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

const typeOptions = ACCOUNT_TYPES.map((type) => ({ value: type, label: accountTypes[type].label }))

function AccountForm({ account, onDone }: { account: Account | null; onDone: () => void }) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank')
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance ?? 0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const create = useCreateAccount()
  const update = useUpdateAccount()
  const remove = useDeleteAccount()
  const saving = create.isPending || update.isPending
  const saveError = create.error ?? update.error
  const valid = name.trim().length > 0

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || saving) return
    const input = { name: name.trim(), type, initialBalance }
    if (account) update.mutate({ id: account.id, ...input }, { onSuccess: onDone })
    else create.mutate(input, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="account-name" className={labelClass}>
          Nama
        </label>
        <input
          id="account-name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="mis. BCA, GoPay, Dompet"
          autoComplete="off"
        />
      </div>

      <div>
        <span className={labelClass}>Jenis</span>
        <SegmentedControl
          label="Jenis dompet"
          value={type}
          options={typeOptions}
          onChange={setType}
        />
      </div>

      <div>
        <label htmlFor="account-initial" className={labelClass}>
          Saldo awal
        </label>
        <div className="rounded-xl border border-slate-200 px-4 dark:border-slate-700">
          <AmountInput
            id="account-initial"
            size="md"
            value={initialBalance}
            onChange={setInitialBalance}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Saldo saat mulai mencatat. Setelah itu saldo dihitung otomatis dari transaksi.
        </p>
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {errorMessage(saveError)}
        </p>
      )}

      {account && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              update.mutate(
                { id: account.id, archived: !account.archived },
                {
                  onSuccess: () => {
                    undoable(
                      `"${account.name}" ${account.archived ? 'aktif lagi' : 'diarsipkan'}`,
                      () => setArchived('accounts', account.id, account.archived),
                    )
                    onDone()
                  },
                },
              )
            }
            className={secondaryButtonClass}
          >
            {account.archived ? (
              <ArchiveRestore className="size-4" aria-hidden />
            ) : (
              <Archive className="size-4" aria-hidden />
            )}
            {account.archived ? 'Aktifkan' : 'Arsipkan'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className={dangerButtonClass}
          >
            <Trash2 className="size-4" aria-hidden />
            Hapus
          </button>
        </div>
      )}

      {account && (
        <ConfirmSheet
          open={confirmDelete}
          title="Hapus dompet?"
          message={`Dompet "${account.name}" akan dihapus permanen. Dompet yang sudah punya transaksi tidak bisa dihapus, hanya diarsipkan.`}
          confirmLabel="Hapus"
          pending={remove.isPending}
          error={remove.error ? errorMessage(remove.error) : null}
          onConfirm={() =>
            remove.mutate(account.id, {
              onSuccess: () => {
                toast(`Dompet "${account.name}" dihapus`)
                onDone()
              },
            })
          }
          onClose={() => {
            setConfirmDelete(false)
            remove.reset()
          }}
        />
      )}

      <SheetFooter>
        <button type="submit" disabled={!valid || saving} className={primaryButtonClass}>
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Simpan
        </button>
      </SheetFooter>
    </form>
  )
}
