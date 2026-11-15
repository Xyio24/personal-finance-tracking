import { WifiOff } from 'lucide-react'
import { useOnline } from '../lib/pwa'

/**
 * Shown on every screen while the device has no connection. The app itself still opens (the
 * service worker keeps it), but data is never stored offline, so lists wait for the network.
 */
export function OfflineNotice() {
  const online = useOnline()
  if (online) return null
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 bg-slate-800 px-4 pt-[calc(env(safe-area-inset-top)+0.375rem)] pb-1.5 text-xs font-medium text-white dark:bg-slate-700"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      Sedang offline. Data dimuat lagi begitu tersambung.
    </p>
  )
}
