import { accountInputSchema, accountUpdateSchema } from '@finance/shared'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { accounts } from '../db/schema'
import { toAccount } from '../lib/dto'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'
import { findAccount, isAccountUsed, listAccounts } from '../services/accounts'

export const accountRoutes = new Hono<AuthEnv>()

accountRoutes.use(requireAuth)

accountRoutes.get('/', async (c) => c.json(await listAccounts(c.get('user').id)))

accountRoutes.post('/', validate('json', accountInputSchema), async (c) => {
  const [row] = await db
    .insert(accounts)
    .values({ ...c.req.valid('json'), userId: c.get('user').id })
    .returning()
  if (!row) throw new Error('Account insert returned no row')
  return c.json(toAccount(row, row.initialBalance), 201)
})

accountRoutes.patch('/:id', idParam, validate('json', accountUpdateSchema), async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')
  const { archived, ...fields } = c.req.valid('json')

  const [row] = await db
    .update(accounts)
    .set({
      ...fields,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning({ id: accounts.id })
  if (!row) return apiError(c, 'not_found', 404)

  return c.json(await findAccount(userId, id))
})

/** Only unused accounts can be deleted; used ones are archived so history stays intact. */
accountRoutes.delete('/:id', idParam, async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')

  if (await isAccountUsed(userId, id)) return apiError(c, 'in_use', 409)

  const [row] = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning({ id: accounts.id })
  if (!row) return apiError(c, 'not_found', 404)

  return c.body(null, 204)
})
