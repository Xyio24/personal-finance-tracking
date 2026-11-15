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

export const transactionListQuerySchema = z.object({
  month: z.string().regex(monthKeyPattern),
})

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
