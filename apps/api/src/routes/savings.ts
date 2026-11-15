import { cascadeDeleteQuerySchema, goalInputSchema, goalUpdateSchema } from '@finance/shared'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { savingsGoals, transactions } from '../db/schema'
import { isStillReferenced } from '../lib/db-errors'
import { toGoal } from '../lib/dto'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'
import { findGoal, isGoalUsed, listGoals } from '../services/savings'

/** Savings goals. Money goes in and out through transactions (saving_deposit/withdrawal). */
export const savingsRoutes = new Hono<AuthEnv>()

savingsRoutes.use(requireAuth)

savingsRoutes.get('/', async (c) => c.json(await listGoals(c.get('user').id)))

savingsRoutes.post('/', validate('json', goalInputSchema), async (c) => {
  const [row] = await db
    .insert(savingsGoals)
    .values({ ...c.req.valid('json'), userId: c.get('user').id })
    .returning()
  if (!row) throw new Error('Savings goal insert returned no row')
  return c.json(toGoal(row, row.initialAmount, 0), 201)
})

savingsRoutes.patch('/:id', idParam, validate('json', goalUpdateSchema), async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')
  const { archived, ...fields } = c.req.valid('json')

  const existing = await findGoal(userId, id)
  if (!existing) return apiError(c, 'not_found', 404)
  // Isi and culik stay as recorded, so lowering the starting amount must not leave the goal
  // below zero (a goal that is already there can still be renamed or topped up).
  const moves = existing.balance - existing.initialAmount
  if (
    fields.initialAmount !== undefined &&
    fields.initialAmount < existing.initialAmount &&
    fields.initialAmount + moves < 0
  ) {
    return apiError(c, 'savings_below_withdrawn', 400)
  }

  const [row] = await db
    .update(savingsGoals)
    .set({
      ...fields,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
    .returning({ id: savingsGoals.id })
  if (!row) return apiError(c, 'not_found', 404)

  return c.json(await findGoal(userId, id))
})

/**
 * Deletes a goal. One with isi/culik needs ?withTransactions=true, which deletes those too:
 * the money moves back into (or out of) the wallets, since balances are never stored.
 */
savingsRoutes.delete('/:id', idParam, validate('query', cascadeDeleteQuerySchema), async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')
  const { withTransactions = false } = c.req.valid('query')

  if (!withTransactions && (await isGoalUsed(userId, id))) return apiError(c, 'in_use', 409)

  let deleted: { id: string } | undefined
  try {
    deleted = await db.transaction(async (tx) => {
      // Without the opt-in nothing else is touched: an isi/culik recorded since the check above
      // keeps the goal in place (the foreign key refuses) instead of vanishing with it.
      if (withTransactions) {
        await tx
          .delete(transactions)
          .where(and(eq(transactions.userId, userId), eq(transactions.goalId, id)))
      }
      const [row] = await tx
        .delete(savingsGoals)
        .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
        .returning({ id: savingsGoals.id })
      return row
    })
  } catch (error) {
    if (isStillReferenced(error)) return apiError(c, 'in_use', 409)
    throw error
  }
  if (!deleted) return apiError(c, 'not_found', 404)

  return c.body(null, 204)
})
