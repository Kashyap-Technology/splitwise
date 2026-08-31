import { useState, useMemo, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Search,
  Plus,
  X,
  ChevronRight,
  Camera,
  FolderKanban,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

import { groupSchema, type CreateGroupInputs } from '@/features/group/schemas/groupSchema'
import { useGroupMutation } from '@/features/group/api/useGroupMutation'
import { useGroupQuery } from '@/features/group/api/useGroupsQuery'

export const Route = createFileRoute('/_authenticated/groups/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: groups = [], isLoading, isError } = useGroupQuery()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { mutate, isPending: isSubmitting } = useGroupMutation()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateGroupInputs>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      description: '',
      group_image: undefined,
    },
  })

  const groupImage = useWatch({ control, name: 'group_image' })

  const previewUrl = useMemo(() => {
    if (groupImage instanceof File) {
      return URL.createObjectURL(groupImage)
    }
    return null
  }, [groupImage])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const onSubmit = (data: CreateGroupInputs) => {
    const formData = new FormData()
    formData.append('name', data.name)

    if (data.description) {
      formData.append('description', data.description)
    }

    if (data.group_image) {
      formData.append('group_image', data.group_image)
    }

    mutate(formData, {
      onSuccess: () => {
        setIsDialogOpen(false)
        reset()
      },
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <X className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">Failed to load groups</h3>
          <p className="text-sm text-muted-foreground">
            Something went wrong while loading your spaces. Please try again.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] bg-slate-50/50">
      {/* Top Header & Search/Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Groups Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Manage your shared spaces, track collective spending, and balance the books across all your circles.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="pl-9 bg-white border-slate-200/80 rounded-full text-sm h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) reset()
            }}
          >
            <DialogTrigger render={

              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-10 flex items-center gap-2 shadow-sm font-medium text-sm shrink-0">
                <Plus className="w-4 h-4" />
                <span>New Space</span>
              </Button>
            }/>

            <DialogContent className="sm:max-w-md bg-white rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create New Space</DialogTitle>
                <DialogDescription>
                  Set up a shared group for trips, households, or events.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                {/* Image Upload */}
                <Controller
                  name="group_image"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="relative group">
                        <Avatar className="h-20 w-20 border-2 border-dashed border-slate-300 transition-all group-hover:border-blue-500">
                          {previewUrl && <AvatarImage src={previewUrl} className="object-cover" />}
                          <AvatarFallback className="bg-slate-50 text-slate-400">
                            <Camera className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>

                        <label
                          htmlFor="group_image_input"
                          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer"
                        >
                          <Camera className="h-4 w-4 mb-0.5" />
                          <span className="text-[10px] font-medium">Upload</span>
                        </label>

                        {previewUrl && (
                          <button
                            type="button"
                            // onClick={() => setValue('group_image', undefined)}
                            className="absolute -top-1 -right-1 p-1 bg-destructive text-white rounded-full shadow-md hover:scale-110 transition-transform"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <input
                        {...field}
                        id="group_image_input"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        value=""
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onChange(file)
                        }}
                      />
                      <span className="text-xs text-slate-400">Optional group picture</span>
                      {errors.group_image && (
                        <p className="text-xs text-red-500">{errors.group_image.message as string}</p>
                      )}
                    </div>
                  )}
                />

                <div className="space-y-2">
                  <Label htmlFor="name">Group Name *</Label>
                  <Input id="name" placeholder="e.g. Summer House, Road Trip" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Short summary of shared expenses"
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <DialogFooter className="pt-2 gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset()
                      setIsDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {isSubmitting ? 'Creating...' : 'Create Group'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5 rounded-2xl space-y-4 border-slate-200/80">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <FolderKanban className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-800 text-base">No groups found</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchQuery
                    ? `No groups match "${searchQuery}". Try a different keyword.`
                    : 'You are not part of any spaces yet. Create one to get started!'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredGroups.map((group) => (
              <Link
                key={group.id}
                to="/groups/$groupId"
                params={{ groupId: group.id.toString() }}
                className="block group transition-all"
              >
                <Card className="rounded-2xl border-slate-200/80 bg-white hover:shadow-md hover:border-slate-300 transition-all h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-4 space-y-0">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 rounded-full border shrink-0">
                        {group.group_imagekey && (
                          <AvatarImage src={`/${group.group_imagekey}`} alt={group.name} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                          {getInitials(group.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="font-bold text-slate-900 text-base truncate">{group.name}</CardTitle>
                        <CardDescription className="text-xs text-slate-400 truncate mt-0.5">
                          {group.description || 'No description provided'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardFooter className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
                    <span>
                      Created by <strong className="text-slate-700 font-medium">{group.created_by.name}</strong>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}