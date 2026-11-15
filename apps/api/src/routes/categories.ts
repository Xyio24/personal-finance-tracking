import { CUSTOM_CATEGORY_SORT, categoryInputSchema, categoryUpdateSchema } from '@finance/shared'
import { and, asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { categories, transactions } from '../db/schema'
import { toCategory } from '../lib/dto'
import { apiError, idParam, validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'

export const categoryRoutes = new Hono<AuthEnv>()

categoryRoutes.use(requireAuth)

categoryRoutes.get('/', async (c) => {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, c.get('user').id))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt), asc(categories.id))
  return c.json(rows.map(toCategory))
})

categoryRoutes.post('/', validate('json', categoryInputSchema), async (c) => {
  const [row] = await db
    .insert(categories)
    .values({ ...c.req.valid('json'), userId: c.get('user').id, sortOrder: CUSTOM_CATEGORY_SORT })
    .returning()
  if (!row) throw new Error('Category insert returned no row')
  return c.json(toCategory(row), 201)
})

categoryRoutes.patch('/:id', idParam, validate('json', categoryUpdateSchema), async (c) => {
  const { id } = c.req.valid('param')
  const { archived, ...fields } = c.req.valid('json')

  const [row] = await db
    .update(categories)
    .set({
      ...fields,
      ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, c.get('user').id)))
    .returning()
  if (!row) return apiError(c, 'not_found', 404)

  return c.json(toCategory(row))
})

/** Only unused categories can be deleted; used ones are archived instead. */
categoryRoutes.delete('/:id', idParam, async (c) => {
  const userId = c.get('user').id
  const { id } = c.req.valid('param')

  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.categoryId, id)))
    .limit(1)
  if (used) return apiError(c, 'in_use', 409)

  const [row] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id })
  if (!row) return apiError(c, 'not_found', 404)

  return c.body(null, 204)
})
