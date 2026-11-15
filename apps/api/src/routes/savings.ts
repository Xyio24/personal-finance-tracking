import { goalInputSchema, goalUpdateSchema } from '@finance/shared'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { savingsGoals } from '../db/schema'
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

/** Only goals with no deposits or withdrawals can be deleted; the rest are archived. */
savingsRoutes.delete('/:id', idParam, async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')

  if (await isGoalUsed(userId, id)) return apiError(c, 'in_use', 409)

  const [row] = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
    .returning({ id: savingsGoals.id })
  if (!row) return apiError(c, 'not_found', 404)

  return c.body(null, 204)
})
