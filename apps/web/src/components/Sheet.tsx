import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Bottom sheet on phones (a centered dialog on wide screens), built on the native <dialog>. */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only catches backdrop taps; keyboard users close with Escape, which <dialog> handles natively
    <dialog
      ref={ref}
      onClose={onClose}
      // Tapping the dimmed backdrop (the dialog element itself) closes the sheet.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={title}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-0 text-slate-900 backdrop:bg-black/40 sm:mb-auto sm:rounded-3xl dark:bg-slate-900 dark:text-slate-100"
    >
      {open && (
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" />
          <div className="mt-2 mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-full p-2 text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
