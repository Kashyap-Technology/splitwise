import { api } from '@/api/client'
import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me/')
      return res.data
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const userData = response?.data ?? null

  return {
    user: userData,
    isAuthenticated: !!userData && !error,
    isLoading,
  }
}