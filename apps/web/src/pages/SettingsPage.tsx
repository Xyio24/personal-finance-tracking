import {
  ChevronRight,
  CircleCheck,
  Download,
  LoaderCircle,
  LogOut,
  type LucideIcon,
  Share,
  Tags,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { PageHeader } from '../components/PageHeader'
import { useCurrentUser, useLogout } from '../lib/auth'
import { isIos, isStandalone, useInstallPrompt } from '../lib/pwa'

const listClass =
  'mx-4 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white dark:divide-slate-800 dark:bg-slate-900'
const rowClass = 'flex w-full items-center gap-3 px-4 py-3 text-left'
const pressableClass = `${rowClass} active:bg-slate-50 dark:active:bg-slate-800`

export function SettingsPage() {
  const user = useCurrentUser()
  const logout = useLogout()
  const { canInstall, install } = useInstallPrompt()

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

      <ul className={`${listClass} mt-4`}>
        <li>
          <Link to="/pengaturan/dompet" className={pressableClass}>
            <RowText icon={Wallet} label="Dompet" description="Tunai, rekening bank, e-wallet" />
            <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
        <li>
          <Link to="/pengaturan/kategori" className={pressableClass}>
            <RowText icon={Tags} label="Kategori" description="Jenis pemasukan dan pengeluaran" />
            <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        </li>
      </ul>

      <Section title="Aplikasi">
        {isStandalone() ? (
          <div className={rowClass}>
            <RowText
              icon={CircleCheck}
              label="Sudah terpasang"
              description="Kamu membukanya dari layar utama"
            />
          </div>
        ) : canInstall ? (
          <button type="button" onClick={install} className={pressableClass}>
            <RowText
              icon={Download}
              label="Pasang di layar utama"
              description="Buka seperti aplikasi biasa, tanpa bilah browser"
            />
          </button>
        ) : isIos() ? (
          <div className={rowClass}>
            <RowText
              icon={Share}
              label="Pasang di layar utama"
              description="Di Safari, tekan Bagikan lalu “Tambah ke Layar Utama”"
            />
          </div>
        ) : (
          <div className={rowClass}>
            <RowText
              icon={Download}
              label="Pasang di layar utama"
              description="Buka menu browser lalu pilih “Instal aplikasi” atau “Tambahkan ke layar utama”"
            />
          </div>
        )}
      </Section>

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="mx-4 mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      <div className={listClass}>{children}</div>
    </section>
  )
}

function RowText({
  icon: Icon,
  label,
  description,
}: {
  icon: LucideIcon
  label: string
  description: string
}) {
  return (
    <>
      <Icon className="size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </>
  )
}
