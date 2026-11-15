import { ChevronRight, LoaderCircle, LogOut, type LucideIcon, Tags, Wallet } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { PageHeader } from '../components/PageHeader'
import { useCurrentUser, useLogout } from '../lib/auth'

const menu: { label: string; icon: LucideIcon }[] = [
  { label: 'Dompet', icon: Wallet },
  { label: 'Kategori', icon: Tags },
]

export function SettingsPage() {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <>
      <PageHeader title="Pengaturan" />

      <section className="mx-4 flex items-center gap-4 rounded-2xl bg-white p-4 dark:bg-slate-900">
        <Avatar name={user.name} email={user.email} src={user.avatarUrl} className="size-14" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name ?? 'Tanpa nama'}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
      </section>

      <ul className="mx-4 mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white dark:divide-slate-800 dark:bg-slate-900">
        {menu.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-center gap-3 px-4 py-3.5 text-slate-400">
            <Icon className="size-5" aria-hidden />
            <span className="flex-1">{label}</span>
            <span className="text-xs">Fase 1</span>
            <ChevronRight className="size-4" aria-hidden />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mx-4 mt-6 flex h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-2xl bg-white font-medium text-rose-600 active:bg-rose-50 disabled:opacity-60 dark:bg-slate-900 dark:text-rose-400 dark:active:bg-rose-950"
      >
        {logout.isPending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <LogOut className="size-5" aria-hidden />
        )}
        Keluar
      </button>
    </>
  )
}
