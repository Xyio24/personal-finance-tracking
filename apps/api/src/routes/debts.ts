import { debtInputSchema, debtUpdateSchema } from '@finance/shared'
import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { accounts, debts, transactions } from '../db/schema'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'
import { findDebt, listDebts, OPENING_TYPES } from '../services/debts'

/**
 * Hutang (payable) and piutang (receivable). A debt and the transaction that moved its money
 * (if any) are always written together; payments go through /api/transactions.
 */
export const debtRoutes = new Hono<AuthEnv>()

debtRoutes.use(requireAuth)

debtRoutes.get('/', async (c) => c.json(await listDebts(c.get('user').id)))

debtRoutes.post('/', validate('json', debtInputSchema), async (c) => {
  const userId = c.get('user').id
  const input = c.req.valid('json')

  if (input.accountId) {
    const [account] = await db
      .select({ archivedAt: accounts.archivedAt })
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
    if (!account) return apiError(c, 'invalid_account', 400)
    if (account.archivedAt) return apiError(c, 'archived_account', 400)
  }

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(debts)
      .values({
        userId,
        direction: input.direction,
        person: input.person,
        amount: input.amount,
        date: input.date,
        dueDate: input.dueDate,
        note: input.note || null,
      })
      .returning({ id: debts.id })
    if (!row) throw new Error('Debt insert returned no row')
    if (input.accountId) {
      // Borrowed money lands in the wallet; lent money leaves it.
      await tx.insert(transactions).values({
        userId,
        type: input.direction === 'payable' ? 'debt_borrow' : 'debt_lend',
        amount: input.amount,
        accountId: input.accountId,
        debtId: row.id,
        date: input.date,
      })
    }
    return row.id
  })

  return c.json(await findDebt(userId, id), 201)
})

debtRoutes.patch('/:id', idParam, validate('json', debtUpdateSchema), async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')
  const { writtenOff, note, ...fields } = c.req.valid('json')

  const existing = await findDebt(userId, id)
  if (!existing) return apiError(c, 'not_found', 404)
  // The amount can shrink, but never below what has already been paid back.
  if (fields.amount !== undefined && fields.amount < existing.paid) {
    return apiError(c, 'debt_below_paid', 400)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(debts)
      .set({
        ...fields,
        ...(note === undefined ? {} : { note: note || null }),
        ...(writtenOff === undefined ? {} : { writtenOffAt: writtenOff ? new Date() : null }),
        updatedAt: new Date(),
      })
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
    if (fields.amount !== undefined) {
      // Keep the opening move in step with the debt.
      await tx
        .update(transactions)
        .set({ amount: fields.amount, updatedAt: new Date() })
        .where(and(eq(transactions.debtId, id), inArray(transactions.type, [...OPENING_TYPES])))
    }
  })

  return c.json(await findDebt(userId, id))
})

/** Only debts without payments can be deleted (their opening move goes with them). */
debtRoutes.delete('/:id', idParam, async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')

  const existing = await findDebt(userId, id)
  if (!existing) return apiError(c, 'not_found', 404)
  if (existing.paid > 0) return apiError(c, 'in_use', 409)

  await db.transaction(async (tx) => {
    await tx
      .delete(transactions)
      .where(and(eq(transactions.debtId, id), inArray(transactions.type, [...OPENING_TYPES])))
    await tx.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)))
  })
  return c.body(null, 204)
})
