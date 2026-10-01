import { useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Camera,
  Loader2,
  Check,
  X,
  ImageOff,
  AlertTriangle,
  Users,
  Receipt,
} from 'lucide-react'

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
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { compressImage } from '@/lib/compressImage'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const NAME_MAX = 50
const DESCRIPTION_MAX = 200

const editGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(NAME_MAX, `Name cannot exceed ${NAME_MAX} characters`),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `Description cannot exceed ${DESCRIPTION_MAX} characters`),
  group_image: z.any().optional(),
  // Set when the user explicitly clears the image. Kept out of the payload:
  // the backend distinguishes "absent" (leave it) from "null" (remove it), so
  // this has to be tracked separately from the file field itself.
  remove_image: z.boolean(),
  // Held in form state rather than component state so `reset()` clears it with
  // everything else, instead of needing a separate effect to wipe it on open.
  image_error: z.string().optional(),
})

type EditGroupValues = z.infer<typeof editGroupSchema>

interface EditGroupDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  group: {
    name: string
    description?: string | null
    group_image_url?: string | null
    member_count?: number
    expense_count?: number
  }
  onSave: (formData: FormData) => void
  isPending?: boolean
  error?: string | null
}

const getInitials = (name: string) =>
  (name || 'G')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export function EditGroupDialog({
  isOpen,
  onOpenChange,
  group,
  onSave,
  isPending = false,
  error = null,
}: EditGroupDialogProps) {
  const defaults = useMemo(
    () => ({
      name: group?.name ?? '',
      description: group?.description ?? '',
      group_image: undefined as File | undefined,
      remove_image: false,
      image_error: undefined,
    }),
    [group],
  )

  const form = useForm<EditGroupValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: defaults,
  })

  const groupImage = useWatch({ control: form.control, name: 'group_image' })
  const imageError = useWatch({ control: form.control, name: 'image_error' })
  const removeImage = useWatch({ control: form.control, name: 'remove_image' })
  const nameValue = useWatch({ control: form.control, name: 'name' }) ?? ''
  const descriptionValue = useWatch({ control: form.control, name: 'description' }) ?? ''

  // Re-seed whenever the dialog opens so a cancelled edit does not leak into
  // the next one.
  useEffect(() => {
    if (!isOpen) return
    // Reseeds every field, including image_error, so a cancelled or failed edit
    // never leaks into the next open.
    form.reset(defaults)
  }, [isOpen, defaults, form])

  const previewUrl = useMemo(() => {
    if (groupImage instanceof File) return URL.createObjectURL(groupImage)
    return null
  }, [groupImage])

  // Revoke the object URL when it is replaced or the dialog unmounts, otherwise
  // each picked image leaks a blob for the life of the document.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  // The existing image is a remote URL, so it must never be revoked.
  const shownImage = removeImage
    ? null
    : (previewUrl ?? group?.group_image_url ?? null)

  const isDirty =
    nameValue.trim() !== (group?.name ?? '') ||
    descriptionValue !== (group?.description ?? '') ||
    Boolean(groupImage) ||
    removeImage

  const handleClose = () => {
    if (isPending) return
    form.reset(defaults)
    onOpenChange(false)
  }

  const handleSubmit = async (data: EditGroupValues) => {
    const formData = new FormData()
    formData.append('name', data.name.trim())
    formData.append('description', data.description.trim())

    if (data.group_image instanceof File) {
      formData.append('group_image', await compressImage(data.group_image))
    } else if (data.remove_image) {
      // Explicit null removes the stored image. Sending nothing at all means
      // "leave it alone", which is why an empty field cannot express removal.
      formData.append('group_image', '')
    }

    onSave(formData)
  }

  const pickFile = (file: File | undefined, onChange: (file?: File) => void) => {
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      form.setValue('image_error', 'Use a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      form.setValue('image_error', 'Image must be under 5MB.')
      return
    }

    form.setValue('image_error', undefined)
    onChange(file)
    form.setValue('remove_image', false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : handleClose())}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-0 shadow-xl rounded-2xl">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Edit group
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  Update the name, description and image for this group.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 text-slate-500 hover:bg-slate-100 shrink-0"
                onClick={handleClose}
                disabled={isPending}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Controller
                name="group_image"
                control={form.control}
                render={({ field: { onChange, value, ...field } }) => (
                  <div className="flex flex-col items-center gap-3 sm:w-40">
                    <label
                      htmlFor="group-image-input"
                      className="group relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md transition hover:bg-slate-200 focus-within:ring-2 focus-within:ring-blue-500"
                    >
                      {shownImage ? (
                        <img
                          src={shownImage}
                          alt="Group preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Avatar className="h-full w-full rounded-full">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                            {getInitials(nameValue.trim())}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                      </div>

                      <input
                        {...field}
                        id="group-image-input"
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        className="sr-only"
                        onChange={(e) => {
                          // Reset first so picking the same file twice still
                          // fires a change event.
                          e.target.value = ''
                          pickFile(e.target.files?.[0], onChange)
                        }}
                      />
                    </label>

                    {/* Only offered when there is actually an image to remove:
                        either the stored one or a freshly picked one. */}
                    {(group?.group_image_url || value instanceof File) &&
                      !removeImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
                          onClick={() => {
                            onChange(undefined)
                            form.setValue('remove_image', true)
                            form.setValue('image_error', undefined)
                          }}
                        >
                          <ImageOff className="h-3.5 w-3.5" />
                          Remove image
                        </Button>
                      )}

                    {removeImage && (
                      <button
                        type="button"
                        onClick={() => form.setValue('remove_image', false)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Undo removal
                      </button>
                    )}
                  </div>
                )}
              />

              <div className="flex-1 w-full space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="group-name" className="text-sm font-medium text-slate-700">
                      Group name
                    </Label>
                    <span
                      className={`text-[11px] tabular-nums ${
                        nameValue.trim().length > NAME_MAX
                          ? 'text-red-500 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {nameValue.trim().length}/{NAME_MAX}
                    </span>
                  </div>
                  <Input
                    id="group-name"
                    {...form.register('name')}
                    placeholder="Weekend trip"
                    aria-invalid={Boolean(form.formState.errors.name)}
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="group-description"
                      className="text-sm font-medium text-slate-700"
                    >
                      Description
                    </Label>
                    <span
                      className={`text-[11px] tabular-nums ${
                        descriptionValue.length > DESCRIPTION_MAX
                          ? 'text-red-500 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {descriptionValue.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                  <textarea
                    id="group-description"
                    {...form.register('description')}
                    rows={4}
                    placeholder="Add a short description for this group..."
                    aria-invalid={Boolean(form.formState.errors.description)}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  {form.formState.errors.description && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                {(imageError || error) && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">
                      {imageError ?? error}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Context so it is obvious what is being edited. */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {group?.member_count ?? 0} member
                {group?.member_count === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                {group?.expense_count ?? 0} expense
                {group?.expense_count === 1 ? '' : 's'}
              </span>
              <span className="text-slate-400">
                Changes apply to everyone in this group.
              </span>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isDirty}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
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