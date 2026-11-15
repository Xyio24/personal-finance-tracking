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

export function toast(
  message: string,
  { action, tone = 'success' }: { action?: Toast['action']; tone?: Toast['tone'] } = {},
) {
  window.clearTimeout(timer)
  current = { id: nextId++, message, tone, action }
  emit()
  if (tone === 'success') haptic()
  // Long enough to read and reach "Urungkan", short enough not to linger.
  timer = window.setTimeout(dismissToast, action ? 6000 : 3500)
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
