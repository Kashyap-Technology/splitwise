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
  mode,
  splitType,
  amount,
}: {
  label: string
  name: 'payers' | 'participants'
  control: Control<CreateExpenseInput>
  members?: GroupMember[]
  isLoadingMembers: boolean
  errors: FieldErrors<CreateExpenseInput>
  mode: 'payers' | 'participants'
  splitType?: SplitType
  amount: number
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
            value?: number | null
          }> = field.value || []
          const selectedIds = selectedItems.map((item) => Number(item.user_id))

          // Mirrors the backend: floor each share to whole cents, then hand the leftover
          // cents out one each. This guarantees the parts sum back to `total`
          // exactly and never produce a negative share.
          const splitEvenly = (total: number, count: number) => {
            if (count <= 0) return []

            const totalCents = Math.round(total * 100)
            const base = Math.floor(totalCents / count)
            const extra = totalCents - base * count

            return Array.from(
              { length: count },
              (_, i) => (base + (i < extra ? 1 : 0)) / 100
            )
          }

          const toggleItem = (memberIdNum: number) => {
            const exists = selectedItems.some(
              (item) => Number(item.user_id) === memberIdNum
            )

            if (exists) {
              field.onChange(
                selectedItems.filter((item) => Number(item.user_id) !== memberIdNum)
              )
              return
            }

            const next = [...selectedItems, { user_id: memberIdNum }]
            // Payers always divide the total in dollars. A participant's `value`
            // is dollars for exact and percent for percentage, and is unused by
            // the backend for equal splits.
            const total =
              mode === 'participants' && splitType === 'percentage' ? 100 : amount
            const shares = splitEvenly(total, next.length)

            field.onChange(
              next.map((item, i) =>
                mode === 'payers'
                  ? { ...item, amount_paid: shares[i].toFixed(2) }
                  : { ...item, value: shares[i] }
              )
            )
          }

          const updateAllocation = (userId: number, value: string) => {
            field.onChange(selectedItems.map((item) =>
              item.user_id === userId ? { ...item, amount_paid: value } : item
            ))
          }

          const updateParticipantValue = (userId: number, value: string) => {
            field.onChange(
              selectedItems.map((item) =>
                item.user_id === userId
                  ? { ...item, value: value === '' ? null : Number(value) }
                  : item
              )
            )
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
                      // Clicking the checkbox used to fire both onCheckedChange and the
                      // parent row's onClick, so toggleItem ran twice and the
                      // selection never changed. The checkbox keeps its own
                      // handler for keyboard accessibility but stops the click
                      // from bubbling into the row.
                      <div
                        key={member.id}
                        onClick={() => toggleItem(memberIdNum)}
                        className="flex items-center gap-2.5 p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleItem(memberIdNum)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span className="font-medium text-slate-700">
                          {member.name}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {selectedItems.length > 0 && mode === 'payers' && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      Amount paid by each
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Anyone who paid $0 will be counted as a participant only.
                    </p>
                    {selectedItems.map((item) => {
                      const member = members?.find((candidate) => Number(candidate.id) === item.user_id)
                      const value = item.amount_paid
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
                          <span className="w-4 text-xs text-slate-400">$</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {selectedItems.length > 0 && mode === 'participants' && splitType && splitType !== 'equal' && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      {splitType === 'exact' ? 'Amount for each' : 'Percentage for each'}
                    </p>
                    {selectedItems.map((item) => {
                      const member = members?.find((candidate) => Number(candidate.id) === item.user_id)
                      // Mirrors the backend's percentage rounding so the picker
                      // shows the same figure that will be stored.
                      const owed =
                        splitType === 'percentage'
                          ? (amount * Number(item.value ?? 0)) / 100
                          : Number(item.value ?? 0)

                      return (
                        <div key={item.user_id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{member?.name || item.user_id}</span>
                          <Input
                            type="number"
                            min="0"
                            step={splitType === 'percentage' ? '0.01' : '0.01'}
                            value={item.value ?? ''}
                            onChange={(event) =>
                              updateParticipantValue(item.user_id, event.target.value)
                            }
                            className="h-8 w-24 text-right text-xs"
                            placeholder="0"
                          />
                          <span className="w-8 text-xs text-slate-400">
                            {splitType === 'exact' ? '$' : '%'}
                          </span>
                          {splitType === 'percentage' && (
                            <span className="w-16 text-right text-[10px] text-slate-400">
                              ${Number.isFinite(owed) ? owed.toFixed(2) : '0.00'}
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
