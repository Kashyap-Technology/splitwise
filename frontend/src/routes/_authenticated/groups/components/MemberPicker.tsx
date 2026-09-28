import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { ChevronsUpDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'

import type { CreateExpenseInput, SplitType } from '@/features/expense/schemas/expenseSchema'

import type { GroupMember } from './types'

export function MemberPicker({
  label,
  name,
  control,
  members,
  isLoadingMembers,
  errors,
  watchedAmount,
  mode,
  splitType,
}: {
  label: string
  name: 'payers' | 'participants'
  control: Control<CreateExpenseInput>
  members?: GroupMember[]
  isLoadingMembers: boolean
  errors: FieldErrors<CreateExpenseInput>
  watchedAmount?: number
  mode: 'payers' | 'participants'
  splitType?: SplitType
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selectedItems: Array<{
            user_id: number
            amount_paid?: string
            amount_to_pay?: string
            percentage?: string
          }> =
            field.value || []
          const selectedIds = selectedItems.map((item) => Number(item.user_id))

          const toggleItem = (memberIdNum: number) => {
            const exists = selectedItems.some(
              (item) => Number(item.user_id) === memberIdNum
            )

            if (mode === 'participants') {
              const updated = exists
                ? selectedItems.filter(
                    (item) => Number(item.user_id) !== memberIdNum
                  )
                : [...selectedItems, { user_id: memberIdNum }]

              field.onChange(updated)
              return
            }

            let updatedPayers = exists
              ? selectedItems.filter((item) => Number(item.user_id) !== memberIdNum)
              : [...selectedItems, { user_id: memberIdNum, amount_paid: '' }]

            field.onChange(updatedPayers)
          }

          const updateAllocation = (userId: number, value: string) => {
            field.onChange(selectedItems.map((item) =>
              item.user_id === userId
                ? mode === 'payers'
                  ? { ...item, amount_paid: value }
                  : splitType === 'percentage'
                    ? { ...item, percentage: value }
                    : { ...item, amount_to_pay: value }
                : item
            ))
          }

          return (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-between h-auto min-h-10 px-3 py-2 font-normal bg-white hover:bg-white"
                    disabled={isLoadingMembers}
                  >
                    <div className="flex flex-wrap gap-1 items-center">
                      {selectedIds.length === 0 ? (
                        <span className="text-slate-400">
                          {isLoadingMembers
                            ? 'Loading members...'
                            : mode === 'payers'
                              ? 'Select who paid'
                              : 'Select participants'}
                        </span>
                      ) : (
                        selectedIds.map((id) => {
                          const member = members?.find((item) => Number(item.id) === id)
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="rounded-md"
                            >
                              {member?.name || id}
                            </Badge>
                          )
                        })
                      )}
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 opacity-50 ml-2" />
                  </Button>
                }
              />

              <PopoverContent
                className="w-[--popover-trigger-width] p-2 bg-white"
                align="start"
              >
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {members?.map((member) => {
                    const memberIdNum = Number(member.id)
                    const isChecked = selectedIds.includes(memberIdNum)

                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleItem(memberIdNum)}
                        className="flex items-center gap-2.5 p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleItem(memberIdNum)}
                        />
                        <span className="font-medium text-slate-700">
                          {member.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {selectedItems.length > 0 && ((mode === 'payers' && splitType !== 'equal') || splitType === 'exact' || splitType === 'percentage') && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      {mode === 'payers' ? 'Amount paid by each' : splitType === 'percentage' ? 'Percentage for each' : 'Amount owed by each'}
                    </p>
                    {selectedItems.map((item) => {
                      const member = members?.find((candidate) => Number(candidate.id) === item.user_id)
                      const value = mode === 'payers' ? item.amount_paid : splitType === 'percentage' ? item.percentage : item.amount_to_pay
                      const calculatedAmount =
                        mode === 'participants' && splitType === 'percentage'
                          ? (Number(watchedAmount || 0) * Number(item.percentage || 0)) / 100
                          : null
                      return (
                        <div key={item.user_id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{member?.name || item.user_id}</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={value ?? ''}
                            onChange={(event) => updateAllocation(item.user_id, event.target.value)}
                            className="h-8 w-24 text-right text-xs"
                            placeholder="0.00"
                          />
                          <span className="w-4 text-xs text-slate-400">{mode === 'participants' && splitType === 'percentage' ? '%' : '$'}</span>
                          {calculatedAmount !== null && (
                            <span className="w-20 text-right text-xs text-slate-500">
                              ${calculatedAmount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )
        }}
      />

      {errors[name] && (
        <p className="text-xs text-red-500">
          {errors[name]?.message || (errors[name] as any)?.root?.message}
        </p>
      )}
    </div>
  )
}
