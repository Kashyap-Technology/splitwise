import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'

export function useAcceptInviteMutation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post(`/groups/${token}/invitation/accept/`)
      return response.data
    },
  })
}
