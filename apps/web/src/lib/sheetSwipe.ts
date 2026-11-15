/**
 * Swipe down to close a bottom sheet (phones only).
 *
 * Touch events, not pointer events: once the browser starts panning the scrollable sheet it
 * sends pointercancel, while preventing the deciding touchmove keeps the gesture ours. React
 * registers touch listeners as passive, so these are native listeners with passive: false.
 */

const DECIDE_PX = 3 // below the browser's own slop, so the deciding touchmove is still cancelable
const TAP_SLOP = 10 // a drag shorter than this still lets the tap through
const CLOSE_RATIO = 0.25 // released past this share of the height: close
const FLICK = 0.4 // px/ms downward at release: close however short the drag
const STRETCH = 32 // px the sheet can be pulled up at most (rubber band)
const NO_DRAG = 'input, textarea, select, [contenteditable], [role="slider"], [data-sheet-no-drag]'

type Gesture = {
  x: number
  y: number
  target: Element
  mode: 'pending' | 'drag' | 'native' | 'backdrop'
  height: number
  offset: number
  samples: { t: number; y: number }[]
}

/** Back to fully open after a drag that did not close. */
export function settleSheet(dialog: HTMLElement) {
  delete dialog.dataset.dragging
  dialog.style.setProperty('--sheet-drag', '0px')
  dialog.style.setProperty('--sheet-progress', '0')
}

export function resetSheetDrag(dialog: HTMLElement) {
  delete dialog.dataset.dragging
  for (const name of ['--sheet-drag', '--sheet-progress', '--sheet-flick']) {
    dialog.style.removeProperty(name)
  }
}

export function attachSheetSwipe(
  dialog: HTMLDialogElement,
  sheet: { close: () => void; isOpen: () => boolean },
) {
  const wide = window.matchMedia('(min-width: 40rem)') // Tailwind sm: centered dialog, no swiping
  let g: Gesture | null = null

  function onStart(e: TouchEvent) {
    if (g?.mode === 'drag') settleSheet(dialog) // a second finger ends the drag
    g = null
    const target = e.target as Element
    const touch = e.touches[0]
    // Touches in a sheet opened from this one belong to that sheet.
    if (e.touches.length !== 1 || !touch || target.closest('dialog') !== dialog) return
    const mode =
      target === dialog
        ? 'backdrop'
        : wide.matches || dialog.dataset.state !== 'open'
          ? 'native'
          : 'pending'
    g = {
      x: touch.clientX,
      y: touch.clientY,
      target,
      mode,
      height: dialog.offsetHeight,
      offset: 0,
      samples: [],
    }
  }

  function onMove(e: TouchEvent) {
    if (!g || g.mode === 'native') return
    if (g.mode === 'backdrop') {
      // Home-screen apps on iOS scroll the page behind despite overflow: hidden.
      if (e.cancelable) e.preventDefault()
      return
    }
    const touch = e.touches[0]
    if (!touch) return
    if (g.mode === 'pending') {
      const dx = touch.clientX - g.x
      const dy = touch.clientY - g.y
      if (Math.abs(dx) < DECIDE_PX && Math.abs(dy) < DECIDE_PX) return
      // Never fight a scroll the browser has already started.
      if (!e.cancelable || !startsDrag(g.target, dialog, dx, dy)) {
        g.mode = 'native'
        return
      }
      g.mode = 'drag'
      g.y = touch.clientY // measure from here so the sheet does not jump
      dialog.dataset.dragging = ''
    }
    if (e.cancelable) e.preventDefault()
    const raw = touch.clientY - g.y
    // Downward follows the finger; upward is a damped rubber band (like iOS).
    g.offset = raw >= 0 ? raw : -STRETCH * (1 - 1 / ((-raw * 0.55) / STRETCH + 1))
    dialog.style.setProperty('--sheet-drag', `${g.offset}px`)
    dialog.style.setProperty('--sheet-progress', String(Math.max(0, g.offset) / g.height))
    const now = performance.now()
    g.samples.push({ t: now, y: touch.clientY })
    while (g.samples.length > 2 && now - (g.samples[0]?.t ?? now) > 100) g.samples.shift()
  }

  function onEnd(e: TouchEvent) {
    const done = g
    g = null
    if (done?.mode !== 'drag') return
    // A real drag that began on a button must not press it.
    if (Math.abs(done.offset) > TAP_SLOP && e.cancelable) e.preventDefault()
    const v = velocity(done.samples)
    const close =
      e.type === 'touchend' &&
      done.offset > TAP_SLOP &&
      (v > FLICK || (done.offset > done.height * CLOSE_RATIO && v > -0.1))
    if (!close) {
      settleSheet(dialog)
      return
    }
    // A fast flick finishes fast.
    const ms = Math.min(260, Math.max(160, (done.height - done.offset) / Math.max(v, 1)))
    dialog.style.setProperty('--sheet-flick', `${Math.round(ms)}ms`)
    sheet.close() // the parent sets open=false; the sheet animates out from where it was let go
    window.setTimeout(() => {
      if (sheet.isOpen()) settleSheet(dialog) // the parent kept it open after all
    }, 0)
  }

  dialog.addEventListener('touchstart', onStart, { passive: true })
  dialog.addEventListener('touchmove', onMove, { passive: false })
  dialog.addEventListener('touchend', onEnd, { passive: false })
  dialog.addEventListener('touchcancel', onEnd)
  return () => {
    dialog.removeEventListener('touchstart', onStart)
    dialog.removeEventListener('touchmove', onMove)
    dialog.removeEventListener('touchend', onEnd)
    dialog.removeEventListener('touchcancel', onEnd)
  }
}

/** Whether a vertical touch move should drag the sheet instead of scrolling something. */
export function startsDrag(target: Element, dialog: HTMLElement, dx: number, dy: number) {
  if (Math.abs(dy) <= Math.abs(dx)) return false // sideways: chip rows scroll natively
  if (target.closest('[data-sheet-grab]')) return true // handle and header always drag
  if (target.closest(NO_DRAG)) return false // text fields keep caret and selection gestures
  for (let el: Element | null = target; el && el !== dialog; el = el.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(el)
    const scrollsX = /auto|scroll/.test(overflowX) && el.scrollWidth > el.clientWidth
    if (scrollsX && Math.abs(dy) < 2 * Math.abs(dx)) return false // chip rows need a clear pull
    const scrollsY = /auto|scroll/.test(overflowY) && el.scrollHeight > el.clientHeight + 1
    if (scrollsY && (dy < 0 || el.scrollTop > 0)) return false
  }
  if (dy > 0) return dialog.scrollTop <= 0 // pull down from the top
  // A sheet that can't scroll stretches upward instead of scrolling the page behind it.
  return dialog.scrollHeight - dialog.clientHeight <= 1
}

function velocity(samples: { t: number; y: number }[]) {
  const now = performance.now()
  const recent = samples.filter((s) => now - s.t <= 100)
  const first = recent[0]
  const last = recent[recent.length - 1]
  if (!first || !last || first === last) return 0
  return (last.y - first.y) / Math.max(1, last.t - first.t)
}
