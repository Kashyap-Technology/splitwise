import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import {
  SettlementCreate,
  SettlementCreateResponse,
} from '../types/settlement.types'

async function settlementCreateApi(groupId: number, data: SettlementCreate) {
  const response = await api.post<SettlementCreateResponse>(
    `/settlements/${groupId}/create/`,
    data,
  )
  return response.data
}

export function useSettlementCreateMutation(groupId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SettlementCreate) => settlementCreateApi(groupId, data),
    onSuccess: () => {
      // A settlement changes every derived balance, and the group detail query
      // is what the group page actually renders from.
      queryClient.invalidateQueries({ queryKey: ['group-settlement', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group-balance', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['user-settlements'] })
    },
  })
}