import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { ExpenseCategoryResponse, ExpenseResponse, UserExpensesResponse } from '../types/expense.types'
import { useParams } from '@tanstack/react-router'


export function useExpenseCategoryQuery() {
    return useQuery<ExpenseCategoryResponse[]>({
        queryKey: ['categories'
        ],
        queryFn: async () => {
            const res = await api.get('/expenses/category/list/')
            return res.data.data ?? []
        }
    })
}

export function useExpenseQuery() {
    const { groupId } = useParams({ strict: false })
    return useQuery<ExpenseResponse[]>({
        queryKey: ['expenses', groupId],
        queryFn: async () => {
            const res = await api.get(`/expenses/${groupId}/expenses/`)

            return res.data.data ?? []
        }
    })
}

export function useUserExpenseQuery() {
    return useQuery<UserExpensesResponse[]>({
        queryKey: ['user-expenses'],
        queryFn: async () => {
            const res = await api.get('/expenses/user/expenses/')
            return res.data.data ?? []
        }
    })
}