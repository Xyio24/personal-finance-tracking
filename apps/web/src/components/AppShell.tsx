import { useState } from 'react'
import { isDemo } from '../lib/demo'
import { BottomNav } from './BottomNav'
import { PageFrame } from './PageFrame'
import { QuickAddSheet } from './QuickAddSheet'

/** Mobile-first layout: content column + a floating glass tab bar with a "+" button beside it. */
export function AppShell() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      {isDemo && (
        <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          Mode demo — login Google dilewati, data tidak tersimpan
        </p>
      )}
      <PageFrame />
      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}
