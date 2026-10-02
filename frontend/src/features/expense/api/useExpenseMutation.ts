import { useQueryClient } from "@tanstack/react-query"
import { api } from '@/api/client'
import { useMutationWithToast } from '@/lib/useMutationWithToast'
import { CreateExpenseInput } from '../schemas/expenseSchema'
import { ExpenseResponse } from '../types/expense.types'

interface CreateExpenseParams {
  groupId: string
  data: CreateExpenseInput
}

const createExpenseApi = async ({ groupId, data }: CreateExpenseParams) => {
  const response = await api.post(`/expenses/${groupId}/create/`, data)
  return response.data
}

const updateExpenseApi = async ({
  expenseId,
  data,
}: {
  expenseId: string | number
  data: CreateExpenseInput
}) => {
  const response = await api.patch(`/expenses/${expenseId}/update/`, data)
  return response.data
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Expense added',
    mutationFn: createExpenseApi,
    onMutate: async (variables) => {
      // Cancel both keys: the expense list and the group detail that embeds it.
      await queryClient.cancelQueries({ queryKey: ['expenses', variables.groupId] })
      await queryClient.cancelQueries({ queryKey: ['group', variables.groupId] })
      const previousExpenses = queryClient.getQueryData<ExpenseResponse[]>([
        'expenses',
        variables.groupId,
      ])
      const hadExpensesQuery = queryClient.getQueryState([
        'expenses',
        variables.groupId,
      ]) !== undefined
      const categories = queryClient.getQueryData<Array<{ id: number; name: string }>>([
        'categories',
      ])
      // The group detail screen reads expenses off the `group` query, so the
      // optimistic row has to land there too or it never appears until refetch.
      const groupKey = ['group', variables.groupId]
      const previousGroup = queryClient.getQueryData<any>(groupKey)
      const hadGroupQuery =
        queryClient.getQueryState(groupKey) !== undefined

      const optimisticExpense: ExpenseResponse = {
        id: -Date.now(),
        title: variables.data.title,
        amount: variables.data.amount,
        split_type: variables.data.split_type,
        category_id: variables.data.category_id,
        category_name:
          categories?.find((category) => category.id === variables.data.category_id)?.name ?? '',
      }

      if (previousGroup?.expenses) {
        queryClient.setQueryData(groupKey, {
          ...previousGroup,
          expenses: [optimisticExpense, ...previousGroup.expenses],
        })
      }

      return { previousExpenses, hadExpensesQuery, previousGroup, hadGroupQuery }
    },
    onError: (_error, variables, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(['expenses', variables.groupId], context.previousExpenses)
      } else if (context?.hadExpensesQuery) {
        queryClient.removeQueries({ queryKey: ['expenses', variables.groupId], exact: true })
      }

      if (context?.previousGroup !== undefined) {
        queryClient.setQueryData(['group', variables.groupId], context.previousGroup)
      } else if (context?.hadGroupQuery) {
        queryClient.removeQueries({ queryKey: ['group', variables.groupId], exact: true })
      }
    },
    onSettled: async (_data, _error, variables) => {
      // Reconcile the optimistic row with server-generated fields and derived totals.
      await queryClient.invalidateQueries({
        queryKey: ['group', variables.groupId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['expenses', variables.groupId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['group-balance', variables.groupId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['user-expenses'],
      })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Expense updated',
    mutationFn: updateExpenseApi,
    onMutate: async () => {
      // Every view that shows an expense or a derived balance has to be
      // reconciled once the server has recalculated the shares.
      await queryClient.cancelQueries({ queryKey: ['group'] })
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      await queryClient.cancelQueries({ queryKey: ['group-balance'] })
      await queryClient.cancelQueries({ queryKey: ['user-expenses'] })
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['group-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['user-expenses'] }),
      ])
    },
  })
}

interface CreateCategoryParams {
  name: string
  // Theme key stored on Category.icon, e.g. 'food'. Optional so older callers
  // keep working; the backend defaults it to null and the UI infers from the name.
  icon?: string
}

const createCategoryApi = async ({ name, icon }: CreateCategoryParams) => {
  const response = await api.post('/expenses/category/create/', { name, icon })
  return response.data.data
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Category created',
    mutationFn: createCategoryApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

const deleteExpenseApi = async (expenseId: string | number) => {
  const response = await api.delete(`/expenses/${expenseId}/delete/`)
  return response.data
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Expense deleted',
    mutationFn: deleteExpenseApi,
    // Drop the row immediately so the list reacts immediately; every cache is
    // invalidated on settle anyway because balances are recalculated.
    onSuccess: async (_data, expenseId) => {
      queryClient.setQueriesData<{ expenses?: Array<{ id?: string | number }> }>(
        { queryKey: ['group'] },
        (old) =>
          old && Array.isArray(old.expenses)
            ? {
                ...old,
                expenses: old.expenses.filter(
                  (expense) => String(expense?.id) !== String(expenseId),
                ),
              }
            : old,
      )

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['user-expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['group'] }),
        queryClient.invalidateQueries({ queryKey: ['group-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['group-settlement'] }),
      ])
    },
  })
}