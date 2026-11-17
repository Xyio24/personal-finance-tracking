import { ArrowLeftRight, HandCoins, House, type LucideIcon, PiggyBank, Plus } from 'lucide-react'
import { type MouseEvent, type PointerEvent, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import {
  activeTabIndex,
  atRest,
  LIFT_SPRING,
  nearestTab,
  pillShape,
  SLIDE_SPRING,
  type Spring,
  stepSpring,
} from '../lib/tabPill'

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

type Motion = {
  x: Spring
  lift: Spring
  /** Where the pill rests: the current tab's slot. */
  target: number
  index: number
  /** Slot width and the whole row's width, in px. */
  width: number
  row: number
  /** A finger pressing on the bar; once it slides sideways it drags the pill along. */
  press: { id: number; startX: number; dragging: boolean } | null
  /** The pill's left edge while dragged. */
  drag: number | null
  /** A drag ends with a click on the tab under the finger: that click must not navigate. */
  swallowClickUntil: number
  frame: number
  last: number
}

const DRAG_SLOP = 8 // px a finger moves before a press turns into a drag

/**
 * The glass pill that marks the current tab. It lives on top of the tabs and carries a copy of
 * them in the active color, magnified while it is lifted: that copy is what "shows through" the
 * glass. Copying our own tabs works in every browser, unlike refracting what's behind (only
 * Chromium can filter the backdrop with an SVG). Taps pass through it to the real links.
 * Full spec (sizes, materials, motion math): docs/LIQUID-GLASS.md.
 */
function useTabPill() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const row = useRef<HTMLDivElement>(null)
  const links = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLDivElement>(null)
  const shape = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const motion = useRef<Motion>({
    x: { value: 0, velocity: 0 },
    lift: { value: 0, velocity: 0 },
    target: 0,
    index: -1,
    width: 0,
    row: 0,
    press: null,
    drag: null,
    swallowClickUntil: 0,
    frame: 0,
    last: 0,
  })

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const paint = () => {
    const m = motion.current
    const [r, p, s, l, c] = [links.current, pill.current, shape.current, lens.current, copy.current]
    if (!r || !p || !s || !l || !c) return
    const x = m.x.value
    const { scaleX, scaleY, magnify } = pillShape(m.x.velocity, m.lift.value)
    // The real tabs get a see-through gap where the pill is, so under the clear lifted glass only
    // the magnified copy shows, not a second, offset label.
    const center = x + m.width / 2
    const half = m.index < 0 ? 0 : (m.width / 2) * scaleX
    r.style.setProperty('--hole-start', `${m.index < 0 ? -99 : center - half}px`)
    r.style.setProperty('--hole-end', `${m.index < 0 ? -99 : center + half}px`)
    p.style.transform = `translate3d(${x}px, 0, 0)`
    p.style.setProperty('--lift', m.lift.value.toFixed(3))
    s.style.transform = `scale(${scaleX}, ${scaleY})`
    l.style.transform = `scale(${scaleX}, ${scaleY})`
    // The copy lines up with the real tabs, then undoes the lens's stretch so what shows through
    // is only magnified, evenly, around the pill's center.
    c.style.transformOrigin = `${x + m.width / 2}px 50%`
    c.style.transform = `translate3d(${-x}px, 0, 0) scale(${magnify / scaleX}, ${magnify / scaleY})`
  }

  const tick = (now: number) => {
    const m = motion.current
    const dt = m.last ? (now - m.last) / 1000 : 1 / 60
    m.last = now
    const goal = m.drag ?? m.target
    if (reduced()) {
      m.x = { value: goal, velocity: 0 }
      m.lift = { value: 0, velocity: 0 }
    } else {
      m.x = stepSpring(m.x, goal, dt, SLIDE_SPRING)
      const moving = m.drag !== null || !atRest(m.x, goal, 0.5)
      m.lift = stepSpring(m.lift, moving ? 1 : 0, dt, LIFT_SPRING)
    }
    const settled = m.drag === null && atRest(m.x, goal) && atRest(m.lift, 0, 0.002)
    if (settled) {
      m.x = { value: goal, velocity: 0 }
      m.lift = { value: 0, velocity: 0 }
      m.frame = 0
      m.last = 0
    } else {
      m.frame = requestAnimationFrame(tick)
    }
    paint()
  }

  const animate = () => {
    const m = motion.current
    if (m.frame) return
    m.last = 0
    m.frame = requestAnimationFrame(tick)
  }

  // Measure the slots (and again whenever the bar changes width), before the first paint.
  // biome-ignore lint/correctness/useExhaustiveDependencies: measured once, then on resize; paint only reads refs
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const m = motion.current
    const measure = () => {
      const width = el.clientWidth
      if (!width) return
      m.row = width
      m.width = width / tabs.length
      if (pill.current) pill.current.style.width = `${m.width}px`
      if (copy.current) copy.current.style.width = `${width}px`
      m.target = Math.max(m.index, 0) * m.width
      if (!m.frame) m.x = { value: m.target, velocity: 0 }
      paint()
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(el)
    return () => {
      resize.disconnect()
      cancelAnimationFrame(m.frame)
      m.frame = 0
    }
  }, [])

  // Follow the route: slide to the new tab, or fade out on pages outside the tabs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: paint and animate only read refs
  useLayoutEffect(() => {
    const m = motion.current
    const el = pill.current
    const index = activeTabIndex(pathname, tabs)
    const wasHidden = m.index < 0
    m.index = index
    if (!el) return
    el.style.opacity = index < 0 ? '0' : '1'
    if (index < 0) {
      paint()
      return
    }
    m.target = index * m.width
    if (wasHidden) {
      // Coming back from a page without a tab: appear in place instead of sliding in.
      m.x = { value: m.target, velocity: 0 }
      paint()
      return
    }
    animate()
  }, [pathname])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const m = motion.current
    if (!e.isPrimary || e.button !== 0 || m.index < 0) return
    m.press = { id: e.pointerId, startX: e.clientX, dragging: false }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const m = motion.current
    const press = m.press
    if (!press || press.id !== e.pointerId) return
    if (!press.dragging) {
      if (Math.abs(e.clientX - press.startX) < DRAG_SLOP) return
      press.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    // The pill glides to sit under the finger, a little past the ends at most.
    const left = e.clientX - e.currentTarget.getBoundingClientRect().left - m.width / 2
    const overshoot = m.width * 0.12
    m.drag = Math.min(Math.max(left, -overshoot), m.row - m.width + overshoot)
    animate()
  }

  const endPress = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const m = motion.current
    const press = m.press
    if (!press || press.id !== e.pointerId) return
    m.press = null
    if (!press.dragging || m.drag === null) return
    const index = nearestTab(m.drag, m.width, tabs.length)
    m.drag = null
    if (!cancelled) {
      m.swallowClickUntil = performance.now() + 500
      m.target = index * m.width
      const tab = tabs[index]
      if (tab && index !== m.index) navigate(tab.to)
    }
    animate()
  }

  const onClickCapture = (e: MouseEvent) => {
    if (performance.now() < motion.current.swallowClickUntil) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return {
    refs: { row, links, pill, shape, lens, copy },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => endPress(e, false),
      onPointerCancel: (e: PointerEvent<HTMLDivElement>) => endPress(e, true),
      onClickCapture,
    },
  }
}

export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { refs, handlers } = useTabPill()
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
            className="tab-row relative h-full touch-none select-none"
          >
            <div ref={refs.links} className="tab-links grid h-full grid-cols-4">
              {tabs.map((tab) => (
                <TabLink key={tab.to} {...tab} />
              ))}
            </div>
            <div
              ref={refs.pill}
              aria-hidden
              className="tab-pill pointer-events-none absolute top-0 left-0 h-full"
            >
              <div ref={refs.shape} className="tab-pill-glass absolute inset-0 rounded-full" />
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
          // The same clear glass as the bar; the brand color is in the icon only.
          className="glass glass-button pointer-events-auto flex size-[3.875rem] shrink-0 items-center justify-center rounded-full text-emerald-600 dark:text-emerald-400"
        >
          <Plus className="size-7" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </nav>
  )
}
