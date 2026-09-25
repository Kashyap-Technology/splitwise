import { Controller, useForm, useWatch, type UseFormReturn } from 'react-hook-form'

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

export function ExpenseFormDialog({
  isOpen,
  onOpenChange,
  form,
  categories,
  isLoadingCategories,
  members,
  isLoadingMembers,
  watchedAmount,
  watchedSplitType,
  isPending,
  onSubmit,
  onCancel,
}: {
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
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form
  const payers = useWatch({ control, name: 'payers' })
  const equalPayerAmount = watchedAmount / Math.max(payers.length, 1)
  const roundedEqualPayerAmount = equalPayerAmount.toFixed(2)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new expense split across group members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
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
                Equal payment split
              </p>
              {payers.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Select the payers below to see each person&apos;s share.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {payers.map((payer, index) => {
                    const member = members?.find(
                      (candidate) => Number(candidate.id) === Number(payer.user_id),
                    )
                    const amount =
                      index === payers.length - 1
                        ? (watchedAmount - Number(roundedEqualPayerAmount) * index).toFixed(2)
                        : roundedEqualPayerAmount

                    return (
                      <div
                        key={payer.user_id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                      >
                        <span className="font-medium text-slate-700">
                          {member?.name || payer.user_id}
                        </span>
                        <span className="font-semibold text-slate-900">${amount}</span>
                      </div>
                    )
                  })}
                </div>
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
            watchedAmount={watchedAmount}
            splitType={watchedSplitType}
            mode="payers"
          />

          <MemberPicker
            label="Split Between (Participants)"
            name="participants"
            control={control}
            members={members}
            isLoadingMembers={isLoadingMembers}
            errors={errors}
            watchedAmount={watchedAmount}
            splitType={watchedSplitType}
            mode="participants"
          />

          <DialogFooter className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
