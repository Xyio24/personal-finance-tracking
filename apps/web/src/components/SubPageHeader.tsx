import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useGoBack } from '../lib/navigation'
import { glassIconButtonClass } from './ui'

type Props = {
  title: string
  /** Where "back" goes when the page was opened directly. */
  backTo: string
  action?: ReactNode
}

/**
 * Header for second-level pages: back arrow, title, optional action on the right, as round glass
 * buttons. The page scrolls under it and fades out toward it (.scroll-edge), no hard bar.
 */
export function SubPageHeader({ title, backTo, action }: Props) {
  const goBack = useGoBack(backTo)
  return (
    <header className="scroll-edge sticky top-0 z-10 flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
      <button type="button" onClick={goBack} aria-label="Kembali" className={glassIconButtonClass}>
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      <div className="flex shrink-0 items-center gap-2">{action}</div>
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
    <button type="button" onClick={onClick} aria-label={label} className={glassIconButtonClass}>
      {children}
    </button>
  )
}
