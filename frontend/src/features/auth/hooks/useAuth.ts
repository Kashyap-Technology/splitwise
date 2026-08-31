import { api } from '@/api/client'
import {useQuery} from '@tanstack/react-query'

export function useAuth(){
    const  {data:user,isLoading}=useQuery({
        queryKey:['me'],
        queryFn:async()=>{
            const res=await api.get('/users/me' )
            return res.data
        },
        retry:false,
        staleTime:1000*60*5
    })
    return{
        user:user??null,
        isAuthenticated:!!user,
        isLoading
    }
}