import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { CreateExpenseInput } from '../schemas/expenseSchema'

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
    onSuccess: async (_data, variables) => {
      // Invalidate the group details query so fresh expenses and balances are fetched
      await queryClient.invalidateQueries({
        queryKey: ['group', variables.groupId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['expenses', variables.groupId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['group-balance', variables.groupId],
      })
    },
  })
}