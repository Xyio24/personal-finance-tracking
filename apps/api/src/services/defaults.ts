import { DEFAULT_ACCOUNT, DEFAULT_CATEGORIES, defaultCategorySort } from '@finance/shared'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, categories } from '../db/schema'

/**
 * Gives a user starter categories and a cash account the first time they sign in. Runs on
 * every login but only fills what is completely empty, so later edits are never overwritten.
 */
export async function ensureUserDefaults(userId: string) {
  await db.transaction(async (tx) => {
    const [anyCategory] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.userId, userId))
      .limit(1)
    if (!anyCategory) {
      await tx.insert(categories).values(
        DEFAULT_CATEGORIES.map((category, index) => ({
          ...category,
          userId,
          sortOrder: defaultCategorySort(category, index),
        })),
      )
    }

    const [anyAccount] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1)
    if (!anyAccount) await tx.insert(accounts).values({ ...DEFAULT_ACCOUNT, userId })
  })
}
