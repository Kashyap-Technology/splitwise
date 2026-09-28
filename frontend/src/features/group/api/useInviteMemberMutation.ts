import { useMutation, useQueryClient } from '@tanstack/react-query'
import {api} from "@/api/client"

interface InviteMemberPayload {
  groupId: number | string
  userId: number
}

export function useInviteMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, userId }: InviteMemberPayload) => {
      const response = await api.post(`/groups/${groupId}/invite/`, {
        receiver_id: userId,
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      // Invalidate members query to update the UI list automatically
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] })
    },
  })
}