import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {api} from '@/api/client'

export interface SearchedUser {
  id: number
  email: string
  name: string
  phone?: string | null
  profile_imagekey?: string | null
  profile_image_url?: string | null
}

export function useUserSearchQuery(searchQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return useQuery<SearchedUser[]>({
    queryKey: ['users-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return []
      
      const response = await api.get('/users/search/', {
        params: { q: debouncedQuery },
      })
      
      // Django api_success wrapper returns data inside response.data.data
      return response.data.data ?? []
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  })
}