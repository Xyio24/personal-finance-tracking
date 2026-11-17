import { type MouseEvent, type PointerEvent, useLayoutEffect, useRef } from 'react'
import {
  atRest,
  LIFT_SPRING,
  nearestTab,
  pillShape,
  SLIDE_SPRING,
  type Spring,
  stepSpring,
} from '../lib/tabPill'

type Motion = {
  x: Spring
  lift: Spring
  /** Where the pill rests: the chosen slot. */
  target: number
  index: number
  count: number
  /** Slot width and the whole row's width, in px. */
  width: number
  row: number
  /** A finger pressing on the row; once it slides sideways it drags the pill along. */
  press: { id: number; startX: number; dragging: boolean } | null
  /** The pill's left edge while dragged. */
  drag: number | null
  /** A drag ends with a click on the option under the finger: that click must not count. */
  swallowClickUntil: number
  frame: number
  last: number
}

const DRAG_SLOP = 8 // px a finger moves before a press turns into a drag

/**
 * The liquid glass pill that marks the chosen slot in a row of equal slots: the bottom-nav tabs
 * and every segmented control. The pill sits on top of the options and carries a copy of them
 * in the chosen style, magnified while it is lifted: that copy is what "shows through" the
 * glass. Copying our own options works in every browser, unlike refracting what's behind (only
 * Chromium can filter the backdrop with an SVG). Taps pass through it to the real options.
 *
 * `index` -1 hides the pill. `onPick` gets the slot a drag was let go on. The element behind
 * `refs.links` gets --hole-start/--hole-end: a gap under the pill (see .liquid-links).
 * Full spec (sizes, materials, motion math): docs/LIQUID-GLASS.md.
 */
export function useLiquidPill(index: number, count: number, onPick: (index: number) => void) {
  const row = useRef<HTMLDivElement>(null)
  const links = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLDivElement>(null)
  const shape = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const pick = useRef(onPick)
  pick.current = onPick
  const motion = useRef<Motion>({
    x: { value: 0, velocity: 0 },
    lift: { value: 0, velocity: 0 },
    target: 0,
    index: -1,
    count,
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
    // The real options get a see-through gap where the pill is, so under the clear lifted glass
    // only the magnified copy shows, not a second, offset label.
    const center = x + m.width / 2
    const half = m.index < 0 ? 0 : (m.width / 2) * scaleX
    r.style.setProperty('--hole-start', `${m.index < 0 ? -99 : center - half}px`)
    r.style.setProperty('--hole-end', `${m.index < 0 ? -99 : center + half}px`)
    p.style.transform = `translate3d(${x}px, 0, 0)`
    p.style.setProperty('--lift', m.lift.value.toFixed(3))
    s.style.transform = `scale(${scaleX}, ${scaleY})`
    l.style.transform = `scale(${scaleX}, ${scaleY})`
    // The copy lines up with the real options, then undoes the lens's stretch so what shows
    // through is only magnified, evenly, around the pill's center.
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

  // Measure the slots (and again whenever the row changes width), before the first paint.
  // biome-ignore lint/correctness/useExhaustiveDependencies: paint only reads refs
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const m = motion.current
    m.count = count
    const measure = () => {
      const width = el.clientWidth
      if (!width) return
      m.row = width
      m.width = width / m.count
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
  }, [count])

  // Follow the choice: slide to the new slot, or fade out when nothing is chosen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: paint and animate only read refs
  useLayoutEffect(() => {
    const m = motion.current
    const el = pill.current
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
      // Nothing was chosen before: appear in place instead of sliding in.
      m.x = { value: m.target, velocity: 0 }
      paint()
      return
    }
    animate()
  }, [index])

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
    const slot = nearestTab(m.drag, m.width, m.count)
    m.drag = null
    if (!cancelled) {
      m.swallowClickUntil = performance.now() + 500
      m.target = slot * m.width
      if (slot !== m.index) pick.current(slot)
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
