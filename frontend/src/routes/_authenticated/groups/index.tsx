import { useState, useMemo, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Search,
  Plus,
  X,
  Camera,
  FolderKanban,
  Trash2,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { compressImage } from '@/lib/compressImage'
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

import { useAuth } from '@/features/auth/hooks/useAuth'
import { groupSchema, type CreateGroupInputs } from '@/features/group/schemas/groupSchema'
import { useGroupMutation } from '@/features/group/api/useGroupMutation'
import { useGroupQuery } from '@/features/group/api/useGroupsQuery'

export const Route = createFileRoute('/_authenticated/groups/')({
  component: RouteComponent,
})

// Extended helper type to match design properties
type GroupItem = {
  id: string | number
  name: string
  description?: string
  group_image_url?: string
  member_count?: number
  updated_at?: string
  total_expenses?: number
  your_balance?: number // positive = owed to user, negative = user owes, 0 = settled
}

export function RouteComponent() {
  const { user: me } = useAuth()
  const { data: rawGroups = [], isLoading, isError } = useGroupQuery()
  const groups = rawGroups as GroupItem[]

  // "Settled Up" only when no group has the user in the red.
  const isUserSettledUp = !groups.some(
    (group) => (group.your_balance ?? 0) < -0.005,
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [topSearchQuery, setTopSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { mutate, isPending: isSubmitting } = useGroupMutation()

  const {
    control,
    register,
    handleSubmit,
    reset,
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

  const onSubmit = async (data: CreateGroupInputs) => {
    const formData = new FormData()
    formData.append('name', data.name)

    if (data.description) {
      formData.append('description', data.description)
    }

    if (data.group_image) {
      formData.append('group_image', await compressImage(data.group_image))
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

  // Accent backdrop circle colors for the top-right card corner
  const cardAccents = [
    'bg-emerald-100/60 text-emerald-900',
    'bg-indigo-100/60 text-indigo-900',
    'bg-purple-100/60 text-purple-900',
    'bg-amber-100/60 text-amber-900',
  ]

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
    <div className="min-h-screen bg-[#F4F5F9] text-slate-800 p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Top Navbar Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="relative w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={topSearchQuery}
            onChange={(e) => setTopSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="pl-9 bg-transparent border-none text-slate-600 placeholder:text-slate-400 shadow-none focus-visible:ring-0 text-sm h-9"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-200/50">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-[#F4F5F9]" />
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {me?.name || 'Guest User'}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {isUserSettledUp ? 'Settled Up' : 'Has dues'}
              </p>
            </div>
            <Avatar className="h-10 w-10 border border-white shadow-sm">
              <AvatarImage src={me?.profile_image_url || undefined} alt={me?.name || 'You'} />
              <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                {getInitials(me?.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Main Page Title & Actions Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-block relative">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 relative z-10">
              Groups Overview
            </h1>
            <span className="absolute left-0 bottom-1 w-full h-3 bg-orange-200/60 rounded-full z-0" />
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
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
              className="pl-9 bg-[#E9ECF3]/80 border-none rounded-2xl text-slate-700 placeholder:text-slate-400 text-sm h-12 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
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
              <Button className="bg-[#0038FF] hover:bg-blue-700 text-white rounded-full px-6 h-12 flex items-center gap-2 shadow-md shadow-blue-500/20 font-semibold text-sm shrink-0">
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>New Space</span>
              </Button>
            }/>

            <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create New Space</DialogTitle>
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
                  <Input id="name" placeholder="e.g. Summer House, Road Trip" {...register('name')} className="rounded-xl" />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Short summary of shared expenses"
                    {...register('description')}
                    className="rounded-xl"
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <DialogFooter className="pt-2 gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      reset()
                      setIsDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-[#0038FF] hover:bg-blue-700 text-white rounded-xl">
                    {isSubmitting ? 'Creating...' : 'Create Group'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Grid Content */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 rounded-[28px] space-y-4 border-none shadow-sm bg-white">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="p-16 text-center rounded-[32px] border-dashed border-2 border-slate-200 bg-white/50 shadow-none">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <FolderKanban className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">No groups found</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchQuery
                    ? `No groups match "${searchQuery}". Try a different keyword.`
                    : 'You are not part of any spaces yet. Create one to get started!'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, index) => {
              const accentClass = cardAccents[index % cardAccents.length]
              const userBalance = group.your_balance ?? 0
              const totalSpend = group.total_expenses?? 0
              const membersCount = group.member_count ?? 1

              return (
                <Link
                  key={group.id}
                  to="/groups/$groupId"
                  params={{ groupId: group.id.toString() }}
                  className="block group transition-all"
                >
                  <Card className="relative overflow-hidden rounded-[28px] border-none bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between">
                    {/* Top Right Curved Colored Accent Backdrop */}
                    <div
                      className={`absolute -top-12 -right-12 w-44 h-44 rounded-full ${accentClass.split(' ')[0]} transition-transform duration-300 group-hover:scale-105`}
                    />

                    {/* Member Count Pill */}
                    <div className="absolute top-5 right-5 z-10 flex items-center gap-1.5 px-3 py-1 bg-white/70 backdrop-blur-md rounded-full text-xs font-semibold text-slate-700 shadow-2xs">
                      <Users className="w-5.5 h-5.5 text-slate-600" />
                      <span className='text-lg'>{membersCount}</span>
                    </div>

                    <CardHeader className="p-0 space-y-0 relative z-10">
                      {/* Avatar Icon */}
                      <Avatar className="h-28 w-28 rounded-2xl border border-slate-100 shadow-2xs shrink-0 mb-4 bg-slate-50">
                        {group.group_image_url && (
                          <AvatarImage src={group.group_image_url} alt={group.name} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-[#EAEFFD] text-[#0038FF] font-bold text-lg rounded-2xl">
                          {getInitials(group.name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Title & Timestamp */}
                      <div className="space-y-1">
                        <CardTitle className="font-bold text-slate-900 text-2xl tracking-tight line-clamp-1">
                          {group.name}
                        </CardTitle>
                        <CardDescription className=" font-medium text-slate-400">
                          {group.updated_at ? `Updated ${group.updated_at}` : 'Updated recently'}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    {/* Bottom Metrics Section */}
                    <div className="mt-8 pt-4 border-t border-slate-100 flex items-end justify-between relative z-10">
                      <div>
                        <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          TOTAL SPEND
                        </span>
                        <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                          ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-right">
                        {userBalance < 0 ? (
                          <>
                            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              YOU OWE
                            </span>
                            <div className="flex items-center justify-end gap-0.5 text-orange-600 font-extrabold text-lg tracking-tight">
                              <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                              <span>${Math.abs(userBalance).toFixed(2)}</span>
                            </div>
                          </>
                        ) : userBalance > 0 ? (
                          <>
                            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              YOU ARE OWED
                            </span>
                            <div className="flex items-center justify-end gap-0.5 text-emerald-500 font-extrabold text-lg tracking-tight">
                              <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
                              <span>${userBalance.toFixed(2)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                              BALANCE
                            </span>
                            <span className="text-lg font-bold text-slate-400">
                              Settled
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}