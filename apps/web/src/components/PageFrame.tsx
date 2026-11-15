import type { ReactNode } from 'react'
import { Outlet } from 'react-router'

/**
 * The part of the screen that animates on navigation (NavigationEffects). Keep position: fixed
 * out of pages: while the frame animates, its transform makes fixed children position against
 * it instead of the screen. Use sticky inside pages instead.
 */
export function PageFrame({ children }: { children?: ReactNode }) {
  return (
    <div>
      <div data-page-frame>{children ?? <Outlet />}</div>
    </div>
  )
}
