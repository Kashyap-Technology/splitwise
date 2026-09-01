import { Controller, type Control, type FieldErrors } from 'react-hook-form'
import { ChevronsUpDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'

import type { CreateExpenseInput } from '@/features/expense/schemas/expenseSchema'

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
}: {
  label: string
  name: 'payers' | 'participants'
  control: Control<CreateExpenseInput>
  members?: GroupMember[]
  isLoadingMembers: boolean
  errors: FieldErrors<CreateExpenseInput>
  watchedAmount?: number
  mode: 'payers' | 'participants'
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selectedItems: Array<{ user_id: number; amount_paid?: string }> =
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
              : [...selectedItems, { user_id: memberIdNum, amount_paid: '0' }]

            const count = updatedPayers.length
            const share =
              count > 0 ? Number(((watchedAmount ?? 0) / count).toFixed(2)) : 0

            updatedPayers = updatedPayers.map((payer) => ({
              ...payer,
              amount_paid: String(share),
            }))

            field.onChange(updatedPayers)
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
