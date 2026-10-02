import {api} from '@/api/client'
import { useMutationWithToast } from '@/lib/useMutationWithToast'
import { useQueryClient } from "@tanstack/react-query" 

async function updateUserApi(formData:FormData){
    const response=await api.patch('/users/update/',formData)
    return response.data
}
async function deleteUserApi(){
    const response=await api.delete('/users/delete/')
return response.data
}

export function useUserUpdateMutation(){
    const queryClient=useQueryClient()

    return useMutationWithToast({
        success: 'Profile updated',
        mutationFn:updateUserApi,
        onMutate: async (formData) => {
            await queryClient.cancelQueries({queryKey:['me']})
            const previousUser = queryClient.getQueryData(['me'])
            const currentUser = (previousUser as {data?: Record<string, unknown>} | undefined)?.data

            if (currentUser) {
                const optimisticUser = {...currentUser}
                for (const field of ['name', 'phone']) {
                    const value = formData.get(field)
                    if (typeof value === 'string' && value.length > 0) {
                        optimisticUser[field] = value
                    }
                }
                queryClient.setQueryData(['me'], {data: optimisticUser})
            }

            return {previousUser}
        },
        onError: (_error, _variables, context) => {
            if (context?.previousUser !== undefined) {
                queryClient.setQueryData(['me'], context.previousUser)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey:['me']})
        }
    })
}

export function useUserDeleteMutation() {
    const queryClient = useQueryClient()

    return useMutationWithToast({
        success: 'Account deleted',
        mutationFn: deleteUserApi,
        onMutate: async () => {
            // 1. Cancel outgoing fetch requests for the user query
            await queryClient.cancelQueries({ queryKey: ['me'] })

            // 2. Snapshot the current user state for potential rollback
            const previousUser = queryClient.getQueryData(['me'])

            // 3. Optimistically remove user data from cache
            queryClient.setQueryData(['me'], null)

            // 4. Pass snapshot to context
            return { previousUser }
        },
        onError: (_error, _variables, context) => {
            // Roll back to snapshot if server request fails
            if (context?.previousUser !== undefined) {
                queryClient.setQueryData(['me'], context.previousUser)
            }
        },
        onSettled: () => {
            // Ensure server state synchronization or cache cleanup
            queryClient.invalidateQueries({ queryKey: ['me'] })
        }
    })
}