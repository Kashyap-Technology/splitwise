import {useQueryClient,useMutation,} from '@tanstack/react-query'
import {api} from '@/api/client'
import {SettlementCreateResponse,SettlementCreate} from '../types/settlement.types'

async function settlementCreateApi(groupId:number,data:SettlementCreate){
    const response=await api.post<SettlementCreateResponse>(`/settlements/${groupId}/create/`,data)
    return response.data
}

export function useSettlementCreateMutation(groupId:number){

    const queryClient=useQueryClient()

return useMutation({
    mutationFn:(data:SettlementCreate)=>settlementCreateApi(groupId,data),
    onSuccess:()=>{
    queryClient.invalidateQueries({queryKey:['group-settlement',groupId]})
    queryClient.invalidateQueries({queryKey:['user-settlements']})
    queryClient.invalidateQueries({queryKey:['group-balance',groupId]})
}

})
}

