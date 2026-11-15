import { useSyncExternalStore } from 'react'
import { errorMessage } from './errors'

/**
 * Short confirmations at the bottom of the screen ("Pengeluaran Rp 38.000 dicatat · Urungkan").
 * One at a time: a new one replaces the current one.
 */
export type Toast = {
  id: number
  message: string
  tone: 'success' | 'info'
  action?: { label: string; run: () => void }
}

let current: Toast | null = null
let nextId = 1
let timer = 0
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}

let waiting = 0

export function toast(
  message: string,
  { action, tone = 'success' }: { action?: Toast['action']; tone?: Toast['tone'] } = {},
) {
  if (tone === 'success') haptic() // right away, while the tap still counts as recent
  const ticket = ++waiting
  const startedAt = Date.now()
  // A sheet that is closing stays modal for its exit animation, and a modal dialog hides and
  // silences everything behind it: wait for it to go (at most 3 s).
  const show = () => {
    if (ticket !== waiting) return // a newer toast replaced this one meanwhile
    if (document.querySelector('dialog:modal') && Date.now() - startedAt < 3000) {
      window.setTimeout(show, 50)
      return
    }
    current = { id: nextId++, message, tone, action }
    emit()
    resumeToast()
  }
  show()
}

/** Long enough to read and reach "Urungkan", short enough not to linger. */
export function resumeToast() {
  window.clearTimeout(timer)
  if (current) timer = window.setTimeout(dismissToast, current.action ? 6000 : 3500)
}

/** Keeps the toast up while a finger or keyboard focus is on it. */
export function pauseToast() {
  window.clearTimeout(timer)
}

/** A toast with "Urungkan"; if undoing fails (e.g. offline), says why. */
export function undoable(message: string, undo: () => Promise<unknown>) {
  toast(message, {
    action: {
      label: 'Urungkan',
      run: () => {
        undo().then(
          () => toast('Sudah diurungkan', { tone: 'info' }),
          (error: unknown) => toast(errorMessage(error), { tone: 'info' }),
        )
      },
    },
  })
}

export function dismissToast() {
  window.clearTimeout(timer)
  current = null
  emit()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useToast = () => useSyncExternalStore(subscribe, () => current)

/** A tiny tick on Android after a save (iOS has no vibration API). Never without a recent tap. */
function haptic() {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } })
    .userActivation
  if (!('vibrate' in navigator) || !activation?.isActive) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate(10)
}
