import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
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

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpenseApi,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', variables.groupId] })
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
      const optimisticExpense: ExpenseResponse = {
        id: -Date.now(),
        title: variables.data.title,
        amount: variables.data.amount,
        split_type: variables.data.split_type,
        category_id: variables.data.category_id,
        category_name:
          categories?.find((category) => category.id === variables.data.category_id)?.name ?? '',
      }

      if (previousExpenses) {
        queryClient.setQueryData<ExpenseResponse[]>(
          ['expenses', variables.groupId],
          [...previousExpenses, optimisticExpense],
        )
      }

      return { previousExpenses, hadExpensesQuery }
    },
    onError: (_error, variables, context) => {
      if (context?.previousExpenses !== undefined) {
        queryClient.setQueryData(['expenses', variables.groupId], context.previousExpenses)
      } else if (context?.hadExpensesQuery) {
        queryClient.removeQueries({ queryKey: ['expenses', variables.groupId], exact: true })
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

interface CreateCategoryParams {
  name: string
}

const createCategoryApi = async ({ name }: CreateCategoryParams) => {
  const response = await api.post('/expenses/category/create/', { name })
  return response.data.data
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategoryApi,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}