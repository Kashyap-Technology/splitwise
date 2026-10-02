// src/features/auth/hooks/useLogoutMutation.ts
import { api } from '@/api/client'
import { useMutationWithToast } from '@/lib/useMutationWithToast';
import { useQueryClient } from "@tanstack/react-query";

async function logoutApi() {
  const response = await api.post('/users/logout/');
  return response.data;
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    success: 'Signed out',
    mutationFn: logoutApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      const previousUser = queryClient.getQueryData(['me']);
      queryClient.setQueryData(['me'], null);
      return { previousUser };
    },
    onSuccess: async () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
    onError: (error: any, _variables, context) => {
      queryClient.setQueryData(['me'], context?.previousUser);
      console.error('Logout failed:', error.response?.data || error.message);
    },
  });
}