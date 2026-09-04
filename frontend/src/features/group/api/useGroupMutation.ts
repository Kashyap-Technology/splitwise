import { useQueryClient,useMutation } from "@tanstack/react-query";
import {useNavigate} from '@tanstack/react-router'
import {api} from '@/api/client'
import { GroupCreateResponse, UserGroupResponse } from "../types/group.types";

async function groupCreateApi(formData:FormData){
    const response=await api.post<GroupCreateResponse>('/groups/create/',formData)
return response.data
}

async function groupUpdateApi(groupId: string | number, formData: FormData) {
  const response = await api.patch(`/groups/${groupId}/update/`, formData)
  return response.data
}

export function useGroupMutation(){
    const navigate=useNavigate()
    const queryClient=useQueryClient()

    return useMutation({
        mutationFn:groupCreateApi,
        onMutate: async (formData) => {
            await queryClient.cancelQueries({queryKey:['groups']})
            const previousGroups = queryClient.getQueryData<UserGroupResponse[]>(['groups'])
            const optimisticGroup: UserGroupResponse = {
                id: -Date.now(),
                name: String(formData.get('name') ?? 'New group'),
                description: String(formData.get('description') ?? ''),
                group_image_url: null,
            }

            if (previousGroups) {
                queryClient.setQueryData(['groups'], [...previousGroups, optimisticGroup])
            }

            return {previousGroups}
        },
        onError: (error: any, _variables, context) => {
            if (context?.previousGroups !== undefined) {
                queryClient.setQueryData(['groups'], context.previousGroups)
            }
            navigate({to:'/groups'})
            // Check the browser console for this output to see the exact server failure
            console.error("Mutation failed details:", error.response?.data || error.message);
        },
        onSuccess:()=>{
            navigate({to:'/groups'})
        },
        onSettled:()=>{
            queryClient.invalidateQueries({queryKey:['groups']})
        }
    })
}

export function useGroupUpdateMutation(groupId: string | number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => groupUpdateApi(groupId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', String(groupId)] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error: any) => {
      console.error('Group update failed:', error.response?.data || error.message)
    },
  })
}