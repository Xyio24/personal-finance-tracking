import type { Category, CategoryColor, CategoryIcon, CategoryType } from '@finance/shared'
import { Archive, ArchiveRestore, ChevronRight, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { CategoryBadge } from '../components/Badges'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { ColorPicker, IconPicker } from '../components/Pickers'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { SegmentedControl } from '../components/SegmentedControl'
import { Sheet } from '../components/Sheet'
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
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../lib/queries'

const typeOptions = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
] as const

type Editing = Category | 'new' | null

export function CategoriesPage() {
  const { data, isPending, isError, error, refetch } = useCategories()
  const [type, setType] = useState<CategoryType>('expense')
  const [editing, setEditing] = useState<Editing>(null)

  const ofType = data?.filter((c) => c.type === type) ?? []
  const active = ofType.filter((c) => !c.archived)
  const archived = ofType.filter((c) => c.archived)

  return (
    <>
      <SubPageHeader
        title="Kategori"
        backTo="/pengaturan"
        action={
          <HeaderIconButton label="Tambah kategori" onClick={() => setEditing('new')}>
            <Plus className="size-5" aria-hidden />
          </HeaderIconButton>
        }
      />

      <div className="mx-4 mb-4">
        <SegmentedControl
          label="Jenis kategori"
          value={type}
          options={typeOptions}
          onChange={setType}
        />
      </div>

      {isPending ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <LoadError error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <CategoryList categories={active} onSelect={setEditing} />
          {active.length === 0 && (
            <p className="mx-4 text-sm text-slate-500">Belum ada kategori. Tambahkan satu.</p>
          )}
          {archived.length > 0 && (
            <>
              <h2 className="mx-4 mt-6 mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Diarsipkan
              </h2>
              <CategoryList categories={archived} onSelect={setEditing} />
            </>
          )}
        </>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Kategori baru' : 'Ubah kategori'}
      >
        {editing && (
          <CategoryForm
            key={editing === 'new' ? `new-${type}` : editing.id}
            category={editing === 'new' ? null : editing}
            type={type}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  )
}

function CategoryList({
  categories,
  onSelect,
}: {
  categories: Category[]
  onSelect: (category: Category) => void
}) {
  if (categories.length === 0) return null
  return (
    <ul
      className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
    >
      {categories.map((category) => (
        <li key={category.id}>
          <button
            type="button"
            onClick={() => onSelect(category)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800"
          >
            <CategoryBadge icon={category.icon} color={category.color} size="sm" />
            <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
            <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

const starter: Record<CategoryType, { icon: CategoryIcon; color: CategoryColor }> = {
  expense: { icon: 'shopping-bag', color: 'orange' },
  income: { icon: 'coins', color: 'emerald' },
}

function CategoryForm({
  category,
  type,
  onDone,
}: {
  category: Category | null
  type: CategoryType
  onDone: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState<CategoryIcon>(category?.icon ?? starter[type].icon)
  const [color, setColor] = useState<CategoryColor>(category?.color ?? starter[type].color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const saving = create.isPending || update.isPending
  const saveError = create.error ?? update.error
  const valid = name.trim().length > 0

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid || saving) return
    const fields = { name: name.trim(), icon, color }
    if (category) update.mutate({ id: category.id, ...fields }, { onSuccess: onDone })
    else create.mutate({ ...fields, type }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3">
        <CategoryBadge icon={icon} color={color} size="lg" />
        <div className="min-w-0 flex-1">
          <label htmlFor="category-name" className={labelClass}>
            Nama
          </label>
          <input
            id="category-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={type === 'expense' ? 'mis. Kopi, Parkir' : 'mis. Uang saku'}
            autoComplete="off"
          />
        </div>
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

      {category && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              update.mutate(
                { id: category.id, archived: !category.archived },
                { onSuccess: onDone },
              )
            }
            className={secondaryButtonClass}
          >
            {category.archived ? (
              <ArchiveRestore className="size-4" aria-hidden />
            ) : (
              <Archive className="size-4" aria-hidden />
            )}
            {category.archived ? 'Aktifkan' : 'Arsipkan'}
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

      {category && (
        <ConfirmSheet
          open={confirmDelete}
          title="Hapus kategori?"
          message={`Kategori "${category.name}" akan dihapus permanen. Kategori yang sudah dipakai transaksi tidak bisa dihapus, hanya diarsipkan.`}
          confirmLabel="Hapus"
          pending={remove.isPending}
          error={remove.error ? errorMessage(remove.error) : null}
          onConfirm={() => remove.mutate(category.id, { onSuccess: onDone })}
          onClose={() => {
            setConfirmDelete(false)
            remove.reset()
          }}
        />
      )}
    </form>
  )
}
