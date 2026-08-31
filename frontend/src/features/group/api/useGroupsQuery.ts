import {useQuery} from '@tanstack/react-query'
import { api } from '@/api/client'
import { GroupListResponse } from '../types/group.types'



export function useGroupQuery(){
    return useQuery<GroupListResponse[]>({
        queryKey:['groups'],
        queryFn:async()=>{
            const res=await api.get('/groups/')
            return res.data.data??[]
        }
    })
}