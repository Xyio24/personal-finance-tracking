import { z } from 'zod'
import { daysBetween } from './dates'
import { MAX_AMOUNT } from './money'

/** payable = "hutang" (you owe someone), receivable = "piutang" (someone owes you). */
export const DEBT_DIRECTIONS = ['payable', 'receivable'] as const
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number]

/** Borrowed money lands in a wallet (debt_borrow); lent money leaves it (debt_lend). */
export const debtOpeningType = (direction: DebtDirection) =>
  direction === 'payable' ? ('debt_borrow' as const) : ('debt_lend' as const)

/** Due within this many days counts as "jatuh tempo sebentar lagi". */
export const DUE_SOON_DAYS = 7

const person = z.string().trim().min(1).max(60)
const amount = z.number().int().positive().max(MAX_AMOUNT)
const note = z.string().trim().max(200).nullish()

/** POST /api/debts */
export const debtInputSchema = z.object({
  direction: z.enum(DEBT_DIRECTIONS),
  person,
  amount,
  /** When the money was borrowed or lent. */
  date: z.iso.date(),
  dueDate: z.iso.date().nullable(),
  note,
  /**
   * Wallet the borrowed money went into (hutang) or the lent money came out of (piutang).
   * null when no money moved, e.g. something bought with paylater.
   */
  accountId: z.uuid().nullable(),
})
export type DebtInput = z.infer<typeof debtInputSchema>

/**
 * PATCH /api/debts/:id. Every field can be corrected; the opening move (money borrowed or lent)
 * follows the debt's direction, amount, date and wallet. The direction can only change while
 * nothing has been paid yet.
 */
export const debtUpdateSchema = z
  .object({
    direction: z.enum(DEBT_DIRECTIONS),
    person,
    amount,
    date: z.iso.date(),
    dueDate: z.iso.date().nullable(),
    note,
    accountId: z.uuid().nullable(),
  })
  .partial()
  .extend({
    /** "Ikhlaskan" (piutang) / "Dianggap lunas" (hutang): settle what is left without money. */
    writtenOff: z.boolean().optional(),
  })
export type DebtUpdate = z.infer<typeof debtUpdateSchema>

export type Debt = {
  id: string
  direction: DebtDirection
  person: string
  /** Amount borrowed or lent. */
  amount: number
  /** Paid back so far. */
  paid: number
  /** Still open: 0 once fully paid or written off. Never stored. */
  remaining: number
  date: string
  dueDate: string | null
  note: string | null
  /** Wallet of the opening move, if money moved. */
  accountId: string | null
  writtenOff: boolean
  createdAt: string
}

export type DebtStatus = 'settled' | 'written_off' | 'overdue' | 'due_soon' | 'open'

/** Where a debt stands on `today` ("YYYY-MM-DD"). */
export function debtStatus(
  debt: Pick<Debt, 'remaining' | 'writtenOff' | 'dueDate'>,
  today: string,
): DebtStatus {
  if (debt.writtenOff) return 'written_off'
  if (debt.remaining <= 0) return 'settled'
  if (!debt.dueDate) return 'open'
  const daysLeft = daysBetween(today, debt.dueDate)
  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= DUE_SOON_DAYS) return 'due_soon'
  return 'open'
}

/** Totals still open: what others owe you, what you owe, and the difference. */
export function debtTotals(debts: readonly Pick<Debt, 'direction' | 'remaining'>[]) {
  let receivable = 0
  let payable = 0
  for (const debt of debts) {
    if (debt.direction === 'receivable') receivable += debt.remaining
    else payable += debt.remaining
  }
  return { receivable, payable, net: receivable - payable }
}
