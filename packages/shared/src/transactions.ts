import { z } from 'zod'
import { monthKeyPattern } from './dates'
import { MAX_AMOUNT } from './money'

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

const common = {
  amount: z.number().int().positive().max(MAX_AMOUNT),
  date: z.iso.date(),
  note: z.string().trim().max(200).nullish(),
}

/** Income goes into `accountId`, expense comes out of it, transfer moves `accountId` -> `toAccountId`. */
export const transactionInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('income'), accountId: z.uuid(), categoryId: z.uuid(), ...common }),
  z.object({ type: z.literal('expense'), accountId: z.uuid(), categoryId: z.uuid(), ...common }),
  z
    .object({ type: z.literal('transfer'), accountId: z.uuid(), toAccountId: z.uuid(), ...common })
    .refine((t) => t.accountId !== t.toAccountId, {
      message: 'source and destination must differ',
      path: ['toAccountId'],
    }),
])
export type TransactionInput = z.infer<typeof transactionInputSchema>

/** Most results a search across all months returns (newest first). */
export const SEARCH_LIMIT = 100

/**
 * GET /api/transactions: either one month (`month`), or a search across all months (`q`,
 * at most SEARCH_LIMIT results). The filters narrow either one.
 */
export const transactionListQuerySchema = z
  .object({
    month: z.string().regex(monthKeyPattern).optional(),
    /** Matches the note or the category name, case-insensitive. */
    q: z.string().trim().min(1).max(100).optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: z.uuid().optional(),
    /** Matches either side of a transfer. */
    accountId: z.uuid().optional(),
  })
  .refine((query) => query.month !== undefined || query.q !== undefined, {
    message: 'month or q is required',
  })
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>

export type TransactionFilters = Pick<TransactionListQuery, 'type' | 'categoryId' | 'accountId'>

/** The same filter rules the API applies, for filtering an already loaded month. */
export function matchesFilters(
  t: Pick<Transaction, 'type' | 'categoryId' | 'accountId' | 'toAccountId'>,
  filters: TransactionFilters,
): boolean {
  if (filters.type && t.type !== filters.type) return false
  if (filters.categoryId && t.categoryId !== filters.categoryId) return false
  if (
    filters.accountId &&
    t.accountId !== filters.accountId &&
    t.toAccountId !== filters.accountId
  ) {
    return false
  }
  return true
}

export type Transaction = {
  id: string
  type: TransactionType
  amount: number
  accountId: string
  toAccountId: string | null
  categoryId: string | null
  /** Local calendar date, "YYYY-MM-DD". */
  date: string
  note: string | null
  createdAt: string
}
