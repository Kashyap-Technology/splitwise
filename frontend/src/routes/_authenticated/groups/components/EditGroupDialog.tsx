import { useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Loader2, Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { compressImage } from '@/lib/compressImage'

const editGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50, 'Name cannot exceed 50 characters'),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional().or(z.literal('')),
  group_image: z.any().optional(),
})

type EditGroupValues = z.infer<typeof editGroupSchema>

interface EditGroupDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  group: {
    name: string
    description?: string | null
    group_image_url?: string | null
  }
  onSave: (formData: FormData) => void
  isPending?: boolean
}

export function EditGroupDialog({
  isOpen,
  onOpenChange,
  group,
  onSave,
  isPending = false,
}: EditGroupDialogProps) {
  const form = useForm<EditGroupValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
      group_image: undefined,
    },
  })

  const groupImage = useWatch({ control: form.control, name: 'group_image' })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: group?.name ?? '',
        description: group?.description ?? '',
        group_image: undefined,
      })
    }
  }, [group, isOpen, form])

  const previewUrl = useMemo(() => {
    if (groupImage instanceof File) {
      return URL.createObjectURL(groupImage)
    }
    return group?.group_image_url ?? null
  }, [groupImage, group?.group_image_url])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleClose = () => {
    form.reset({
      name: group?.name ?? '',
      description: group?.description ?? '',
      group_image: undefined,
    })
    onOpenChange(false)
  }

  const handleSubmit = async (data: EditGroupValues) => {
    const formData = new FormData()
    formData.append('name', data.name.trim())
    formData.append('description', data.description?.trim() ?? '')

    if (data.group_image instanceof File) {
      formData.append('group_image', await compressImage(data.group_image))
    }

    onSave(formData)
  }

  const getInitials = (name: string) =>
    (name || 'G')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : handleClose())}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-0 shadow-xl rounded-2xl">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Edit group</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  Update the group details and image.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 text-slate-500 hover:bg-slate-100"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-3 sm:w-40">
                <Controller
                  name="group_image"
                  control={form.control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <label
                      htmlFor="group-image-input"
                      className="group relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md transition hover:bg-slate-200"
                    >
                      {previewUrl ? (
                        <img src={previewUrl} alt="Group preview" className="h-full w-full object-cover" />
                      ) : (
                        <Avatar className="h-full w-full rounded-full">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                            {getInitials(group?.name ?? 'Group')}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                      </div>

                      <input
                        {...field}
                        id="group-image-input"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onChange(file)
                        }}
                      />
                    </label>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => form.setValue('group_image', undefined)}
                >
                  Remove image
                </Button>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Group name</label>
                  <Input
                    {...form.register('name')}
                    placeholder="Weekend trip"
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    {...form.register('description')}
                    rows={4}
                    placeholder="Add a short description for this group..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  {form.formState.errors.description && (
                    <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}