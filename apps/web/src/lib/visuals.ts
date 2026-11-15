import type { AccountType, CategoryColor, CategoryIcon, TransactionType } from '@finance/shared'
import {
  Baby,
  Banknote,
  Book,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  Coffee,
  Coins,
  Droplet,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  type LucideIcon,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react'

export const categoryIcons: Record<CategoryIcon, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  car: Car,
  bus: Bus,
  fuel: Fuel,
  receipt: Receipt,
  wifi: Wifi,
  smartphone: Smartphone,
  zap: Zap,
  droplet: Droplet,
  house: House,
  film: Film,
  gamepad: Gamepad2,
  music: Music,
  plane: Plane,
  'heart-pulse': HeartPulse,
  pill: Pill,
  'graduation-cap': GraduationCap,
  book: Book,
  users: Users,
  baby: Baby,
  'paw-print': PawPrint,
  shirt: Shirt,
  scissors: Scissors,
  dumbbell: Dumbbell,
  gift: Gift,
  'hand-heart': HandHeart,
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  banknote: Banknote,
  coins: Coins,
  'circle-ellipsis': CircleEllipsis,
}

/** Full class strings (not built dynamically) so Tailwind can see them. */
export const categoryColors: Record<CategoryColor, { soft: string; dot: string }> = {
  emerald: {
    soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  teal: {
    soft: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
    dot: 'bg-teal-500',
  },
  sky: { soft: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300', dot: 'bg-sky-500' },
  blue: {
    soft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  violet: {
    soft: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  pink: {
    soft: 'bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300',
    dot: 'bg-pink-500',
  },
  rose: {
    soft: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  orange: {
    soft: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  amber: {
    soft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  lime: {
    soft: 'bg-lime-100 text-lime-700 dark:bg-lime-900/60 dark:text-lime-300',
    dot: 'bg-lime-500',
  },
  slate: {
    soft: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-500',
  },
}

/** Names for screen readers in the color picker. */
export const colorNames: Record<CategoryColor, string> = {
  emerald: 'Hijau',
  teal: 'Toska',
  sky: 'Biru muda',
  blue: 'Biru',
  violet: 'Ungu',
  pink: 'Merah muda',
  rose: 'Merah',
  orange: 'Oranye',
  amber: 'Kuning',
  lime: 'Hijau muda',
  slate: 'Abu-abu',
}

export const accountTypes: Record<AccountType, { label: string; icon: LucideIcon }> = {
  cash: { label: 'Tunai', icon: Banknote },
  bank: { label: 'Bank', icon: Landmark },
  ewallet: { label: 'E-wallet', icon: Smartphone },
  other: { label: 'Lainnya', icon: Wallet },
}

export const transactionTypes: Record<
  TransactionType,
  { label: string; amountClass: string; sign: string }
> = {
  expense: { label: 'Pengeluaran', amountClass: 'text-rose-600 dark:text-rose-400', sign: '−' },
  income: { label: 'Pemasukan', amountClass: 'text-emerald-600 dark:text-emerald-400', sign: '+' },
  transfer: { label: 'Transfer', amountClass: 'text-slate-600 dark:text-slate-300', sign: '' },
  saving_deposit: {
    label: 'Isi tabungan',
    amountClass: 'text-slate-600 dark:text-slate-300',
    sign: '',
  },
  saving_withdrawal: {
    label: 'Culik tabungan',
    amountClass: 'text-slate-600 dark:text-slate-300',
    sign: '',
  },
}
