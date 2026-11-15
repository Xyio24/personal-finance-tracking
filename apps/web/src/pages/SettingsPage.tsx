import { ChevronRight, LoaderCircle, LogOut, type LucideIcon, Tags, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { PageHeader } from '../components/PageHeader'
import { useCurrentUser, useLogout } from '../lib/auth'

const menu: { label: string; description: string; icon: LucideIcon; to?: string }[] = [
  {
    label: 'Dompet',
    description: 'Tunai, rekening bank, e-wallet',
    icon: Wallet,
    to: '/pengaturan/dompet',
  },
  { label: 'Kategori', description: 'Segera hadir', icon: Tags },
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
        {menu.map(({ label, description, icon: Icon, to }) => {
          const content = (
            <>
              <Icon className="size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
            </>
          )
          return (
            <li key={label}>
              {to ? (
                <Link
                  to={to}
                  className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 opacity-50">{content}</div>
              )}
            </li>
          )
        })}
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
