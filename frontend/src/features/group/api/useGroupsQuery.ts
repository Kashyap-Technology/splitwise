import {useQuery} from '@tanstack/react-query'
import { api } from '@/api/client'
import { GroupMemberResponse,GroupBalanceResponse,UserGroupResponse,GroupDetailResponse,GroupDetailData,GroupSettlementResponse,UserSettlementResponse } from '../types/group.types'



export function useGroupQuery() {
  return useQuery<UserGroupResponse[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/user/group/')
      return res.data.data ?? []
    },
  })
}

// Extract a single group client-side from the cached/fetched groups list

export function useGroupDetailQuery(groupId: string) {
  return useQuery<GroupDetailData, Error>({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const res = await api.get<GroupDetailResponse>(`/groups/${groupId}/detail/`)
      return res.data.data
    },
    enabled: !!groupId,
  })
}

// Fetch members for a specific group ID
export function useGroupMemberQuery(groupId: string) {
  return useQuery<GroupMemberResponse[]>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const res = await api.get(`/groups/${groupId}/members/`)
      return res.data.data ?? []
    },
    enabled: !!groupId,
  })
}

export function useGroupBalanceQuery(groupId:string){
  return useQuery<GroupBalanceResponse>({
    queryKey:['group-balance',groupId],
    queryFn:async()=>{
      const res=await api.get(`/expenses/group/${groupId}/balance/`)
      return res.data.data??[]
    }
  })
}

export function useGroupSettlementQuery(groupId:string){
  return useQuery<GroupSettlementResponse>({
    queryKey:['group-settlement',groupId],
    queryFn:async()=>{
      const res=await api.get(`/expenses/group/${groupId}/settlement/`)
      return res.data.data??[]
    }
  })
}

export function useUserSettlementQuery(){
  return useQuery<UserSettlementResponse>({
    queryKey:['user-settlements'],
    queryFn:async()=>{
      const res=await api.get('/settlements/my/settlements/')
      return res.data.data??{
        current_settlements: [],
        settlement_history: [],
        summary: {
          current_settlement_count: 0,
          history_count: 0,
          total_to_pay: '0',
          total_to_receive: '0',
        },
      }
    }
  })

}