import { z } from 'zod'
import { MAX_AMOUNT } from './money'

export const ACCOUNT_TYPES = ['cash', 'bank', 'ewallet', 'other'] as const
export const accountTypeSchema = z.enum(ACCOUNT_TYPES)
export type AccountType = z.infer<typeof accountTypeSchema>

const accountFields = {
  name: z.string().trim().min(1).max(50),
  type: accountTypeSchema,
  /** Balance when tracking started. Can be negative (e.g. a credit card). */
  initialBalance: z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT),
}

export const accountInputSchema = z.object(accountFields)
export type AccountInput = z.infer<typeof accountInputSchema>

export const accountUpdateSchema = z
  .object(accountFields)
  .partial()
  .extend({ archived: z.boolean().optional() })
export type AccountUpdate = z.infer<typeof accountUpdateSchema>

export type Account = {
  id: string
  name: string
  type: AccountType
  initialBalance: number
  /** Initial balance plus every transaction touching this account. Never stored. */
  balance: number
  archived: boolean
  createdAt: string
}
