import {
  type Account,
  accountInputSchema,
  accountUpdateSchema,
  type Category,
  CUSTOM_CATEGORY_SORT,
  cascadeDeleteQuerySchema,
  categoryInputSchema,
  categoryUpdateSchema,
  computeBalances,
  computeGoalBalances,
  DEFAULT_CATEGORIES,
  type Debt,
  debtInputSchema,
  debtOpeningType,
  debtUpdateSchema,
  defaultCategorySort,
  goalDelta,
  goalInputSchema,
  goalUpdateSchema,
  type MonthlyTotal,
  matchesFilters,
  monthlyReportQuerySchema,
  monthRange,
  monthsBetween,
  type SavingsGoal,
  SEARCH_LIMIT,
  shiftDate,
  summarize,
  type Transaction,
  type TransactionInput,
  toDateKey,
  transactionInputSchema,
  transactionListQuerySchema,
  transactionsToCsv,
} from '@finance/shared'
import type { z } from 'zod'
import { ApiError } from './errors'

/**
 * In-memory stand-in for the API, used only by demo builds (`vite --mode demo`). It follows the
 * same rules as the server so the preview behaves like the real app; nothing is persisted and
 * normal builds never include this file. Everything is created lazily on first use.
 */

type StoredAccount = Omit<Account, 'balance'>
type StoredCategory = Category & { sortOrder: number }
type StoredGoal = Omit<SavingsGoal, 'balance' | 'savedLast90Days'>
type StoredDebt = Omit<Debt, 'paid' | 'remaining' | 'accountId'>
type Store = {
  accounts: StoredAccount[]
  categories: StoredCategory[]
  goals: StoredGoal[]
  debts: StoredDebt[]
  transactions: Transaction[]
}

let store: Store | null = null

/** Start over from fresh example data (used by tests). */
export function resetDemoData() {
  store = null
}

export async function demoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 120)) // feel like a network round trip
  // Like the real API, nothing gets through without a connection (fetch rejects the same way).
  if (globalThis.navigator?.onLine === false) throw new TypeError('Failed to fetch')
  store ??= seed()

  const url = new URL(path, 'https://demo.invalid')
  const [resource, id] = url.pathname.split('/').filter(Boolean)
  const method = (init.method ?? 'GET').toUpperCase()
  const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined

  const result = route(store, method, resource, id, url.searchParams, body)
  return (result === undefined ? undefined : structuredClone(result)) as T
}

function route(
  db: Store,
  method: string,
  resource: string | undefined,
  id: string | undefined,
  query: URLSearchParams,
  body: unknown,
): unknown {
  if (resource === 'auth') return undefined
  if (resource === 'accounts') return accountsRoute(db, method, id, body)
  if (resource === 'categories') return categoriesRoute(db, method, id, body)
  if (resource === 'transactions') return transactionsRoute(db, method, id, query, body)
  if (resource === 'reports' && id === 'monthly' && method === 'GET') {
    return monthlyReport(db, query)
  }
  if (resource === 'savings') return savingsRoute(db, method, id, query, body)
  if (resource === 'debts') return debtsRoute(db, method, id, query, body)
  if (resource === 'export' && id === 'transactions.csv' && method === 'GET') return exportCsv(db)
  throw new ApiError(404, 'not_found')
}

/** Same file as GET /api/export/transactions.csv, built from the demo data. */
function exportCsv(db: Store): string {
  const name = <T extends { id: string; name: string }>(items: T[], id: string | null) =>
    items.find((item) => item.id === id)?.name ?? null
  const rows = [...db.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((t) => ({
      date: t.date,
      type: t.type,
      amount: t.amount,
      account: name(db.accounts, t.accountId) ?? '',
      toAccount: name(db.accounts, t.toAccountId),
      category: name(db.categories, t.categoryId),
      goal: name(db.goals, t.goalId),
      person: db.debts.find((d) => d.id === t.debtId)?.person ?? null,
      note: t.note,
    }))
  return transactionsToCsv(rows)
}

// Accounts

function withBalances(db: Store): Account[] {
  const balances = computeBalances(db.accounts, db.transactions)
  return db.accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? a.initialBalance }))
}

function accountsRoute(db: Store, method: string, id: string | undefined, body: unknown) {
  if (!id && method === 'GET') return withBalances(db)
  if (!id && method === 'POST') {
    const account = {
      ...parse(accountInputSchema, body),
      id: uuid(),
      archived: false,
      createdAt: now(),
    }
    db.accounts.push(account)
    return { ...account, balance: account.initialBalance }
  }
  const account = find(db.accounts, id)
  if (method === 'PATCH') {
    const { archived, ...fields } = parse(accountUpdateSchema, body)
    Object.assign(account, fields, archived === undefined ? {} : { archived })
    return withBalances(db).find((a) => a.id === account.id)
  }
  if (method === 'DELETE') {
    if (db.transactions.some((t) => t.accountId === id || t.toAccountId === id)) {
      throw new ApiError(409, 'in_use')
    }
    db.accounts = db.accounts.filter((a) => a.id !== id)
    return undefined
  }
  throw new ApiError(404, 'not_found')
}

// Categories

const publicCategory = ({ sortOrder: _, ...category }: StoredCategory): Category => category

function categoriesRoute(db: Store, method: string, id: string | undefined, body: unknown) {
  if (!id && method === 'GET') {
    return [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder).map(publicCategory)
  }
  if (!id && method === 'POST') {
    const category = {
      ...parse(categoryInputSchema, body),
      id: uuid(),
      archived: false,
      createdAt: now(),
      sortOrder: CUSTOM_CATEGORY_SORT,
    }
    db.categories.push(category)
    return publicCategory(category)
  }
  const category = find(db.categories, id)
  if (method === 'PATCH') {
    const { archived, ...fields } = parse(categoryUpdateSchema, body)
    Object.assign(category, fields, archived === undefined ? {} : { archived })
    return publicCategory(category)
  }
  if (method === 'DELETE') {
    if (db.transactions.some((t) => t.categoryId === id)) throw new ApiError(409, 'in_use')
    db.categories = db.categories.filter((c) => c.id !== id)
    return undefined
  }
  throw new ApiError(404, 'not_found')
}

// Transactions

function transactionsRoute(
  db: Store,
  method: string,
  id: string | undefined,
  query: URLSearchParams,
  body: unknown,
) {
  if (!id && method === 'GET') {
    const { month, q, ...filters } = parse(transactionListQuerySchema, Object.fromEntries(query))
    let list = db.transactions.filter((t) => matchesFilters(t, filters))
    if (month) {
      const { start, end } = monthRange(month)
      list = list.filter((t) => t.date >= start && t.date < end)
    }
    if (q) {
      const needle = q.toLowerCase()
      const nameOf = (items: { id: string; name: string }[], id: string | null) =>
        items.find((item) => item.id === id)?.name.toLowerCase() ?? ''
      list = list.filter(
        (t) =>
          (t.note ?? '').toLowerCase().includes(needle) ||
          nameOf(db.categories, t.categoryId).includes(needle) ||
          nameOf(db.goals, t.goalId).includes(needle) ||
          (db.debts.find((d) => d.id === t.debtId)?.person.toLowerCase() ?? '').includes(needle),
      )
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    return month || ((filters.goalId || filters.debtId) && !q) ? list : list.slice(0, SEARCH_LIMIT)
  }
  if (!id && method === 'POST') {
    const input = parse(transactionInputSchema, body)
    checkReferences(db, input)
    const transaction = { ...toValues(input), id: uuid(), createdAt: now() }
    db.transactions.push(transaction)
    return transaction
  }
  const existing = find(db.transactions, id)
  if (method === 'GET') return existing
  // Like the server: a debt's opening move only changes through the debt itself.
  const isOpening = existing.type === 'debt_borrow' || existing.type === 'debt_lend'
  if (method === 'PUT') {
    if (isOpening) throw new ApiError(400, 'managed_by_debt')
    const input = parse(transactionInputSchema, body)
    checkReferences(db, input, existing)
    keepGoalPositive(db, existing, input)
    Object.assign(existing, toValues(input))
    return existing
  }
  if (method === 'DELETE') {
    if (isOpening) throw new ApiError(400, 'managed_by_debt')
    keepGoalPositive(db, existing)
    db.transactions = db.transactions.filter((t) => t.id !== id)
    return undefined
  }
  throw new ApiError(404, 'not_found')
}

/** Same rule as the server: removing or shrinking a deposit may not push its goal below 0. */
function keepGoalPositive(db: Store, existing: Transaction, replacement?: TransactionInput) {
  if (existing.type !== 'saving_deposit' || !existing.goalId) return
  const goal = db.goals.find((g) => g.id === existing.goalId)
  if (!goal) return
  const others = db.transactions.filter((t) => t.id !== existing.id)
  let balance = computeGoalBalances([goal], others).get(goal.id) ?? 0
  if (
    (replacement?.type === 'saving_deposit' || replacement?.type === 'saving_withdrawal') &&
    replacement.goalId === goal.id
  ) {
    balance += replacement.type === 'saving_deposit' ? replacement.amount : -replacement.amount
  }
  if (balance < 0) throw new ApiError(400, 'savings_already_used')
}

function monthlyReport(db: Store, query: URLSearchParams): MonthlyTotal[] {
  const { from, to } = parse(monthlyReportQuerySchema, Object.fromEntries(query))
  return monthsBetween(from, to).map((month) => {
    const { income, expense } = summarize(db.transactions.filter((t) => t.date.startsWith(month)))
    return { month, income, expense }
  })
}

function toValues(input: TransactionInput) {
  return {
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.type === 'transfer' ? input.toAccountId : null,
    categoryId: input.type === 'income' || input.type === 'expense' ? input.categoryId : null,
    goalId:
      input.type === 'saving_deposit' || input.type === 'saving_withdrawal' ? input.goalId : null,
    debtId: input.type === 'debt_repay' || input.type === 'debt_collect' ? input.debtId : null,
    date: input.date,
    note: input.note || null,
  }
}

function checkReferences(db: Store, input: TransactionInput, existing?: Transaction) {
  const ids = input.type === 'transfer' ? [input.accountId, input.toAccountId] : [input.accountId]
  const kept = new Set([existing?.accountId, existing?.toAccountId])
  for (const accountId of ids) {
    const account = db.accounts.find((a) => a.id === accountId)
    if (!account) throw new ApiError(400, 'invalid_account')
    if (account.archived && !kept.has(account.id)) throw new ApiError(400, 'archived_account')
  }
  if (input.type === 'income' || input.type === 'expense') {
    const category = db.categories.find((c) => c.id === input.categoryId)
    if (!category || category.type !== input.type) throw new ApiError(400, 'invalid_category')
    if (category.archived && category.id !== existing?.categoryId) {
      throw new ApiError(400, 'archived_category')
    }
  }
  if (input.type === 'saving_deposit' || input.type === 'saving_withdrawal') {
    const goal = db.goals.find((g) => g.id === input.goalId)
    if (!goal) throw new ApiError(400, 'invalid_goal')
    if (goal.archived && goal.id !== existing?.goalId) throw new ApiError(400, 'archived_goal')
    if (input.type === 'saving_withdrawal') {
      const others = db.transactions.filter((t) => t.id !== existing?.id)
      const available = computeGoalBalances([goal], others).get(goal.id) ?? 0
      if (input.amount > available) throw new ApiError(400, 'insufficient_savings')
    }
  }
  if (input.type === 'debt_repay' || input.type === 'debt_collect') {
    const debt = debtsWithTotals(db, existing?.id).find((d) => d.id === input.debtId)
    const expected = debt?.direction === 'payable' ? 'debt_repay' : 'debt_collect'
    if (!debt || input.type !== expected) throw new ApiError(400, 'invalid_debt')
    if (debt.writtenOff && debt.id !== existing?.debtId) throw new ApiError(400, 'debt_closed')
    if (input.amount > debt.amount - debt.paid) throw new ApiError(400, 'debt_overpaid')
  }
}

// Debts

/** Debts with what was paid, what is left and the opening wallet; optionally ignoring a payment. */
function debtsWithTotals(db: Store, excludeTransactionId?: string): Debt[] {
  return db.debts.map((debt) => {
    const moves = db.transactions.filter(
      (t) => t.debtId === debt.id && t.id !== excludeTransactionId,
    )
    const paid = moves
      .filter((t) => t.type === 'debt_repay' || t.type === 'debt_collect')
      .reduce((sum, t) => sum + t.amount, 0)
    const opening = moves.find((t) => t.type === 'debt_borrow' || t.type === 'debt_lend')
    return {
      ...debt,
      paid,
      remaining: debt.writtenOff ? 0 : Math.max(debt.amount - paid, 0),
      accountId: opening?.accountId ?? null,
    }
  })
}

/** Same rule as the server: a wallet newly picked for a debt must exist and be active. */
function checkDebtWallet(db: Store, accountId: string) {
  const account = db.accounts.find((a) => a.id === accountId)
  if (!account) throw new ApiError(400, 'invalid_account')
  if (account.archived) throw new ApiError(400, 'archived_account')
}

const isOpeningOf = (debtId: string) => (t: Transaction) =>
  t.debtId === debtId && (t.type === 'debt_borrow' || t.type === 'debt_lend')

function debtsRoute(
  db: Store,
  method: string,
  id: string | undefined,
  query: URLSearchParams,
  body: unknown,
) {
  if (!id && method === 'GET') return debtsWithTotals(db)
  if (!id && method === 'POST') {
    const { accountId, ...input } = parse(debtInputSchema, body)
    if (accountId) checkDebtWallet(db, accountId)
    const debt: StoredDebt = {
      ...input,
      note: input.note || null,
      id: uuid(),
      writtenOff: false,
      createdAt: now(),
    }
    db.debts.push(debt)
    if (accountId) db.transactions.push(openingMove(debt, accountId))
    return debtsWithTotals(db).find((d) => d.id === debt.id)
  }
  const debt = find(db.debts, id)
  const current = debtsWithTotals(db).find((d) => d.id === debt.id)
  const paid = current?.paid ?? 0
  if (method === 'PATCH') {
    const { writtenOff, note, accountId, ...fields } = parse(debtUpdateSchema, body)
    if (fields.amount !== undefined && fields.amount < paid) {
      throw new ApiError(400, 'debt_below_paid')
    }
    if (fields.direction && fields.direction !== debt.direction && paid > 0) {
      throw new ApiError(400, 'debt_direction_locked')
    }
    const currentWallet = current?.accountId ?? null
    if (accountId && accountId !== currentWallet) checkDebtWallet(db, accountId)

    Object.assign(
      debt,
      fields,
      note === undefined ? {} : { note: note || null },
      writtenOff === undefined ? {} : { writtenOff },
    )
    const openingTouched =
      fields.direction !== undefined ||
      fields.amount !== undefined ||
      fields.date !== undefined ||
      accountId !== undefined
    if (openingTouched) {
      const wallet = accountId === undefined ? currentWallet : accountId
      const isOpening = isOpeningOf(debt.id)
      const opening = db.transactions.find(isOpening)
      if (!wallet) db.transactions = db.transactions.filter((t) => !isOpening(t))
      else if (opening) {
        Object.assign(opening, {
          type: debtOpeningType(debt.direction),
          amount: debt.amount,
          accountId: wallet,
          date: debt.date,
        })
      } else db.transactions.push(openingMove(debt, wallet))
    }
    return debtsWithTotals(db).find((d) => d.id === debt.id)
  }
  if (method === 'DELETE') {
    const { withTransactions = false } = parse(cascadeDeleteQuerySchema, Object.fromEntries(query))
    if (paid > 0 && !withTransactions) throw new ApiError(409, 'debt_has_payments')
    db.transactions = db.transactions.filter((t) => t.debtId !== debt.id)
    db.debts = db.debts.filter((d) => d.id !== debt.id)
    return undefined
  }
  throw new ApiError(404, 'not_found')
}

/** The move that put borrowed money into a wallet or took lent money out of it. */
function openingMove(debt: StoredDebt, accountId: string): Transaction {
  return {
    id: uuid(),
    type: debtOpeningType(debt.direction),
    amount: debt.amount,
    accountId,
    toAccountId: null,
    categoryId: null,
    goalId: null,
    debtId: debt.id,
    date: debt.date,
    note: null,
    createdAt: now(),
  }
}

// Savings goals

function goalsWithBalances(db: Store): SavingsGoal[] {
  const balances = computeGoalBalances(db.goals, db.transactions)
  const since = shiftDate(toDateKey(new Date()), -90)
  return db.goals.map((goal) => ({
    ...goal,
    balance: balances.get(goal.id) ?? goal.initialAmount,
    savedLast90Days: db.transactions
      .filter((t) => t.goalId === goal.id && t.date >= since)
      .reduce((sum, t) => sum + goalDelta(t), 0),
  }))
}

function savingsRoute(
  db: Store,
  method: string,
  id: string | undefined,
  query: URLSearchParams,
  body: unknown,
) {
  if (!id && method === 'GET') return goalsWithBalances(db)
  if (!id && method === 'POST') {
    const goal = { ...parse(goalInputSchema, body), id: uuid(), archived: false, createdAt: now() }
    db.goals.push(goal)
    return { ...goal, balance: goal.initialAmount, savedLast90Days: 0 }
  }
  const goal = find(db.goals, id)
  if (method === 'PATCH') {
    const { archived, ...fields } = parse(goalUpdateSchema, body)
    const balance = goalsWithBalances(db).find((g) => g.id === goal.id)?.balance ?? 0
    const moves = balance - goal.initialAmount
    if (
      fields.initialAmount !== undefined &&
      fields.initialAmount < goal.initialAmount &&
      fields.initialAmount + moves < 0
    ) {
      throw new ApiError(400, 'savings_below_withdrawn')
    }
    Object.assign(goal, fields, archived === undefined ? {} : { archived })
    return goalsWithBalances(db).find((g) => g.id === goal.id)
  }
  if (method === 'DELETE') {
    const { withTransactions = false } = parse(cascadeDeleteQuerySchema, Object.fromEntries(query))
    if (!withTransactions && db.transactions.some((t) => t.goalId === id)) {
      throw new ApiError(409, 'in_use')
    }
    db.transactions = db.transactions.filter((t) => t.goalId !== id)
    db.goals = db.goals.filter((g) => g.id !== id)
    return undefined
  }
  throw new ApiError(404, 'not_found')
}

// Helpers

function parse<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body)
  if (!result.success) throw new ApiError(400, 'invalid_input')
  return result.data
}

function find<T extends { id: string }>(items: T[], id: string | undefined): T {
  const item = items.find((i) => i.id === id)
  if (!item) throw new ApiError(404, 'not_found')
  return item
}

const now = () => new Date().toISOString()

/** RFC 4122 v4 id; works outside secure contexts too (e.g. a demo opened from a file). */
function uuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Example data around today's date, so every screen has something to show. */
function seed(): Store {
  const createdAt = now()
  const accounts: StoredAccount[] = [
    { name: 'Tunai', type: 'cash' as const, initialBalance: 450_000 },
    { name: 'BCA', type: 'bank' as const, initialBalance: 6_200_000 },
    { name: 'GoPay', type: 'ewallet' as const, initialBalance: 120_000 },
  ].map((a) => ({ ...a, id: uuid(), archived: false, createdAt }))
  const categories: StoredCategory[] = DEFAULT_CATEGORIES.map((c, index) => ({
    ...c,
    id: uuid(),
    archived: false,
    createdAt,
    sortOrder: defaultCategorySort(c, index),
  }))

  const account = (name: string) => accounts.find((a) => a.name === name)?.id ?? ''
  const category = (name: string, type: 'income' | 'expense') =>
    categories.find((c) => c.name === name && c.type === type)?.id ?? null
  const today = toDateKey(new Date())

  type Example = [
    daysAgo: number,
    amount: number,
    from: string,
    target: string,
    note: string | null,
  ]
  const expenses: Example[] = [
    [0, 38_000, 'Tunai', 'Makan & Minum', 'Nasi padang'],
    [0, 22_000, 'GoPay', 'Transportasi', 'Ojek ke kantor'],
    [1, 185_000, 'BCA', 'Belanja', 'Belanja mingguan'],
    [2, 55_000, 'GoPay', 'Hiburan', 'Nonton'],
    [3, 450_000, 'BCA', 'Tagihan', 'Listrik'],
    [5, 100_000, 'BCA', 'Pulsa & Internet', 'Paket data'],
    [6, 27_000, 'Tunai', 'Makan & Minum', null],
    [8, 75_000, 'Tunai', 'Sedekah & Donasi', null],
    [15, 320_000, 'BCA', 'Kesehatan', 'Vitamin & obat'],
    [20, 60_000, 'Tunai', 'Transportasi', 'Bensin'],
    [33, 900_000, 'BCA', 'Rumah', 'Perbaikan keran'],
  ]
  const incomes: Example[] = [
    [4, 1_500_000, 'BCA', 'Usaha & Freelance', 'Proyek desain'],
    [10, 8_500_000, 'BCA', 'Gaji', 'Gaji bulanan'],
    [40, 8_500_000, 'BCA', 'Gaji', 'Gaji bulanan'],
  ]
  const transfers: Example[] = [
    [1, 200_000, 'BCA', 'GoPay', 'Top up'],
    [12, 500_000, 'BCA', 'Tunai', 'Tarik tunai'],
  ]

  // Five earlier months of typical spending, so the trend chart has a shape to show.
  const monthly: [category: string, amount: number, from: string, note: string | null][] = [
    ['Makan & Minum', 1_150_000, 'BCA', 'Makan sebulan'],
    ['Transportasi', 420_000, 'GoPay', 'Transport sebulan'],
    ['Tagihan', 680_000, 'BCA', 'Listrik & air'],
    ['Belanja', 900_000, 'BCA', 'Belanja bulanan'],
    ['Hiburan', 250_000, 'GoPay', null],
    ['Pulsa & Internet', 100_000, 'BCA', 'Paket data'],
  ]
  for (const [i, swing] of [1.08, 0.92, 1.2, 0.97, 0.88].entries()) {
    const daysAgo = 45 + i * 30
    incomes.push([daysAgo + 5, 8_500_000, 'BCA', 'Gaji', 'Gaji bulanan'])
    transfers.push([daysAgo + 4, 750_000, 'BCA', 'GoPay', 'Top up'])
    monthly.forEach(([target, amount, from, note], j) => {
      expenses.push([
        daysAgo + j * 3,
        Math.round((amount * swing) / 1000) * 1000,
        from,
        target,
        note,
      ])
    })
  }

  const base = (type: Transaction['type'], [daysAgo, amount, from, , note]: Example) => ({
    id: uuid(),
    type,
    amount,
    accountId: account(from),
    goalId: null,
    debtId: null,
    date: shiftDate(today, -daysAgo),
    note,
    // Later in the list = earlier in the day, so same-day entries keep a stable order.
    createdAt: new Date(Date.now() - daysAgo * 86_400_000 - amount).toISOString(),
  })
  const transactions: Transaction[] = [
    ...expenses.map((e) => ({
      ...base('expense', e),
      toAccountId: null,
      categoryId: category(e[3], 'expense'),
    })),
    ...incomes.map((e) => ({
      ...base('income', e),
      toAccountId: null,
      categoryId: category(e[3], 'income'),
    })),
    ...transfers.map((e) => ({
      ...base('transfer', e),
      toAccountId: account(e[3]),
      categoryId: null,
    })),
  ]

  // Savings goals showing every state: an open-ended pot, one on track (with a "culik"), one
  // behind and one already reached.
  const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const goals: StoredGoal[] = [
    ['Dana Darurat', 'piggy-bank', 'emerald', 30_000_000, null, 12_000_000, 200],
    ['Liburan Bali', 'plane', 'sky', 8_000_000, 210, 0, 160],
    ['Laptop baru', 'laptop', 'violet', 15_000_000, 90, 2_000_000, 120],
    ['HP baru', 'smartphone', 'pink', 4_000_000, 30, 1_000_000, 100],
  ].map(([name, icon, color, targetAmount, deadlineIn, initialAmount, ageDays]) => ({
    id: uuid(),
    name: name as string,
    icon: icon as StoredGoal['icon'],
    color: color as StoredGoal['color'],
    targetAmount: targetAmount as number,
    deadline: deadlineIn === null ? null : shiftDate(today, deadlineIn as number),
    initialAmount: initialAmount as number,
    archived: false,
    createdAt: daysAgoIso(ageDays as number),
  }))
  const goalId = (name: string) => goals.find((g) => g.name === name)?.id ?? null

  type Move = [
    daysAgo: number,
    deposit: boolean,
    amount: number,
    wallet: string,
    goal: string,
    note: string | null,
  ]
  const moves: Move[] = [
    ...[5, 35, 65, 95, 125].map((d): Move => [d, true, 1_000_000, 'BCA', 'Dana Darurat', null]),
    [3, false, 150_000, 'Tunai', 'Dana Darurat', 'Servis motor'],
    ...[8, 38, 68, 98, 128].map((d): Move => [d, true, 900_000, 'BCA', 'Liburan Bali', null]),
    [20, false, 300_000, 'GoPay', 'Liburan Bali', 'Tiket konser'],
    [40, true, 500_000, 'BCA', 'Laptop baru', null],
    [100, true, 1_000_000, 'BCA', 'Laptop baru', null],
    [15, true, 1_500_000, 'BCA', 'HP baru', null],
    [45, true, 1_500_000, 'BCA', 'HP baru', 'Dari bonus'],
  ]
  for (const [daysAgo, deposit, amount, wallet, goal, note] of moves) {
    transactions.push({
      id: uuid(),
      type: deposit ? 'saving_deposit' : 'saving_withdrawal',
      amount,
      accountId: account(wallet),
      toAccountId: null,
      categoryId: null,
      goalId: goalId(goal),
      debtId: null,
      date: shiftDate(today, -daysAgo),
      note,
      createdAt: daysAgoIso(daysAgo),
    })
  }

  // Debts showing every state: a piutang partly paid back, a hutang due in a few days, an
  // overdue piutang, a paylater hutang without a wallet and a settled hutang.
  type DebtExample = {
    person: string
    direction: Debt['direction']
    amount: number
    daysAgo: number
    dueIn: number | null
    wallet: string | null
    note: string | null
    payments: [daysAgo: number, amount: number, wallet: string][]
  }
  const debtExamples: DebtExample[] = [
    {
      person: 'Budi',
      direction: 'receivable',
      amount: 1_500_000,
      daysAgo: 40,
      dueIn: 20,
      wallet: 'BCA',
      note: 'Modal jualan',
      payments: [[10, 500_000, 'BCA']],
    },
    {
      person: 'Kakak',
      direction: 'payable',
      amount: 2_000_000,
      daysAgo: 60,
      dueIn: 5,
      wallet: 'BCA',
      note: 'Servis motor',
      payments: [[30, 1_000_000, 'BCA']],
    },
    {
      person: 'Rina',
      direction: 'receivable',
      amount: 300_000,
      daysAgo: 25,
      dueIn: -10,
      wallet: 'GoPay',
      note: 'Patungan kado',
      payments: [],
    },
    {
      person: 'Paylater',
      direction: 'payable',
      amount: 900_000,
      daysAgo: 15,
      dueIn: 15,
      wallet: null,
      note: 'Beli headphone',
      payments: [],
    },
    {
      person: 'Andi',
      direction: 'payable',
      amount: 500_000,
      daysAgo: 90,
      dueIn: null,
      wallet: 'Tunai',
      note: null,
      payments: [[70, 500_000, 'Tunai']],
    },
  ]
  const debts: StoredDebt[] = []
  for (const example of debtExamples) {
    const debt: StoredDebt = {
      id: uuid(),
      direction: example.direction,
      person: example.person,
      amount: example.amount,
      date: shiftDate(today, -example.daysAgo),
      dueDate: example.dueIn === null ? null : shiftDate(today, example.dueIn),
      note: example.note,
      writtenOff: false,
      createdAt: daysAgoIso(example.daysAgo),
    }
    debts.push(debt)
    const payable = debt.direction === 'payable'
    const move = (type: Transaction['type'], amount: number, wallet: string, ago: number) =>
      transactions.push({
        id: uuid(),
        type,
        amount,
        accountId: account(wallet),
        toAccountId: null,
        categoryId: null,
        goalId: null,
        debtId: debt.id,
        date: shiftDate(today, -ago),
        note: null,
        createdAt: daysAgoIso(ago),
      })
    if (example.wallet) {
      move(payable ? 'debt_borrow' : 'debt_lend', debt.amount, example.wallet, example.daysAgo)
    }
    for (const [ago, amount, wallet] of example.payments) {
      move(payable ? 'debt_repay' : 'debt_collect', amount, wallet, ago)
    }
  }

  return { accounts, categories, goals, debts, transactions }
}
