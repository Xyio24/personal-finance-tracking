import { LoaderCircle } from 'lucide-react'
import { Sheet, SheetFooter } from './Sheet'
import { dangerButtonClass, secondaryButtonClass } from './ui'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

/** In-page confirmation for destructive actions (the browser's confirm() is not used). */
export function ConfirmSheet(props: Props) {
  const { open, title, message, confirmLabel, pending, error, onConfirm, onClose } = props
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="pb-3 text-slate-600 dark:text-slate-300">{message}</p>
      <SheetFooter error={error}>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={dangerButtonClass}
          >
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </SheetFooter>
    </Sheet>
  )
}
