import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      {children ?? (
        <LoaderCircle className="size-8 animate-spin text-emerald-600" aria-label="Memuat" />
      )}
    </div>
  )
}
