import {useQuery} from '@tanstack/react-query'
import { api } from '@/api/client'
import { GroupListResponse,GroupMemberResponse,GroupBalanceResponse,UserGroupResponse } from '../types/group.types'



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
  return useQuery<UserGroupResponse[], Error, UserGroupResponse | undefined>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/user/group/')
      return res.data.data ?? []
    },
    select: (groups) => groups.find((g) => String(g.id) === String(groupId)),
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