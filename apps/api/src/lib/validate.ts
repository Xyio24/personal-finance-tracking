import { zValidator } from '@hono/zod-validator'
import type { Context, ValidationTargets } from 'hono'
import { z } from 'zod'

/** Validates a request part with Zod; invalid input becomes a 400 listing what was wrong. */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return c.json({ error: 'invalid_input', issues }, 400)
    }
  })
}

export const idParam = validate('param', z.object({ id: z.uuid() }))

/** Error responses the web app knows how to explain to the user. */
export type ApiErrorCode =
  | 'not_found'
  | 'in_use'
  | 'debt_has_payments'
  | 'debt_direction_locked'
  | 'savings_below_withdrawn'
  | 'invalid_account'
  | 'archived_account'
  | 'invalid_category'
  | 'archived_category'
  | 'invalid_goal'
  | 'archived_goal'
  | 'insufficient_savings'
  | 'savings_already_used'
  | 'invalid_debt'
  | 'debt_closed'
  | 'debt_overpaid'
  | 'debt_below_paid'
  | 'managed_by_debt'

export function apiError(c: Context, error: ApiErrorCode, status: 400 | 404 | 409) {
  return c.json({ error }, status)
}
