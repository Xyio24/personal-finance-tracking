import { NavigationType } from 'react-router'
import { isDemo } from './demo'

/**
 * Scroll position per history entry (keyed by location.key), so going back returns to the same
 * spot in a long list. Positions are kept in memory and in sessionStorage (survives a reload,
 * never leaves the device, holds no financial data).
 */

type Entry = { y: number; index: number }
const STORAGE_KEY = 'finance:scroll'
const MAX_ENTRIES = 100
const RESTORE_TIMEOUT = 2000
const USER_INPUT = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const

const entries = new Map<string, Entry>(load())
let currentKey: string | null = null

function load(): [string, Entry][] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    // 'default' is the first entry of every launch: a position from an earlier launch means nothing.
    return Array.isArray(parsed)
      ? parsed.filter((item) => Array.isArray(item) && item[0] !== 'default')
      : []
  } catch {
    return []
  }
}

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...entries].slice(-MAX_ENTRIES)))
  } catch {
    // private mode or a sandboxed demo: memory only
  }
}

/** Position of a history entry: React Router's own index in the browser, counted here in the demo. */
export function historyIndex(key: string, type: NavigationType, previousIndex: number) {
  if (!isDemo) {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx
    if (typeof idx === 'number') return idx
  }
  if (type === NavigationType.Push) return previousIndex + 1
  if (type === NavigationType.Replace) return previousIndex
  return entries.get(key)?.index ?? previousIndex
}

export const savedScroll = (key: string) => entries.get(key)?.y ?? 0

/** From now on, scroll events count for this entry. */
export function enterEntry(key: string, index: number, y: number) {
  entries.delete(key) // re-insert so the newest entries are the ones kept under the cap
  entries.set(key, { index, y })
  currentKey = key
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value
    if (oldest !== undefined) entries.delete(oldest)
  }
}

/**
 * Records positions as they change: by the time a navigation's effects run, the old page is
 * already gone. Scroll events fire in the rendering step, never in the middle of a commit, so a
 * clamp caused by the new, shorter page arrives after the new entry is current.
 */
export function trackScroll() {
  const onScroll = () => {
    const entry = currentKey ? entries.get(currentKey) : undefined
    if (entry) entry.y = Math.max(0, Math.round(window.scrollY)) // iOS rubber band goes negative
  }
  // iOS may end a home-screen app without pagehide.
  const onHide = () => {
    if (document.visibilityState === 'hidden') save()
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', save)
  return () => {
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', save)
  }
}

/**
 * Scrolls to y. While lists are still loading, keeps trying as the page grows until it gets
 * there, the user touches the page, or 2 s pass. Returns a cancel function.
 */
export function restoreScroll(y: number): (() => void) | undefined {
  window.scrollTo(0, y)
  if (Math.abs(window.scrollY - y) < 2) return undefined
  const observer = new ResizeObserver(() => {
    window.scrollTo(0, y)
    if (Math.abs(window.scrollY - y) < 2) stop()
  })
  const timer = window.setTimeout(stop, RESTORE_TIMEOUT)
  function stop() {
    observer.disconnect()
    window.clearTimeout(timer)
    for (const type of USER_INPUT) window.removeEventListener(type, stop)
  }
  for (const type of USER_INPUT) window.addEventListener(type, stop, { passive: true })
  observer.observe(document.body)
  return stop
}
