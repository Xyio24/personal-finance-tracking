import { useState } from 'react'
import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'
import { QuickAddSheet } from './QuickAddSheet'

/** Mobile-first layout: content column + fixed bottom navigation with a center "+" button. */
export function AppShell() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <Outlet />
      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}
