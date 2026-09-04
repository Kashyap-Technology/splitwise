import {api} from '@/api/client'
import {useMutation,useQueryClient} from '@tanstack/react-query' 

async function updateUserApi(formData:FormData){
    const response=await api.patch('/users/update/',formData)
    return response.data
}

export function useUserUpdateMutation(){
    const queryClient=useQueryClient()

    return useMutation({
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