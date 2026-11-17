import { ArrowLeftRight, HandCoins, House, type LucideIcon, PiggyBank, Plus } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { activeTabIndex } from '../lib/tabPill'
import { useLiquidPill } from './useLiquidPill'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean }

const tabs: Tab[] = [
  { to: '/', label: 'Beranda', icon: House, end: true },
  { to: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { to: '/tabungan', label: 'Tabungan', icon: PiggyBank },
  { to: '/hutang', label: 'Hutang', icon: HandCoins },
]

/** Shared by the real tabs and their copy inside the pill, so the two line up to the pixel. */
const cellClass =
  'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] font-medium'
const activeText = 'text-emerald-600 dark:text-emerald-400'

function TabLink({ to, label, icon: Icon, end }: Tab) {
  const { pathname } = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      // A mouse drag on the bar moves the pill; it must not start dragging the link itself.
      draggable={false}
      // Tapping the tab you are on, scrolled down, goes back to the top first (like native apps).
      onClick={(e) => {
        if (pathname !== to) return
        e.preventDefault()
        if (window.scrollY <= 0) return
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      }}
      // Always the resting color: the current tab gets its color from the pill sitting on it, so
      // a tab the pill has left (dragged or sliding away) is never colored twice.
      className={`${cellClass} rounded-full text-slate-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500 dark:text-slate-100`}
    >
      <Icon className="size-6" aria-hidden />
      <span className="max-w-full truncate px-0.5">{label}</span>
    </NavLink>
  )
}

/** The floating glass tab bar; the current tab sits under a liquid glass pill (useLiquidPill). */
export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { refs, handlers } = useLiquidPill(activeTabIndex(pathname, tabs), tabs.length, (i) => {
    const tab = tabs[i]
    if (tab) navigate(tab.to)
  })
  return (
    <nav
      data-bottom-nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 pb-[calc(env(safe-area-inset-bottom)+0.625rem)]"
    >
      {/* Keeps the bar readable over a busy page scrolling under it. */}
      <div aria-hidden className="nav-scrim absolute inset-x-0 bottom-0 -top-6" />
      <div className="relative mx-auto flex max-w-md items-center gap-2.5 px-4">
        <div className="glass pointer-events-auto h-[3.875rem] min-w-0 flex-1 rounded-full p-1">
          <div
            ref={refs.row}
            {...handlers}
            className="liquid-row relative h-full touch-none select-none"
          >
            <div ref={refs.links} className="liquid-links grid h-full grid-cols-4">
              {tabs.map((tab) => (
                <TabLink key={tab.to} {...tab} />
              ))}
            </div>
            <div
              ref={refs.pill}
              aria-hidden
              className="liquid-pill pointer-events-none absolute top-0 left-0 h-full"
            >
              <div
                ref={refs.shape}
                className="liquid-shape nav-pill absolute inset-0 rounded-full"
              />
              <div ref={refs.lens} className="absolute inset-0 overflow-hidden rounded-full">
                <div
                  ref={refs.copy}
                  className={`absolute inset-y-0 left-0 grid grid-cols-4 ${activeText}`}
                >
                  {tabs.map(({ to, label, icon: Icon }) => (
                    <span key={to} className={cellClass}>
                      <Icon className="size-6" aria-hidden />
                      <span className="max-w-full truncate px-0.5">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onQuickAdd}
          aria-label="Catat transaksi"
          // The same clear glass as the bar, with a plain black (dark: white) icon, like iOS.
          className="glass glass-button pointer-events-auto flex size-[3.875rem] shrink-0 items-center justify-center rounded-full text-slate-900 dark:text-white"
        >
          <Plus className="size-7" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </nav>
  )
}
