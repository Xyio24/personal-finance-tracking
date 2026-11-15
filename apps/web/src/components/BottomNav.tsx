import { ArrowLeftRight, HandCoins, House, type LucideIcon, PiggyBank, Plus } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean }

const leftTabs: Tab[] = [
  { to: '/', label: 'Beranda', icon: House, end: true },
  { to: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
]
const rightTabs: Tab[] = [
  { to: '/tabungan', label: 'Tabungan', icon: PiggyBank },
  { to: '/hutang', label: 'Hutang', icon: HandCoins },
]

function TabLink({ to, label, icon: Icon, end }: Tab) {
  const { pathname } = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      // Tapping the tab you are on, scrolled down, goes back to the top first (like native apps).
      onClick={(e) => {
        if (pathname !== to) return
        e.preventDefault()
        if (window.scrollY <= 0) return
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      }}
      className={({ isActive }) =>
        `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
          isActive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-500 active:text-slate-700 dark:text-slate-400'
        }`
      }
    >
      <Icon className="size-6" aria-hidden />
      {label}
    </NavLink>
  )
}

export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {leftTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
        <div className="flex items-start justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Catat transaksi"
            className="-mt-5 flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 active:bg-emerald-700"
          >
            <Plus className="size-7" aria-hidden />
          </button>
        </div>
        {rightTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  )
}
