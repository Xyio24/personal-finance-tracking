import { z } from 'zod'
import { monthKeyPattern } from './dates'
import { MAX_AMOUNT } from './money'

export const TRANSACTION_TYPES = [
  'income',
  'expense',
  'transfer',
  'saving_deposit',
  'saving_withdrawal',
  'debt_borrow',
  'debt_lend',
  'debt_repay',
  'debt_collect',
] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/** Money moved into ("isi") or out of ("culik") a savings goal. Neither income nor expense. */
export const SAVINGS_TYPES = ['saving_deposit', 'saving_withdrawal'] as const
export type SavingsType = (typeof SAVINGS_TYPES)[number]
export const isSavingsType = (type: TransactionType): type is SavingsType =>
  type === 'saving_deposit' || type === 'saving_withdrawal'

/**
 * Money moving because of a debt. Neither income nor expense:
 * - debt_borrow: borrowed money lands in a wallet (opens a "hutang")
 * - debt_lend: lent money leaves a wallet (opens a "piutang")
 * - debt_repay: paying a "hutang" back, money leaves a wallet
 * - debt_collect: a "piutang" is paid back to you, money lands in a wallet
 * Borrow/lend are created together with their debt (/api/debts); repay/collect are payments
 * recorded as transactions.
 */
export const DEBT_TYPES = ['debt_borrow', 'debt_lend', 'debt_repay', 'debt_collect'] as const
export type DebtType = (typeof DEBT_TYPES)[number]
export const isDebtType = (type: TransactionType): type is DebtType =>
  (DEBT_TYPES as readonly TransactionType[]).includes(type)
export const DEBT_PAYMENT_TYPES = ['debt_repay', 'debt_collect'] as const
export type DebtPaymentType = (typeof DEBT_PAYMENT_TYPES)[number]

/** Types that put money into the wallet in `accountId` (all others take money out of it). */
export const WALLET_INFLOW_TYPES = [
  'income',
  'saving_withdrawal',
  'debt_borrow',
  'debt_collect',
] as const satisfies readonly TransactionType[]

const common = {
  amount: z.number().int().positive().max(MAX_AMOUNT),
  date: z.iso.date(),
  note: z.string().trim().max(200).nullish(),
}

/**
 * Income goes into `accountId`, expense comes out of it, transfer moves `accountId` ->
 * `toAccountId`. A savings deposit moves money from `accountId` into goal `goalId`; a
 * withdrawal moves it from the goal back into `accountId`. A debt payment pays a "hutang"
 * from `accountId` (debt_repay) or receives a "piutang" payment into it (debt_collect).
 */
export const transactionInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('income'), accountId: z.uuid(), categoryId: z.uuid(), ...common }),
  z.object({ type: z.literal('expense'), accountId: z.uuid(), categoryId: z.uuid(), ...common }),
  z
    .object({ type: z.literal('transfer'), accountId: z.uuid(), toAccountId: z.uuid(), ...common })
    .refine((t) => t.accountId !== t.toAccountId, {
      message: 'source and destination must differ',
      path: ['toAccountId'],
    }),
  z.object({ type: z.literal('saving_deposit'), accountId: z.uuid(), goalId: z.uuid(), ...common }),
  z.object({
    type: z.literal('saving_withdrawal'),
    accountId: z.uuid(),
    goalId: z.uuid(),
    ...common,
  }),
  z.object({ type: z.literal('debt_repay'), accountId: z.uuid(), debtId: z.uuid(), ...common }),
  z.object({ type: z.literal('debt_collect'), accountId: z.uuid(), debtId: z.uuid(), ...common }),
])
export type TransactionInput = z.infer<typeof transactionInputSchema>

/** Most results a search across all months returns (newest first). */
export const SEARCH_LIMIT = 100

/**
 * GET /api/transactions: one month (`month`), a search across all months (`q`, at most
 * SEARCH_LIMIT results), or the history of one savings goal (`goalId`) or debt (`debtId`).
 * The filters narrow any of them.
 */
export const transactionListQuerySchema = z
  .object({
    month: z.string().regex(monthKeyPattern).optional(),
    /** Matches the note, category, savings goal or debt person, case-insensitive. */
    q: z.string().trim().min(1).max(100).optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: z.uuid().optional(),
    /** Matches either side of a transfer. */
    accountId: z.uuid().optional(),
    goalId: z.uuid().optional(),
    debtId: z.uuid().optional(),
  })
  .refine(
    (query) => query.month !== undefined || query.q !== undefined || query.goalId || query.debtId,
    { message: 'month, q, goalId or debtId is required' },
  )
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>

export type TransactionFilters = Pick<
  TransactionListQuery,
  'type' | 'categoryId' | 'accountId' | 'goalId' | 'debtId'
>

/** The same filter rules the API applies, for filtering an already loaded month. */
export function matchesFilters(
  t: Pick<Transaction, 'type' | 'categoryId' | 'accountId' | 'toAccountId' | 'goalId' | 'debtId'>,
  filters: TransactionFilters,
): boolean {
  if (filters.type && t.type !== filters.type) return false
  if (filters.categoryId && t.categoryId !== filters.categoryId) return false
  if (filters.goalId && t.goalId !== filters.goalId) return false
  if (filters.debtId && t.debtId !== filters.debtId) return false
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
  /** Savings deposits and withdrawals only. */
  goalId: string | null
  /** Debt openings and payments only. */
  debtId: string | null
  /** Local calendar date, "YYYY-MM-DD". */
  date: string
  note: string | null
  createdAt: string
}
