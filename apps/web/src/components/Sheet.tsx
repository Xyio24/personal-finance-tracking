import { X } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  type SyntheticEvent,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { attachSheetSwipe, resetSheetDrag } from '../lib/sheetSwipe'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** True inside a sheet that is animating closed, so a sheet opened from its content closes too. */
const ParentClosing = createContext(false)
/** Lets a SheetFooter tell its own sheet where it is (a nested sheet provides its own). */
const FooterSlot = createContext<((footer: HTMLElement | null) => void) | null>(null)
/** What had focus before each sheet opened, to return to it (see handleClose). */
const openers = new WeakMap<HTMLDialogElement, HTMLElement>()

/**
 * Bottom sheet on phones (a centered dialog on wide screens), built on the native <dialog>.
 *
 * It slides up over a blurred backdrop, and every way of closing it animates: the X button, a
 * tap on the backdrop, Escape or the Android back gesture, a swipe down, or the parent setting
 * `open` to false. The dialog stays modal until the exit animation is over (CSS in index.css,
 * driven by data-state), then closes and hands focus back.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const parentClosing = useContext(ParentClosing)
  const isOpen = open && !parentClosing

  // The content stays mounted until the exit animation is over.
  const [rendered, setRendered] = useState(isOpen)
  if (isOpen && !rendered) setRendered(true)
  const closing = rendered && !isOpen

  // Callers clear what the content shows in the same update that closes the sheet
  // ({editing && <Form />}, titles computed from it), so the exit keeps the last open content.
  const shown = useRef({ title, children })
  if (isOpen) shown.current = { title, children }
  const view = shown.current

  const latest = useRef({ isOpen, onClose })
  useLayoutEffect(() => {
    latest.current = { isOpen, onClose }
  })
  const pressedBackdrop = useRef(false)
  const header = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const [footer, setFooter] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) {
        rememberOpener(dialog)
        dialog.showModal()
        // React's autoFocus ran while the dialog was still closed: focus the intended field now
        // (opens the number pad right away in "Isi" or "Bayar").
        dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
        dialog.getBoundingClientRect() // lay out the off-screen start so the change below animates
      }
      resetSheetDrag(dialog)
      dialog.dataset.state = 'open'
      return
    }
    if (!dialog.open) return
    delete dialog.dataset.dragging // after a swipe, the exit starts where the finger let go
    dialog.dataset.state = 'closing'
    // Stays modal until the animation is over; close() then returns focus and fires 'close'.
    const timer = window.setTimeout(() => dialog.close(), transitionMs(dialog) + 40)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  // Content scrolls beneath the sticky header and footer: draw a divider on the edge it passes
  // under, and publish their heights so a field that gets focus or is typed in stops clear of
  // both (scroll-padding in index.css).
  useLayoutEffect(() => {
    const dialog = ref.current
    const top = header.current
    const content = body.current
    if (!rendered || !dialog || !top || !content) return
    let footerHeight = footer?.offsetHeight ?? 0
    const update = () => {
      const below = dialog.scrollHeight - dialog.scrollTop - dialog.clientHeight
      top.toggleAttribute('data-scrolled', dialog.scrollTop > 0)
      footer?.toggleAttribute('data-stuck', below > 1)
      const height = footer?.offsetHeight ?? 0
      dialog.style.setProperty('--sheet-top', `${top.offsetHeight}px`)
      dialog.style.setProperty('--sheet-bottom', `${height}px`)
      // A notice or error showing up in the footer makes it grow upward over the content: keep
      // the field being typed in visible above it.
      if (height > footerHeight) revealFocused(dialog)
      footerHeight = height
    }
    update()
    dialog.addEventListener('scroll', update, { passive: true })
    const resize = new ResizeObserver(update) // the keyboard, an error message, a longer list
    resize.observe(dialog)
    resize.observe(content)
    return () => {
      dialog.removeEventListener('scroll', update)
      resize.disconnect()
    }
  }, [rendered, footer])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    return attachSheetSwipe(dialog, {
      close: () => latest.current.onClose(),
      isOpen: () => latest.current.isOpen,
    })
  }, [])

  function handleCancel(e: SyntheticEvent<HTMLDialogElement>) {
    if (e.target !== e.currentTarget) return // a nested sheet's event, passed up by React
    // Escape, Android back, VoiceOver scrub. Without recent user activation the browser won't let
    // the page keep the dialog open: it closes right away and handleClose tells the parent.
    if (!e.cancelable) return
    e.preventDefault()
    if (isOpen) onClose()
  }

  function handleClose(e: SyntheticEvent<HTMLDialogElement>) {
    // React passes a nested dialog's close event up the component tree: only react to our own.
    if (e.target !== e.currentTarget) return
    const dialog = e.currentTarget
    if (dialog.open) return // reopened before this queued event arrived
    delete dialog.dataset.state
    resetSheetDrag(dialog)
    setRendered(false)
    // The browser returns focus to what had it before showModal(); if that was inside a sheet
    // that has closed meanwhile, focus ends on <body>: use the remembered opener instead.
    const opener = openers.get(dialog)
    if (document.activeElement === document.body && opener?.isConnected) {
      opener.focus({ preventScroll: true })
    }
    if (latest.current.isOpen) latest.current.onClose() // closed by the browser itself
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only catches backdrop taps; keyboard users close with Escape or the X button
    <dialog
      ref={ref}
      aria-label={view.title}
      onCancel={handleCancel}
      onClose={handleClose}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget
      }}
      // A tap on the dimmed backdrop (the dialog element itself) closes the sheet. The press must
      // start there too, so a text selection dragged out of the sheet does not close it.
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current && isOpen) onClose()
      }}
      className="sheet mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-0 text-slate-900 sm:mb-auto sm:rounded-3xl dark:bg-slate-900 dark:text-slate-100"
    >
      {rendered && (
        <ParentClosing value={closing}>
          {/* inert while closing: a second tap on "Simpan" during the exit must not save twice */}
          <div
            ref={body}
            inert={closing}
            // A footer brings its own bottom spacing (safe area included).
            className={footer ? undefined : 'pb-[calc(env(safe-area-inset-bottom)+1.25rem)]'}
          >
            <div
              ref={header}
              data-sheet-grab
              className="sticky top-0 z-10 touch-none border-b border-transparent bg-white px-4 pt-3 pb-4 transition-colors data-scrolled:border-slate-200 dark:bg-slate-900 dark:data-scrolled:border-slate-800"
            >
              <div
                aria-hidden
                className="mx-auto h-1.5 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{view.title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="rounded-full p-2.5 text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </div>
            <FooterSlot value={setFooter}>
              <div className="px-4">{view.children}</div>
            </FooterSlot>
          </div>
        </ParentClosing>
      )}
    </dialog>
  )
}

/**
 * The sheet's main actions ("Simpan"), pinned to the bottom edge while a long form scrolls
 * beneath them, so they stay one tap away (on Android, right above the keyboard). When the
 * content is short it just sits after it. Put it last in the sheet: in a form, last in the
 * <form>, after any secondary actions such as "Hapus".
 *
 * What pressing the button will do (`notice`) and why it just failed (`error`) show here too,
 * next to the button: in the content they could be a whole screen below the pinned "Simpan".
 */
export function SheetFooter({
  children,
  notice,
  error,
}: {
  children: ReactNode
  notice?: ReactNode
  error?: string | null
}) {
  const register = useContext(FooterSlot)
  return (
    <div
      ref={register ?? undefined}
      data-sheet-footer
      className="sheet-footer sticky bottom-0 z-10 -mx-4 space-y-3 border-t border-transparent bg-white px-4 pt-3 transition-colors data-stuck:border-slate-200 dark:bg-slate-900 dark:data-stuck:border-slate-800"
    >
      {notice && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      {children}
    </div>
  )
}

function rememberOpener(dialog: HTMLDialogElement) {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active === document.body) return
  // Opened from a sheet on its way out (edit sheet → delete confirmation): that content is about
  // to disappear, so focus should return to what opened that sheet.
  const leaving = active.closest<HTMLDialogElement>('dialog[data-state="closing"]')
  openers.set(dialog, (leaving && openers.get(leaving)) || active)
}

/** Scrolls the sheet's focused field into view (not the bars' own buttons, nor a nested sheet's). */
function revealFocused(dialog: HTMLDialogElement) {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active.closest('dialog') !== dialog) return
  if (active.closest('[data-sheet-grab], [data-sheet-footer]')) return
  active.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

/** Longest transition on the element as the CSS defines it right now (reduced motion included). */
function transitionMs(el: Element) {
  const style = getComputedStyle(el)
  const delays = style.transitionDelay.split(',').map(parseFloat)
  const durations = style.transitionDuration.split(',').map(parseFloat)
  return Math.max(
    0,
    ...durations.map((d, i) => ((d || 0) + (delays[i % delays.length] || 0)) * 1000),
  )
}
