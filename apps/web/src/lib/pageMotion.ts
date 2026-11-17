import { NavigationType } from 'react-router'

/**
 * How a newly shown page enters. Only the incoming page animates (the old one is gone in the
 * same commit), so this is a short "shared axis" hint rather than a full-width push:
 * - forward: going deeper (list → detail) slides in from the right
 * - back: going back up slides in from the left
 * - fade: switching between bottom-nav tabs, or to/from the login page
 * - none: same page (?bulan=, filters, search) or the browser already animated the back
 */
export type PageMotion = 'forward' | 'back' | 'fade' | 'none'

/** Bottom-nav destinations: siblings, so moving between them fades instead of sliding. */
const TAB_ROOTS = new Set(['/', '/transaksi', '/tabungan', '/hutang'])

/** Tabs 0; /laporan, /pengaturan, /hutang/:id, /tabungan/:id, /transaksi/baru|:id 1; /pengaturan/dompet 2. */
export function routeDepth(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (TAB_ROOTS.has(path)) return 0
  const segments = path.split('/').filter(Boolean)
  return TAB_ROOTS.has(`/${segments[0]}`) ? segments.length - 1 : segments.length
}

type Navigation = {
  type: NavigationType
  fromIndex: number
  toIndex: number
  /** The browser already animated this back/forward (iOS edge swipe, predictive back). */
  browserAnimated: boolean
}

export function pageMotion(from: string, to: string, nav: Navigation): PageMotion {
  if (from === to) return 'none'
  if (nav.type === NavigationType.Pop && nav.browserAnimated) return 'none'
  if (from === '/login' || to === '/login') return 'fade'
  const a = routeDepth(from)
  const b = routeDepth(to)
  if (a === 0 && b === 0) return 'fade' // tab switch
  // Back/forward through history: the history order decides the direction.
  if (nav.type === NavigationType.Pop && nav.toIndex !== nav.fromIndex) {
    return nav.toIndex < nav.fromIndex ? 'back' : 'forward'
  }
  if (b === 0 && nav.type === NavigationType.Push) return 'fade' // a tab from anywhere
  return b > a ? 'forward' : b < a ? 'back' : 'fade' // e.g. replace to /hutang after a delete
}

const EASE = 'cubic-bezier(0.2, 0, 0, 1)' // decelerate
const SLIDE = 32 // px: a hint of direction, not a full-width push
const SLIDE_MS = 280
const FADE_MS = 200
const REDUCED_MS = 150

/** Plays the entrance on the page frame (components/PageFrame.tsx). */
export function playPageMotion(motion: PageMotion) {
  if (motion === 'none') return
  const frame = document.querySelector<HTMLElement>('[data-page-frame]')
  const clip = frame?.parentElement
  if (!frame || !clip || typeof frame.animate !== 'function') return
  // A quick tap while a page is still coming in: the newer entrance takes over (for the same
  // properties the newest animation wins) and the older one runs out on its own. Never cancel()
  // or finish() it early: in Chromium that could leave the whole page unclickable, every tap
  // landing on the wrapper instead (seen under CPU load: debts.spec "the wallet you pick" failed
  // 6 of 8 parallel runs with cancel(), 8 of 8 with finish(), none without).
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const slide = !reduce && motion !== 'fade'
  // A slide pokes past the screen edge for a moment: clip it so the page never scrolls sideways.
  // Only while animating, because Safari jitters sticky headers inside overflow: clip.
  if (slide) clip.style.overflowX = 'clip'
  const x = motion === 'forward' ? SLIDE : -SLIDE
  const animation = slide
    ? frame.animate(
        [
          { opacity: 0, transform: `translateX(${x}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: SLIDE_MS, easing: EASE }, // fill 'none': nothing remains once it ends
      )
    : frame.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: reduce ? REDUCED_MS : FADE_MS,
        easing: 'ease-out',
      })
  // The clip goes once nothing is moving any more (an older slide may outlast a newer fade).
  animation.addEventListener('finish', () => {
    if (frame.getAnimations().length === 0) clip.style.removeProperty('overflow-x')
  })
}
