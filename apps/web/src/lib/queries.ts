import {
  type Account,
  type AccountInput,
  type AccountUpdate,
  type Category,
  type CategoryInput,
  type CategoryUpdate,
  type Debt,
  type DebtInput,
  type DebtUpdate,
  type GoalInput,
  type GoalUpdate,
  type MonthlyTotal,
  type SavingsGoal,
  type Transaction,
  type TransactionFilters,
  type TransactionInput,
  toMonthKey,
} from '@finance/shared'
import {
  keepPreviousData,
  type QueryKey,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api, jsonBody } from './api'
import { queryClient } from './queryClient'

export const queryKeys = {
  accounts: ['accounts'],
  categories: ['categories'],
  transactions: ['transactions'],
  month: (month: string) => ['transactions', 'month', month],
  transaction: (id: string) => ['transactions', 'one', id],
  search: (q: string, filters: TransactionFilters) => ['transactions', 'search', q, filters],
  reports: ['reports'],
  monthly: (from: string, to: string) => ['reports', 'monthly', from, to],
  savings: ['savings'],
  goalHistory: (goalId: string) => ['transactions', 'goal', goalId],
  debts: ['debts'],
  debtHistory: (debtId: string) => ['transactions', 'debt', debtId],
} as const

/** Query string without empty values. */
const toQuery = (params: Record<string, string | undefined>) =>
  new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()

const accountsQuery = queryOptions({
  queryKey: queryKeys.accounts,
  queryFn: () => api<Account[]>('/accounts'),
})
const categoriesQuery = queryOptions({
  queryKey: queryKeys.categories,
  queryFn: () => api<Category[]>('/categories'),
})
const monthQuery = (month: string) =>
  queryOptions({
    queryKey: queryKeys.month(month),
    queryFn: () => api<Transaction[]>(`/transactions?month=${month}`),
  })
const savingsQuery = queryOptions({
  queryKey: queryKeys.savings,
  queryFn: () => api<SavingsGoal[]>('/savings'),
})
const debtsQuery = queryOptions({ queryKey: queryKeys.debts, queryFn: () => api<Debt[]>('/debts') })

/** Everything Home shows, requested at startup alongside the session check. */
export function prefetchStartupData() {
  void queryClient.prefetchQuery(accountsQuery)
  void queryClient.prefetchQuery(categoriesQuery)
  void queryClient.prefetchQuery(savingsQuery)
  void queryClient.prefetchQuery(debtsQuery)
  void queryClient.prefetchQuery(monthQuery(toMonthKey(new Date())))
}

export function useAccounts() {
  return useQuery(accountsQuery)
}

export function useCategories() {
  return useQuery(categoriesQuery)
}

// Lists and reports keep showing the previous result while the next one loads (switching
// months, typing a search), so the screen never flashes back to a skeleton.

export function useMonthTransactions(month: string) {
  return useQuery({ ...monthQuery(month), placeholderData: keepPreviousData })
}

/** Search across all months; idle while `q` is empty. */
export function useTransactionSearch(q: string, filters: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.search(q, filters),
    queryFn: () => api<Transaction[]>(`/transactions?${toQuery({ q, ...filters })}`),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  })
}

/** Income and expense per month, `from` to `to` included. */
export function useMonthlyReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.monthly(from, to),
    queryFn: () => api<MonthlyTotal[]>(`/reports/monthly?${toQuery({ from, to })}`),
    placeholderData: keepPreviousData,
  })
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ''),
    queryFn: () => api<Transaction>(`/transactions/${id}`),
    enabled: id !== undefined,
  })
}

/** A mutation that refetches the given queries once it succeeds. */
function useRefreshingMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
  refresh: readonly QueryKey[],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

// Accounts

export const useCreateAccount = () =>
  useRefreshingMutation(
    (input: AccountInput) => api<Account>('/accounts', jsonBody('POST', input)),
    [queryKeys.accounts],
  )

export const useUpdateAccount = () =>
  useRefreshingMutation(
    ({ id, ...patch }: AccountUpdate & { id: string }) =>
      api<Account>(`/accounts/${id}`, jsonBody('PATCH', patch)),
    [queryKeys.accounts],
  )

export const useDeleteAccount = () =>
  useRefreshingMutation(
    (id: string) => api<void>(`/accounts/${id}`, { method: 'DELETE' }),
    [queryKeys.accounts],
  )

// Categories

export const useCreateCategory = () =>
  useRefreshingMutation(
    (input: CategoryInput) => api<Category>('/categories', jsonBody('POST', input)),
    [queryKeys.categories],
  )

export const useUpdateCategory = () =>
  useRefreshingMutation(
    ({ id, ...patch }: CategoryUpdate & { id: string }) =>
      api<Category>(`/categories/${id}`, jsonBody('PATCH', patch)),
    [queryKeys.categories],
  )

export const useDeleteCategory = () =>
  useRefreshingMutation(
    (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
    [queryKeys.categories],
  )

// Transactions — every change also moves account balances.

/** Everything a transaction can change: lists, wallet balances, reports, goals and debts. */
const moneyKeys = [
  queryKeys.transactions,
  queryKeys.accounts,
  queryKeys.reports,
  queryKeys.savings,
  queryKeys.debts,
] as const

/** Refetch everything a money change touches, in the background. */
export function refreshMoney(except?: (queryKey: QueryKey) => boolean) {
  for (const queryKey of moneyKeys) {
    void queryClient.invalidateQueries({
      queryKey,
      predicate: except ? (query) => !except(query.queryKey) : undefined,
    })
  }
}

/** Same order as the API: newest date first, then the most recently recorded. */
const newestFirst = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

/**
 * Saving puts the entry into the month list right away, so the screen it returns to already
 * shows it; balances and the rest refresh in the background a moment later.
 */
export function useSaveTransaction() {
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TransactionInput }) =>
      id
        ? api<Transaction>(`/transactions/${id}`, jsonBody('PUT', input))
        : api<Transaction>('/transactions', jsonBody('POST', input)),
    onSuccess: (saved) => {
      queryClient.setQueriesData<Transaction[]>({ queryKey: ['transactions', 'month'] }, (list) =>
        list?.filter((t) => t.id !== saved.id),
      )
      queryClient.setQueryData<Transaction[]>(
        queryKeys.month(toMonthKey(saved.date)),
        (list) => list && [...list, saved].sort(newestFirst),
      )
      queryClient.setQueryData(queryKeys.transaction(saved.id), saved)
      refreshMoney()
    },
  })
}

/** What to send to record a transaction again exactly as it was (undo of a delete). */
export function transactionInputOf(t: Transaction): TransactionInput | null {
  const common = { amount: t.amount, accountId: t.accountId, date: t.date, note: t.note }
  switch (t.type) {
    case 'income':
    case 'expense':
      return t.categoryId ? { ...common, type: t.type, categoryId: t.categoryId } : null
    case 'transfer':
      return t.toAccountId ? { ...common, type: t.type, toAccountId: t.toAccountId } : null
    case 'saving_deposit':
    case 'saving_withdrawal':
      return t.goalId ? { ...common, type: t.type, goalId: t.goalId } : null
    case 'debt_repay':
    case 'debt_collect':
      return t.debtId ? { ...common, type: t.type, debtId: t.debtId } : null
    default:
      return null // a debt's opening move only changes through the debt itself
  }
}

/** Undo for "recorded": remove the entry again. */
export async function undoCreate(id: string) {
  await api<void>(`/transactions/${id}`, { method: 'DELETE' })
  refreshMoney()
}

/** Undo for "deleted": record it again (it gets a new id). */
export async function undoDelete(t: Transaction) {
  const input = transactionInputOf(t)
  if (!input) return
  await api<Transaction>('/transactions', jsonBody('POST', input))
  refreshMoney()
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/transactions/${id}`, { method: 'DELETE' }),
    // Refresh lists and balances, but not the deleted entry itself: its edit page is still on
    // screen, and refetching it would replace the page with a "not found" error (and unmount
    // the form before it can navigate back).
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.transactions,
          predicate: ({ queryKey }) => queryKey[1] !== 'one' || queryKey[2] !== id,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.savings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts }),
      ]),
  })
}

// Savings goals. Deposits and withdrawals are transactions (useSaveTransaction), which also
// refresh the goals.

export function useSavingsGoals() {
  return useQuery(savingsQuery)
}

/** Every deposit and withdrawal of one goal, newest first. */
export function useGoalHistory(goalId: string) {
  return useQuery({
    queryKey: queryKeys.goalHistory(goalId),
    queryFn: () => api<Transaction[]>(`/transactions?${toQuery({ goalId })}`),
  })
}

export const useCreateGoal = () =>
  useRefreshingMutation(
    (input: GoalInput) => api<SavingsGoal>('/savings', jsonBody('POST', input)),
    [queryKeys.savings],
  )

export const useUpdateGoal = () =>
  useRefreshingMutation(
    ({ id, ...patch }: GoalUpdate & { id: string }) =>
      api<SavingsGoal>(`/savings/${id}`, jsonBody('PATCH', patch)),
    [queryKeys.savings],
  )

/** What a delete takes along: `withTransactions` also removes the record's isi/culik or payments. */
type DeleteVariables = { id: string; withTransactions?: boolean }
const deletePath = (base: string, { id, withTransactions }: DeleteVariables) =>
  `${base}/${id}${withTransactions ? '?withTransactions=true' : ''}`

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: DeleteVariables) =>
      api<void>(deletePath('/savings', variables), { method: 'DELETE' }),
    // Refresh without waiting: the caller navigates away from the deleted goal's page first,
    // instead of that page re-rendering as "not found" (and unmounting before it can leave).
    // Deleting its isi/culik moves wallet money back, so wallets and lists refresh too.
    onSuccess: () => {
      for (const queryKey of [queryKeys.savings, queryKeys.accounts, queryKeys.transactions]) {
        void queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}

// Debts (hutang/piutang). Creating, editing or deleting one can move wallet money (the
// opening move), so wallets and transaction lists are refreshed too. Payments are
// transactions (useSaveTransaction).

const debtRefresh = [queryKeys.debts, queryKeys.accounts, queryKeys.transactions] as const

export function useDebts() {
  return useQuery(debtsQuery)
}

/** The opening move and every payment of one debt, newest first. */
export function useDebtHistory(debtId: string) {
  return useQuery({
    queryKey: queryKeys.debtHistory(debtId),
    queryFn: () => api<Transaction[]>(`/transactions?${toQuery({ debtId })}`),
  })
}

export const useCreateDebt = () =>
  useRefreshingMutation(
    (input: DebtInput) => api<Debt>('/debts', jsonBody('POST', input)),
    debtRefresh,
  )

export const useUpdateDebt = () =>
  useRefreshingMutation(
    ({ id, ...patch }: DebtUpdate & { id: string }) =>
      api<Debt>(`/debts/${id}`, jsonBody('PATCH', patch)),
    debtRefresh,
  )

export function useDeleteDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: DeleteVariables) =>
      api<void>(deletePath('/debts', variables), { method: 'DELETE' }),
    // Like goals: refresh without waiting so the caller can leave the deleted debt's page
    // before it would re-render as "not found".
    onSuccess: () => {
      for (const queryKey of debtRefresh) void queryClient.invalidateQueries({ queryKey })
    },
  })
}

/** Undo for archiving (or reactivating) a wallet, category or goal. */
export async function setArchived(
  resource: 'accounts' | 'categories' | 'savings',
  id: string,
  archived: boolean,
) {
  await api(`/${resource}/${id}`, jsonBody('PATCH', { archived }))
  await queryClient.invalidateQueries({ queryKey: [resource] })
}

/** Undo for "Ikhlaskan" / "Dianggap lunas". */
export async function setWrittenOff(id: string, writtenOff: boolean) {
  await api(`/debts/${id}`, jsonBody('PATCH', { writtenOff }))
  await queryClient.invalidateQueries({ queryKey: queryKeys.debts })
}
