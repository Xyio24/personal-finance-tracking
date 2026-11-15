import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useGoBack } from '../lib/navigation'

type Props = {
  title: string
  /** Where "back" goes when the page was opened directly. */
  backTo: string
  action?: ReactNode
}

/** Header for second-level pages: back arrow, title, optional action on the right. */
export function SubPageHeader({ title, backTo, action }: Props) {
  const goBack = useGoBack(backTo)
  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 bg-slate-50/95 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur dark:bg-slate-950/95">
      <button
        type="button"
        onClick={goBack}
        aria-label="Kembali"
        className="rounded-full p-2.5 text-slate-600 active:bg-slate-200 dark:text-slate-300 dark:active:bg-slate-800"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {action}
    </header>
  )
}

/** Round icon button for the header's action slot. */
export function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-full p-2.5 text-slate-600 active:bg-slate-200 dark:text-slate-300 dark:active:bg-slate-800"
    >
      {children}
    </button>
  )
}
