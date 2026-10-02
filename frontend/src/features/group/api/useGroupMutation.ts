import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/api/client'
import { useMutationWithToast } from '@/lib/useMutationWithToast'
import { GroupCreateResponse, UserGroupResponse } from "../types/group.types";

async function groupCreateApi(formData: FormData) {
  const response = await api.post<GroupCreateResponse>('/groups/create/', formData)
  return response.data
}

async function groupUpdateApi(groupId: string | number, formData: FormData) {
  const response = await api.patch(`/groups/${groupId}/update/`, formData)
  return response.data
}

async function groupDeleteApi(groupId: string | number) {
  const response = await api.delete(`/groups/${groupId}/delete/`)
  return response.data
}

async function removeMemberApi(groupId: string | number, userId: string | number) {
  const response = await api.post(`/group/${groupId}/${userId}/remove/`)
  return response.data
}

export function useGroupMutation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Group created',
    mutationFn: groupCreateApi,
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ['groups'] })
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

      return { previousGroups }
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousGroups !== undefined) {
        queryClient.setQueryData(['groups'], context.previousGroups)
      }
      navigate({ to: '/groups' })
      // Check the browser console for this output to see the exact server failure
      console.error("Mutation failed details:", error.response?.data || error.message);
    },
    onSuccess: () => {
      navigate({ to: '/groups' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })
}

export function useGroupUpdateMutation(groupId: string | number) {
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Group updated',
    mutationFn: (formData: FormData) => groupUpdateApi(groupId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', String(groupId)] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    // Kept in the mutation state so the caller can render it. A rejected save
    // used to be logged to the console only, which left the user staring at a
    // dialog that appeared to do nothing.
    onError: (error: any) => {
      console.error('Group update failed:', error.response?.data || error.message)
    },
  })
}

export function useGroupDeleteMutation(groupId: string | number) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutationWithToast({
    success: 'Group deleted',
    mutationFn: () => groupDeleteApi(groupId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['groups'] })

      const previousGroups = queryClient.getQueryData<UserGroupResponse[]>(['groups'])

      if (previousGroups) {
        queryClient.setQueryData<UserGroupResponse[]>(
          ['groups'],
          previousGroups.filter((group) => String(group.id) !== String(groupId))
        )
      }

      return { previousGroups }
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousGroups !== undefined) {
        queryClient.setQueryData(['groups'], context.previousGroups)
      }
      console.error('Group delete failed:', error.response?.data || error.message)
    },
    onSuccess: () => {
      navigate({ to: '/groups' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.removeQueries({ queryKey: ['group', String(groupId)] })
    },
  })
}

export function useGroupRemoveMemberMutation(groupId: string | number) {
  const queryClient = useQueryClient()

  return useMutationWithToast({
    success: 'Member removed',
    mutationFn: (userId: string | number) => removeMemberApi(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', String(groupId)] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error: any) => {
      console.error('Group member removal failed:', error.response?.data || error.message)
    },
  })
}

export const useRemoveMemberMutation = useGroupRemoveMemberMutation