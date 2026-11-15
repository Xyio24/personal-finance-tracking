import type { AccountInput } from './accounts'
import type { CategoryInput } from './categories'

/** Created for every new user so the first transaction can be recorded right away. */
export const DEFAULT_ACCOUNT: AccountInput = { name: 'Tunai', type: 'cash', initialBalance: 0 }

/** Starter categories, in display order. "Lainnya" stays last in each group. */
export const DEFAULT_CATEGORIES: readonly CategoryInput[] = [
  { name: 'Makan & Minum', type: 'expense', icon: 'utensils', color: 'orange' },
  { name: 'Belanja', type: 'expense', icon: 'shopping-bag', color: 'pink' },
  { name: 'Transportasi', type: 'expense', icon: 'car', color: 'sky' },
  { name: 'Tagihan', type: 'expense', icon: 'receipt', color: 'amber' },
  { name: 'Pulsa & Internet', type: 'expense', icon: 'wifi', color: 'blue' },
  { name: 'Hiburan', type: 'expense', icon: 'film', color: 'violet' },
  { name: 'Kesehatan', type: 'expense', icon: 'heart-pulse', color: 'rose' },
  { name: 'Pendidikan', type: 'expense', icon: 'graduation-cap', color: 'teal' },
  { name: 'Rumah', type: 'expense', icon: 'house', color: 'lime' },
  { name: 'Keluarga', type: 'expense', icon: 'users', color: 'emerald' },
  { name: 'Sedekah & Donasi', type: 'expense', icon: 'hand-heart', color: 'pink' },
  { name: 'Lainnya', type: 'expense', icon: 'circle-ellipsis', color: 'slate' },
  { name: 'Gaji', type: 'income', icon: 'briefcase', color: 'emerald' },
  { name: 'Bonus', type: 'income', icon: 'gift', color: 'amber' },
  { name: 'Usaha & Freelance', type: 'income', icon: 'laptop', color: 'sky' },
  { name: 'Investasi', type: 'income', icon: 'trending-up', color: 'teal' },
  { name: 'Hadiah', type: 'income', icon: 'gift', color: 'pink' },
  { name: 'Lainnya', type: 'income', icon: 'circle-ellipsis', color: 'slate' },
]

/**
 * Sort order for categories: defaults keep their list position, "Lainnya" goes last, and
 * categories the user adds later land in between.
 */
export const CUSTOM_CATEGORY_SORT = 500
export function defaultCategorySort(category: CategoryInput, index: number): number {
  return category.name === 'Lainnya' ? 1000 : index
}
