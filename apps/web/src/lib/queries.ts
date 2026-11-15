import type {
  Account,
  AccountInput,
  AccountUpdate,
  Category,
  CategoryInput,
  CategoryUpdate,
  Transaction,
  TransactionInput,
} from '@finance/shared'
import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, jsonBody } from './api'

export const queryKeys = {
  accounts: ['accounts'],
  categories: ['categories'],
  transactions: ['transactions'],
  month: (month: string) => ['transactions', 'month', month],
  transaction: (id: string) => ['transactions', 'one', id],
} as const

export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: () => api<Account[]>('/accounts') })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api<Category[]>('/categories'),
  })
}

export function useMonthTransactions(month: string) {
  return useQuery({
    queryKey: queryKeys.month(month),
    queryFn: () => api<Transaction[]>(`/transactions?month=${month}`),
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
    [queryKeys.transactions, queryKeys.accounts],
  )

export const useDeleteTransaction = () =>
  useRefreshingMutation(
    (id: string) => api<void>(`/transactions/${id}`, { method: 'DELETE' }),
    [queryKeys.transactions, queryKeys.accounts],
  )
