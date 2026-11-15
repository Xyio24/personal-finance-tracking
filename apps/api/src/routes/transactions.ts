import {
  monthRange,
  SEARCH_LIMIT,
  transactionInputSchema,
  transactionListQuerySchema,
} from '@finance/shared'
import { and, desc, eq, gte, ilike, lt, or, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { categories, debts, savingsGoals, transactions } from '../db/schema'
import { toTransaction } from '../lib/dto'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'
import {
  checkReferences,
  isDebtOpening,
  keepsGoalPositive,
  toTransactionValues,
} from '../services/transactions'

export const transactionRoutes = new Hono<AuthEnv>()

transactionRoutes.use(requireAuth)

/** Escapes LIKE wildcards so a search for "50%" means the text "50%". */
const likeEscape = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`)

/**
 * Newest first. One month (?month=YYYY-MM), a search across all months (?q=…, at most
 * SEARCH_LIMIT rows), or the history of a savings goal (?goalId=…) or a debt (?debtId=…);
 * ?type, ?categoryId, ?accountId, ?goalId and ?debtId narrow any of them.
 */
transactionRoutes.get('/', validate('query', transactionListQuerySchema), async (c) => {
  const { month, q, type, categoryId, accountId, goalId, debtId } = c.req.valid('query')

  const conditions: (SQL | undefined)[] = [eq(transactions.userId, c.get('user').id)]
  if (month) {
    const { start, end } = monthRange(month)
    conditions.push(gte(transactions.date, start), lt(transactions.date, end))
  }
  if (type) conditions.push(eq(transactions.type, type))
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId))
  if (goalId) conditions.push(eq(transactions.goalId, goalId))
  if (debtId) conditions.push(eq(transactions.debtId, debtId))
  if (accountId) {
    conditions.push(
      or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
    )
  }
  if (q) {
    const pattern = `%${likeEscape(q)}%`
    conditions.push(
      or(
        ilike(transactions.note, pattern),
        ilike(categories.name, pattern),
        ilike(savingsGoals.name, pattern),
        ilike(debts.person, pattern),
      ),
    )
  }

  const rows = await db
    .select({ transaction: transactions })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(savingsGoals, eq(savingsGoals.id, transactions.goalId))
    .leftJoin(debts, eq(debts.id, transactions.debtId))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    // A month or a goal/debt history is complete; a free-text search returns the newest matches.
    .limit(month || ((goalId || debtId) && !q) ? 10_000 : SEARCH_LIMIT)
  return c.json(rows.map((row) => toTransaction(row.transaction)))
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
  if (isDebtOpening(existing)) return apiError(c, 'managed_by_debt', 400)

  const problem = await checkReferences(userId, input, existing)
  if (problem) return apiError(c, problem, 400)
  if (!(await keepsGoalPositive(existing, input))) {
    return apiError(c, 'savings_already_used', 400)
  }

  const [row] = await db
    .update(transactions)
    .set({ ...toTransactionValues(input), updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning()
  if (!row) return apiError(c, 'not_found', 404)
  return c.json(toTransaction(row))
})

transactionRoutes.delete('/:id', idParam, async (c) => {
  const userId = c.get('user').id
  const existing = await findOwn(userId, c.req.valid('param').id)
  if (!existing) return apiError(c, 'not_found', 404)
  if (isDebtOpening(existing)) return apiError(c, 'managed_by_debt', 400)
  if (!(await keepsGoalPositive(existing))) return apiError(c, 'savings_already_used', 400)

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, existing.id), eq(transactions.userId, userId)))
  return c.body(null, 204)
})

async function findOwn(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
  return row
}
