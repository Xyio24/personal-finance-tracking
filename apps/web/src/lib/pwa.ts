import { useSyncExternalStore } from 'react'
import { isDemo } from './demo'

/** Chromium's install prompt event (not in the DOM typings yet). */
type InstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installPrompt: InstallPromptEvent | null = null
const installListeners = new Set<() => void>()
const notifyInstall = () => {
  for (const listener of installListeners) listener()
}
const subscribeInstall = (listener: () => void) => {
  installListeners.add(listener)
  return () => {
    installListeners.delete(listener)
  }
}

/**
 * Call once at startup. Registers the service worker (production only: in dev it would cache
 * stale code, and the demo may run from a file) and keeps the browser's install prompt so the
 * settings page can offer it with its own button.
 */
export function setupPwa() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event as InstallPromptEvent
    notifyInstall()
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    notifyInstall()
  })

  if (isDemo || !import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('Service worker tidak bisa didaftarkan', error)
    })
  })
}

/** Opened from the home screen rather than a browser tab. */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone/iPad: no install prompt, only "Add to Home Screen" from the share menu. */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribeInstall, () => installPrompt !== null)

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    // A prompt can only be used once; the browser fires a new event if it is allowed again.
    installPrompt = null
    notifyInstall()
  }

  return { canInstall, install }
}

function subscribeOnline(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine)
