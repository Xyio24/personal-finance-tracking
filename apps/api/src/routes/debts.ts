import {
  cascadeDeleteQuerySchema,
  debtInputSchema,
  debtOpeningType,
  debtUpdateSchema,
} from '@finance/shared'
import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { accounts, debts, transactions } from '../db/schema'
import { isStillReferenced } from '../lib/db-errors'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'
import { findDebt, listDebts, OPENING_TYPES } from '../services/debts'

/**
 * Hutang (payable) and piutang (receivable). A debt and the transaction that moved its money
 * (if any) are always written together; payments go through /api/transactions.
 */

/** A wallet a debt may newly use: the user's own and still active. */
async function checkWallet(userId: string, accountId: string) {
  const [account] = await db
    .select({ archivedAt: accounts.archivedAt })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
  if (!account) return 'invalid_account' as const
  if (account.archivedAt) return 'archived_account' as const
  return null
}

export const debtRoutes = new Hono<AuthEnv>()

debtRoutes.use(requireAuth)

debtRoutes.get('/', async (c) => c.json(await listDebts(c.get('user').id)))

debtRoutes.post('/', validate('json', debtInputSchema), async (c) => {
  const userId = c.get('user').id
  const input = c.req.valid('json')

  const walletError = input.accountId && (await checkWallet(userId, input.accountId))
  if (walletError) return apiError(c, walletError, 400)

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
      await tx.insert(transactions).values({
        userId,
        type: debtOpeningType(input.direction),
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
  const { writtenOff, note, accountId, ...fields } = c.req.valid('json')

  const existing = await findDebt(userId, id)
  if (!existing) return apiError(c, 'not_found', 404)
  // The amount can shrink, but never below what has already been paid back.
  if (fields.amount !== undefined && fields.amount < existing.paid) {
    return apiError(c, 'debt_below_paid', 400)
  }
  // Payments are debt_repay or debt_collect by direction, so it is fixed once one exists.
  if (fields.direction && fields.direction !== existing.direction && existing.paid > 0) {
    return apiError(c, 'debt_direction_locked', 400)
  }
  // A newly picked wallet must be active; the one already used may stay even if archived since.
  if (accountId && accountId !== existing.accountId) {
    const walletError = await checkWallet(userId, accountId)
    if (walletError) return apiError(c, walletError, 400)
  }

  const opening = {
    direction: fields.direction ?? existing.direction,
    amount: fields.amount ?? existing.amount,
    date: fields.date ?? existing.date,
    accountId: accountId === undefined ? existing.accountId : accountId,
  }
  const openingTouched =
    fields.direction !== undefined ||
    fields.amount !== undefined ||
    fields.date !== undefined ||
    accountId !== undefined

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
    if (!openingTouched) return

    // Keep the opening move (money borrowed into / lent out of a wallet) in step with the debt:
    // removed when no money moved, created when a wallet is added, updated otherwise.
    const isOpening = and(
      eq(transactions.userId, userId),
      eq(transactions.debtId, id),
      inArray(transactions.type, [...OPENING_TYPES]),
    )
    if (!opening.accountId) {
      await tx.delete(transactions).where(isOpening)
      return
    }
    const values = {
      type: debtOpeningType(opening.direction),
      amount: opening.amount,
      accountId: opening.accountId,
      date: opening.date,
    }
    const [updated] = await tx
      .update(transactions)
      .set({ ...values, updatedAt: new Date() })
      .where(isOpening)
      .returning({ id: transactions.id })
    if (!updated) await tx.insert(transactions).values({ ...values, userId, debtId: id })
  })

  return c.json(await findDebt(userId, id))
})

/**
 * Deletes a debt and its opening move. A debt with payments needs ?withTransactions=true, which
 * deletes the payments too; every wallet balance follows, since balances are never stored.
 */
debtRoutes.delete('/:id', idParam, validate('query', cascadeDeleteQuerySchema), async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')
  const { withTransactions = false } = c.req.valid('query')

  const existing = await findDebt(userId, id)
  if (!existing) return apiError(c, 'not_found', 404)
  if (existing.paid > 0 && !withTransactions) return apiError(c, 'debt_has_payments', 409)

  try {
    await db.transaction(async (tx) => {
      // Without the opt-in only the opening move goes, so a payment recorded since the check
      // above keeps the debt in place (the foreign key refuses) instead of vanishing with it.
      await tx
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.debtId, id),
            withTransactions ? undefined : inArray(transactions.type, [...OPENING_TYPES]),
          ),
        )
      await tx.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)))
    })
  } catch (error) {
    if (isStillReferenced(error)) return apiError(c, 'debt_has_payments', 409)
    throw error
  }
  return c.body(null, 204)
})
