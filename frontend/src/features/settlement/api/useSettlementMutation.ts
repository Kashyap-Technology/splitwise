import { useQueryClient } from "@tanstack/react-query"
import { api } from '@/api/client'
import { useMutationWithToast } from '@/lib/useMutationWithToast'
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

  return useMutationWithToast({
    success: 'Settlement recorded',
    mutationFn: (data: SettlementCreate) => settlementCreateApi(groupId, data),
    onSuccess: () => {
      // A settlement changes every derived balance in the app, and any of these
      // caches holding a pre-settlement figure is what made a paid-up group keep
      // showing "You owe $200" after a successful payment.
      //
      // The ids are stringified because every query in useGroupsQuery.ts takes a
      // route param and keys itself with the string form. TanStack hashes keys
      // structurally, so ['group', 3] and ['group', '3'] are different caches
      // and invalidating one leaves the other untouched -- which is why settling
      // up appeared to do nothing until the page was reloaded. useGroupMutation
      // already coerces with String() for the same reason.
      const key = String(groupId)
      queryClient.invalidateQueries({ queryKey: ['group', key] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['user-settlements'] })
      // Balances also live on the dashboard and group list, keyed without an id.
      queryClient.invalidateQueries({ queryKey: ['group-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['group-balance'] })
    },
  })
}