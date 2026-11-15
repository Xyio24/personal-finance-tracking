import { z } from 'zod'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryColor,
  type CategoryIcon,
} from './categories'
import { daysBetween } from './dates'
import { MAX_AMOUNT } from './money'

const goalFields = {
  name: z.string().trim().min(1).max(40),
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
  /** Optional: a goal can also be an open-ended pot (e.g. an emergency fund). */
  targetAmount: z.number().int().positive().max(MAX_AMOUNT).nullable(),
  deadline: z.iso.date().nullable(),
  /** Money already saved before tracking started. */
  initialAmount: z.number().int().min(0).max(MAX_AMOUNT),
}

export const goalInputSchema = z.object(goalFields)
export type GoalInput = z.infer<typeof goalInputSchema>

export const goalUpdateSchema = z
  .object(goalFields)
  .partial()
  .extend({ archived: z.boolean().optional() })
export type GoalUpdate = z.infer<typeof goalUpdateSchema>

export type SavingsGoal = {
  id: string
  name: string
  icon: CategoryIcon
  color: CategoryColor
  targetAmount: number | null
  deadline: string | null
  initialAmount: number
  /** Initial amount plus deposits ("isi") minus withdrawals ("culik"). Never stored. */
  balance: number
  /** Deposits minus withdrawals in the last 90 days: the recent saving pace. */
  savedLast90Days: number
  archived: boolean
  createdAt: string
}

export type GoalStatus =
  | 'open' // no target, or a target without a deadline
  | 'achieved'
  | 'overdue' // deadline passed, target not reached
  | 'new' // younger than a month and nothing saved yet: too early to judge
  | 'on_track'
  | 'tight'
  | 'behind'

export type GoalProgress = {
  /** Share of the target saved, 0..1 (null without a target). */
  ratio: number | null
  /** Still to save (null without a target). */
  remaining: number | null
  /** Per month until the deadline, rounded up to Rp 1.000 (null without a deadline). */
  monthlyNeeded: number | null
  /** Recent saving pace per month (net of withdrawals), rounded to Rp 1.000. */
  pace: number
  status: GoalStatus
}

const AVERAGE_MONTH_DAYS = 30.44

/** Net saved per month recently: the last 90 days, or the goal's whole life if shorter. */
function savingPace(goal: Pick<SavingsGoal, 'savedLast90Days' | 'createdAt'>, today: string) {
  const ageDays = Math.max(daysBetween(goal.createdAt.slice(0, 10), today), 0)
  const paceMonths = Math.min(3, Math.max(1, ageDays / AVERAGE_MONTH_DAYS))
  return { ageDays, pace: goal.savedLast90Days / paceMonths }
}

/**
 * Where a goal stands on `today` ("YYYY-MM-DD"). The pace is what was saved in the last 90
 * days per month (or per month of the goal's life, if it is younger than that), compared with
 * what is needed each month to hit the target by the deadline.
 */
export function goalProgress(
  goal: Pick<
    SavingsGoal,
    'targetAmount' | 'deadline' | 'balance' | 'savedLast90Days' | 'createdAt'
  >,
  today: string,
): GoalProgress {
  const { ageDays, pace } = savingPace(goal, today)
  const roundedPace = Math.round(pace / 1000) * 1000
  const result = (fields: Omit<GoalProgress, 'pace'>): GoalProgress => ({
    ...fields,
    pace: roundedPace,
  })

  const target = goal.targetAmount
  if (!target) return result({ ratio: null, remaining: null, monthlyNeeded: null, status: 'open' })

  const remaining = Math.max(target - goal.balance, 0)
  const ratio = Math.min(Math.max(goal.balance / target, 0), 1)
  if (remaining === 0) {
    return result({ ratio: 1, remaining: 0, monthlyNeeded: 0, status: 'achieved' })
  }
  if (!goal.deadline) return result({ ratio, remaining, monthlyNeeded: null, status: 'open' })

  const daysLeft = daysBetween(today, goal.deadline)
  if (daysLeft < 0) {
    return result({ ratio, remaining, monthlyNeeded: remaining, status: 'overdue' })
  }

  const monthsLeft = Math.max(1, Math.ceil(daysLeft / AVERAGE_MONTH_DAYS))
  const monthlyNeeded = Math.ceil(remaining / monthsLeft / 1000) * 1000

  let status: GoalStatus
  if (pace >= monthlyNeeded) status = 'on_track'
  else if (ageDays < 30 && goal.savedLast90Days <= 0) status = 'new'
  else if (pace >= monthlyNeeded * 0.6) status = 'tight'
  else status = 'behind'

  return result({ ratio, remaining, monthlyNeeded, status })
}
