import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../lib/auth'
import { Avatar } from './Avatar'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  /** Optional button shown before the avatar, e.g. "add". */
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: Props) {
  const user = useCurrentUser()

  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
      <div className="min-w-0">
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        <h1 className="truncate text-xl font-bold">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action}
        <Link to="/pengaturan" aria-label="Pengaturan akun" className="rounded-full">
          <Avatar name={user.name} email={user.email} src={user.avatarUrl} />
        </Link>
      </div>
    </header>
  )
}
