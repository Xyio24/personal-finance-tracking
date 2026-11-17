/**
 * The glass pill under the current bottom-nav tab (components/BottomNav.tsx): which tab it marks
 * and the spring it moves on. Plain functions, so the motion can be tested without a browser.
 */

export type NavTab = { to: string; end?: boolean }

/** Index of the tab the path belongs to (like NavLink's active check), or -1 for none. */
export function activeTabIndex(pathname: string, tabs: readonly NavTab[]) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return tabs.findIndex((tab) =>
    tab.end || tab.to === '/' ? path === tab.to : path === tab.to || path.startsWith(`${tab.to}/`),
  )
}

/** The tab whose slot holds most of a pill that starts at x (tabs `width` apart, from 0). */
export function nearestTab(x: number, width: number, count: number) {
  if (width <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(x / width)))
}

export type Spring = { value: number; velocity: number }

/** Stiffness (1/s²) and damping ratio (1 = no overshoot, below 1 = a little bounce). */
export type SpringConfig = { stiffness: number; damping: number }

/** Slide: quick, with a small overshoot that reads as liquid rather than springy. */
export const SLIDE_SPRING: SpringConfig = { stiffness: 320, damping: 0.72 }
/** Lift (pill rising off the bar and settling back): softer, no bounce. */
export const LIFT_SPRING: SpringConfig = { stiffness: 260, damping: 0.95 }

const SUBSTEP = 1 / 240 // s: small steps keep the integration stable on slow frames

/** Advances a damped spring toward target by dt seconds (capped, so a stalled tab can't jump). */
export function stepSpring(spring: Spring, target: number, dt: number, config: SpringConfig) {
  let { value, velocity } = spring
  const damping = 2 * config.damping * Math.sqrt(config.stiffness)
  let left = Math.min(Math.max(dt, 0), 1 / 20)
  while (left > 0) {
    const h = Math.min(SUBSTEP, left)
    velocity += (-config.stiffness * (value - target) - damping * velocity) * h
    value += velocity * h
    left -= h
  }
  return { value, velocity }
}

/** Close enough to the target to stop animating. */
export function atRest(spring: Spring, target: number, epsilon = 0.05) {
  return Math.abs(spring.value - target) < epsilon && Math.abs(spring.velocity) < epsilon * 10
}

/**
 * How the pill looks at a moment: moving fast it stretches along its path and thins a little
 * (like a drop), lifted it grows past the bar. `lift` runs 0 (resting) .. 1 (lifted).
 */
export function pillShape(velocity: number, lift: number) {
  const stretch = Math.min(Math.abs(velocity) / 3200, 0.22)
  return {
    scaleX: (1 + stretch) * (1 + 0.14 * lift),
    scaleY: (1 - stretch * 0.45) * (1 + 0.26 * lift),
    /** What shows through the lifted pill is magnified, the same in both directions. */
    magnify: 1 + 0.12 * lift,
  }
}
