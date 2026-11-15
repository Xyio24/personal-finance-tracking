import { useEffect, useState } from 'react'

/**
 * Typed-in values that survive a form closing by accident (a swipe down, a tap on the backdrop)
 * or a detour (tapping "Atur" in the middle of a transaction). In memory only: nothing is stored
 * on the device, a reload starts fresh, and drafts expire after 10 minutes. Forms clear their
 * draft once saved.
 */

const TTL_MS = 10 * 60 * 1000
const store = new Map<string, { value: unknown; at: number }>()
const SEPARATOR = '\u0000'

function read<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(key)
    return undefined
  }
  return entry.value as T
}

/**
 * Like useState, but the value is kept under `draftKey` + `field` while the form is not saved.
 * With a null key (e.g. editing an existing entry) it is plain state.
 */
export function useDraftField<T>(draftKey: string | null, field: string, initial: () => T) {
  const key = draftKey && `${draftKey}${SEPARATOR}${field}`
  const [value, setValue] = useState<T>(() => {
    const saved = key ? read<T>(key) : undefined
    return saved !== undefined ? saved : initial()
  })
  useEffect(() => {
    if (key) store.set(key, { value, at: Date.now() })
  }, [key, value])
  return [value, setValue] as const
}

/** Forget a form's draft (after saving it). */
export function clearDraft(draftKey: string | null) {
  if (!draftKey) return
  for (const key of store.keys()) {
    if (key.startsWith(`${draftKey}${SEPARATOR}`)) store.delete(key)
  }
}
