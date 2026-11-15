import { monthRange, transactionInputSchema, transactionListQuerySchema } from '@finance/shared'
import { and, desc, eq, gte, lt } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { transactions } from '../db/schema'
import { toTransaction } from '../lib/dto'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'
import { checkReferences, toTransactionValues } from '../services/transactions'

export const transactionRoutes = new Hono<AuthEnv>()

transactionRoutes.use(requireAuth)

/** Transactions of one month (?month=YYYY-MM), newest first. */
transactionRoutes.get('/', validate('query', transactionListQuerySchema), async (c) => {
  const { start, end } = monthRange(c.req.valid('query').month)
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, c.get('user').id),
        gte(transactions.date, start),
        lt(transactions.date, end),
      ),
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
  return c.json(rows.map(toTransaction))
})

transactionRoutes.get('/:id', idParam, async (c) => {
  const row = await findOwn(c.get('user').id, c.req.valid('param').id)
  return row ? c.json(toTransaction(row)) : apiError(c, 'not_found', 404)
})

transactionRoutes.post('/', validate('json', transactionInputSchema), async (c) => {
  const userId = c.get('user').id
  const input = c.req.valid('json')

  const problem = await checkReferences(userId, input)
  if (problem) return apiError(c, problem, 400)

  const [row] = await db
    .insert(transactions)
    .values({ ...toTransactionValues(input), userId })
    .returning()
  if (!row) throw new Error('Transaction insert returned no row')
  return c.json(toTransaction(row), 201)
})

/** Replaces a transaction (the form always sends every field). */
transactionRoutes.put('/:id', idParam, validate('json', transactionInputSchema), async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')
  const input = c.req.valid('json')

  const existing = await findOwn(userId, id)
  if (!existing) return apiError(c, 'not_found', 404)

  const problem = await checkReferences(userId, input, existing)
  if (problem) return apiError(c, problem, 400)

  const [row] = await db
    .update(transactions)
    .set({ ...toTransactionValues(input), updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning()
  if (!row) return apiError(c, 'not_found', 404)
  return c.json(toTransaction(row))
})

transactionRoutes.delete('/:id', idParam, async (c) => {
  const [row] = await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, c.req.valid('param').id), eq(transactions.userId, c.get('user').id)),
    )
    .returning({ id: transactions.id })
  return row ? c.body(null, 204) : apiError(c, 'not_found', 404)
})

async function findOwn(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
  return row
}
