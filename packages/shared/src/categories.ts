import { z } from 'zod'

export const CATEGORY_TYPES = ['income', 'expense'] as const
export const categoryTypeSchema = z.enum(CATEGORY_TYPES)
export type CategoryType = z.infer<typeof categoryTypeSchema>

/** Icon keys (lucide names). The web app maps each one to its icon component. */
export const CATEGORY_ICONS = [
  'utensils',
  'coffee',
  'shopping-bag',
  'shopping-cart',
  'car',
  'bus',
  'fuel',
  'receipt',
  'wifi',
  'smartphone',
  'zap',
  'droplet',
  'house',
  'film',
  'gamepad',
  'music',
  'plane',
  'heart-pulse',
  'pill',
  'graduation-cap',
  'book',
  'users',
  'baby',
  'paw-print',
  'shirt',
  'scissors',
  'dumbbell',
  'gift',
  'hand-heart',
  'briefcase',
  'laptop',
  'store',
  'trending-up',
  'piggy-bank',
  'banknote',
  'coins',
  'circle-ellipsis',
] as const
export type CategoryIcon = (typeof CATEGORY_ICONS)[number]

export const CATEGORY_COLORS = [
  'emerald',
  'teal',
  'sky',
  'blue',
  'violet',
  'pink',
  'rose',
  'orange',
  'amber',
  'lime',
  'slate',
] as const
export type CategoryColor = (typeof CATEGORY_COLORS)[number]

const categoryFields = {
  name: z.string().trim().min(1).max(40),
  type: categoryTypeSchema,
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
}

export const categoryInputSchema = z.object(categoryFields)
export type CategoryInput = z.infer<typeof categoryInputSchema>

/** The type is fixed once created: moving a used category between income and expense would
 *  silently change the meaning of past transactions. */
export const categoryUpdateSchema = categoryInputSchema
  .omit({ type: true })
  .partial()
  .extend({ archived: z.boolean().optional() })
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>

export type Category = {
  id: string
  name: string
  type: CategoryType
  icon: CategoryIcon
  color: CategoryColor
  archived: boolean
  createdAt: string
}
