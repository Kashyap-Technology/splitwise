import {useQuery} from '@tanstack/react-query'
import { api } from '@/api/client'
import { GroupListResponse,GroupMemberResponse } from '../types/group.types'



export function useGroupQuery(){
    return useQuery<GroupListResponse[]>({
        queryKey:['groups'],
        queryFn:async()=>{
            const res=await api.get('/groups/')
            return res.data.data??[]
        }
    })
}

export function useGroupMemberQuery(){
    return useQuery<GroupMemberResponse[]>({
        queryKey:['group-members'],
        queryFn:async()=>{
            const res=await api.get('groups/5/members/')
            return res.data.data??[]
        }

    })

}
