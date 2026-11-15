import type {
  Account,
  AccountInput,
  AccountUpdate,
  Category,
  CategoryInput,
  CategoryUpdate,
  Debt,
  DebtInput,
  DebtUpdate,
  GoalInput,
  GoalUpdate,
  MonthlyTotal,
  SavingsGoal,
  Transaction,
  TransactionFilters,
  TransactionInput,
} from '@finance/shared'
import {
  keepPreviousData,
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api, jsonBody } from './api'

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

export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: () => api<Account[]>('/accounts') })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api<Category[]>('/categories'),
  })
}

// Lists and reports keep showing the previous result while the next one loads (switching
// months, typing a search), so the screen never flashes back to a skeleton.

export function useMonthTransactions(month: string) {
  return useQuery({
    queryKey: queryKeys.month(month),
    queryFn: () => api<Transaction[]>(`/transactions?month=${month}`),
    placeholderData: keepPreviousData,
  })
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

export const useSaveTransaction = () =>
  useRefreshingMutation(
    ({ id, input }: { id?: string; input: TransactionInput }) =>
      id
        ? api<Transaction>(`/transactions/${id}`, jsonBody('PUT', input))
        : api<Transaction>('/transactions', jsonBody('POST', input)),
    [
      queryKeys.transactions,
      queryKeys.accounts,
      queryKeys.reports,
      queryKeys.savings,
      queryKeys.debts,
    ],
  )

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
  return useQuery({ queryKey: queryKeys.savings, queryFn: () => api<SavingsGoal[]>('/savings') })
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

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/savings/${id}`, { method: 'DELETE' }),
    // Refresh without waiting: the caller navigates away from the deleted goal's page first,
    // instead of that page re-rendering as "not found" (and unmounting before it can leave).
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savings })
    },
  })
}

// Debts (hutang/piutang). Creating, editing or deleting one can move wallet money (the
// opening move), so wallets and transaction lists are refreshed too. Payments are
// transactions (useSaveTransaction).

const debtRefresh = [queryKeys.debts, queryKeys.accounts, queryKeys.transactions] as const

export function useDebts() {
  return useQuery({ queryKey: queryKeys.debts, queryFn: () => api<Debt[]>('/debts') })
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
    mutationFn: (id: string) => api<void>(`/debts/${id}`, { method: 'DELETE' }),
    // Like goals: refresh without waiting so the caller can leave the deleted debt's page
    // before it would re-render as "not found".
    onSuccess: () => {
      for (const queryKey of debtRefresh) void queryClient.invalidateQueries({ queryKey })
    },
  })
}
