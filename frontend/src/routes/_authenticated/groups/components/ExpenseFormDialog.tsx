import { useMemo } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { PersonAvatar } from '@/components/PersonAvatar'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { CreateExpenseInput } from '@/features/expense/schemas/expenseSchema'

import { MemberPicker } from './MemberPicker'
import type { ExpenseCategory, GroupMember } from './types'

export function ExpenseFormDialog(props: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  form: UseFormReturn<CreateExpenseInput>
  categories?: ExpenseCategory[]
  isLoadingCategories: boolean
  members?: GroupMember[]
  isLoadingMembers: boolean
  watchedAmount: number
  watchedSplitType: CreateExpenseInput['split_type']
  isPending: boolean
  onSubmit: () => void
  onCancel: () => void
  mode?: 'create' | 'edit'
}) {
  const { isOpen, onOpenChange, mode = 'create' } = props
  const isEdit = mode === 'edit'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* `p-0` + flex column so the header and footer stay pinned while only the
          form body scrolls. The popup itself is height-capped by DialogContent,
          which is what stopped the top of this tall form from being pushed off
          screen. */}
      <DialogContent className="flex flex-col overflow-hidden bg-white p-0 sm:max-w-md rounded-2xl">
        <DialogHeader className="shrink-0 gap-1.5 p-4 pb-3">
          <DialogTitle className="pr-8">{isEdit ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this expense. Shares will be recalculated for everyone.'
              : 'Record a new expense split across group members.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={props.onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pt-2">
            <ExpenseFormFields {...props} />
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t bg-slate-50 p-4">
            <Button
              type="button"
              variant="outline"
              onClick={props.onCancel}
              disabled={props.isPending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={props.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white sm:flex-none"
            >
              {props.isPending
                ? isEdit
                  ? 'Saving...'
                  : 'Adding...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// The form body without the dialog chrome, so it can be embedded in a larger
// dialog that needs extra controls above it (for example picking a group before
// splitting an expense on the global /expenses page).
export function ExpenseFormFields({
  form,
  categories,
  isLoadingCategories,
  members,
  isLoadingMembers,
  watchedAmount,
  watchedSplitType,
}: {
  form: UseFormReturn<CreateExpenseInput>
  categories?: ExpenseCategory[]
  isLoadingCategories: boolean
  members?: GroupMember[]
  isLoadingMembers: boolean
  watchedAmount: number
  watchedSplitType: CreateExpenseInput['split_type']
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form
  const participants = useWatch({ control, name: 'participants' })

  // Must mirror the backend's equal split: floor each share to whole cents, then
  // hand the leftover cents out one each. Showing a rounded-up preview that the
  // server does not store makes the dialog disagree with the saved expense.
  const equalShares = useMemo(() => {
    const count = participants.length
    if (!count || !watchedAmount) return []

    const totalCents = Math.round(watchedAmount * 100)
    const base = Math.floor(totalCents / count)
    const extra = totalCents - base * count

    return Array.from(
      { length: count },
      (_, index) => (base + (index < extra ? 1 : 0)) / 100
    )
  }, [participants.length, watchedAmount])

  return (
    <>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Dinner, Taxi, Groceries"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Split Type</Label>
            <Controller
              control={control}
              name="split_type"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
                  {[
                    { label: 'Equal', value: 'equal' },
                    { label: 'Exact', value: 'exact' },
                    { label: 'Percentage', value: 'percentage' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => field.onChange(item.value)}
                      className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                        field.value === item.value
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.split_type && (
              <p className="text-xs text-red-500">{errors.split_type.message}</p>
            )}
          </div>

          {watchedSplitType === 'equal' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Participant shares (split equally)
              </p>
              {participants.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Select participants below to see each person&apos;s share.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {participants.map((participant, index) => {
                    const member = members?.find(
                      (candidate) => Number(candidate.id) === Number(participant.user_id),
                    )

                    return (
                      <div
                        key={participant.user_id}
                        className="flex items-center gap-2.5 justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <PersonAvatar
                            name={member?.name ?? String(participant.user_id)}
                            src={member?.profile_image_url}
                            size="xs"
                            tone="blue"
                            className="border-0"
                          />
                          <span className="font-medium text-slate-700 truncate">
                            {member?.name || participant.user_id}
                          </span>
                        </span>
                        <span className="font-semibold text-slate-900 shrink-0 tabular-nums">
                          ${equalShares[index]?.toFixed(2) ?? '0.00'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {watchedSplitType !== 'equal' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {watchedSplitType === 'exact'
                  ? 'Owed amount per participant'
                  : 'Share percentage per participant'}
              </p>
              {participants.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Select participants below to set values.
                </p>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {participants.map((participant) => {
                      const member = members?.find(
                        (candidate) =>
                          Number(candidate.id) === Number(participant.user_id),
                      )
                      // Percentage values feed the backend's share_of_total,
                      // so show the dollar figure each percentage works out to.
                      const owed =
                        watchedSplitType === 'exact'
                          ? Number(participant.value ?? 0)
                          : (watchedAmount * Number(participant.value ?? 0)) / 100

                      return (
                        <div
                          key={participant.user_id}
                          className="flex items-center gap-2.5 justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <PersonAvatar
                              name={member?.name ?? String(participant.user_id)}
                              src={member?.profile_image_url}
                              size="xs"
                              tone="blue"
                              className="border-0"
                            />
                            <span className="font-medium text-slate-700 truncate">
                              {member?.name || participant.user_id}
                            </span>
                          </span>
                          <span className="font-semibold text-slate-900 shrink-0 tabular-nums">
                            {Number.isFinite(owed) ? owed.toFixed(2) : '0.00'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {watchedSplitType === 'exact'
                      ? 'Adjust the amounts owed in the "Split Between" picker below.'
                      : 'Adjust the percentages in the "Split Between" picker below.'}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => {
                const selectedCategory = categories?.find(
                  (cat) => String(cat.id) === String(field.value)
                )

                return (
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? String(field.value) : ''}
                    disabled={isLoadingCategories}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Category">
                        {selectedCategory
                          ? selectedCategory.name
                          : isLoadingCategories
                            ? 'Loading Categories...'
                            : 'Select Category'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }}
            />
            {errors.category_id && (
              <p className="text-xs text-red-500">{errors.category_id.message}</p>
            )}
          </div>

          <MemberPicker
            label="Paid By (Payers)"
            name="payers"
            control={control}
            members={members}
            isLoadingMembers={isLoadingMembers}
            errors={errors}
            splitType={watchedSplitType}
            amount={watchedAmount}
            mode="payers"
          />

          <MemberPicker
            label="Split Between (Participants)"
            name="participants"
            control={control}
            members={members}
            isLoadingMembers={isLoadingMembers}
            errors={errors}
            splitType={watchedSplitType}
            amount={watchedAmount}
            mode="participants"
          />
    </>
  )
}
