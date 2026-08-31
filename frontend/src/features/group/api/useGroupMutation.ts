import { useQueryClient,useMutation, QueryClient } from "@tanstack/react-query";
import {useNavigate} from '@tanstack/react-router'
import { LoginFormValues } from "../../auth/schemas/loginSchema";
import {api} from '@/api/client'
import { GroupCreate, GroupCreateResponse } from "../types/group.types";

async function groupCreateApi(formData:FormData){
    const response=await api.post<GroupCreateResponse>('/groups/create/',formData)
return response.data
}

export function useGroupMutation(){
    const navigate=useNavigate()
    const queryClient=useQueryClient()

    return useMutation({
        mutationFn:groupCreateApi,
        onSuccess:(data)=>{
           queryClient.invalidateQueries({queryKey:['groups']}) 
            navigate({to:'/groups'})

        },
        onError: (error: any) => {
            // Check the browser console for this output to see the exact server failure
            console.error("Mutation failed details:", error.response?.data || error.message);
        }
    })
}