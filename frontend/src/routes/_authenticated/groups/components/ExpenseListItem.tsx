import { useState } from 'react'
import { ChevronDown, Pencil, Trash2, Users } from 'lucide-react'

import { categoryTheme } from '@/features/expense/categoryTheme'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { GroupExpense } from '@/features/group/types/group.types'

const SPLIT_BADGE: Record<string, { label: string; className: string }> = {
  equal: { label: 'Split equally', className: 'bg-slate-100 text-slate-600' },
  exact: { label: 'Exact amounts', className: 'bg-violet-100 text-violet-700' },
  percentage: { label: 'By percentage', className: 'bg-blue-100 text-blue-700' },
}

const parseNum = (val: unknown): number => {
  if (val === null || val === undefined) return 0
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? 0 : n
}

const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

// Every payer is credited with their own contribution. Previously only
// `payers[0]` was rendered, so an expense split between several people was
// mislabelled as being paid by one person.
function describePayers(expense: GroupExpense, currentUserId?: string | number) {
  const payers = expense.payers ?? []
  if (payers.length === 0) return 'No payer recorded'

  const nameFor = (user?: { id: number | string; name: string }) =>
    user && String(user.id) === String(currentUserId)
      ? 'You'
      : user?.name || 'Unknown'

  const names = payers.map((p) => nameFor(p.user))

  if (names.length === 1) return `Paid by ${names[0]}`
  if (names.length === 2) return `Paid by ${names[0]} & ${names[1]}`
  return `Paid by ${names[0]} +${names.length - 1} more`
}

export function ExpenseListItem({
  expense,
  currentUserId,
  canManage,
  onEdit,
  onDelete,
}: {
  expense: GroupExpense
  currentUserId?: string | number
  canManage: boolean
  onEdit: (expense: GroupExpense) => void
  onDelete: (expense: GroupExpense) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { Icon: CategoryIcon, box: categoryBox } = categoryTheme(expense.category_name)
  const total = parseNum(expense.amount)
  const badge = SPLIT_BADGE[expense.split_type] ?? SPLIT_BADGE.equal

  const userPayer = (expense.payers ?? []).find(
    (p) => String(p.user?.id) === String(currentUserId),
  )
  const userParticipant = (expense.participants ?? []).find(
    (p) => String(p.user?.id) === String(currentUserId),
  )

  const userPaid = parseNum(userPayer?.amount_paid)
  const userShare = parseNum(userParticipant?.amount_to_pay)
  const net = userPaid - userShare

  const dateLabel = expense.created_at
    ? new Date(expense.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : ''

  // Shown in the expanded breakdown so a member can see their slice at a glance.
  const yourSharePercent = total > 0 ? Math.round((userShare / total) * 100) : 0

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        {/* The identity block and the amount block are forced onto separate rows
            below `sm`. Side by side they need ~290px of non-shrinkable width,
            which collapsed the title column to zero width on phones and let the
            icon spill over the amounts. */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
          <div className="flex basis-full items-start gap-3 min-w-0 sm:basis-auto sm:flex-1 sm:gap-4">
            <div className={`p-2.5 rounded-2xl shrink-0 sm:p-3 ${categoryBox}`}>
              <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <h4 className="font-bold text-slate-900 text-lg leading-tight truncate sm:text-xl">
                {expense.title}
              </h4>

              <p className="text-sm text-slate-500 font-medium truncate">
                {dateLabel && `${dateLabel} · `}
                {describePayers(expense, currentUserId)}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}
                >
                  {badge.label}
                </span>

                {expense.category_name && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {expense.category_name}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsExpanded((open) => !open)}
                  aria-expanded={isExpanded}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <Users className="h-3 w-3" />
                  {(expense.participants ?? []).length} people
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-3 sm:flex-none sm:shrink-0 sm:justify-end sm:gap-x-4">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5 sm:text-xs">
                Total
              </span>
              <span className="font-extrabold text-slate-900 text-base block tabular-nums sm:text-lg">
                ${total.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200 sm:h-10" />

            <div className="text-right sm:min-w-[86px]">
              {net > 0 ? (
                <>
                  <span className="text-[11px] font-bold text-emerald-600 block mb-0.5 sm:text-xs">
                    You lent
                  </span>
                  <span className="font-extrabold text-emerald-600 text-base block tabular-nums sm:text-lg">
                    ${net.toFixed(2)}
                  </span>
                </>
              ) : net < 0 ? (
                <>
                  <span className="text-[11px] font-bold text-orange-600 block mb-0.5 sm:text-xs">
                    You owe
                  </span>
                  <span className="font-extrabold text-orange-600 text-base block tabular-nums sm:text-lg">
                    ${Math.abs(net).toFixed(2)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5 sm:text-xs">
                    Your share
                  </span>
                  <span className="font-bold text-slate-500 text-base block tabular-nums sm:text-lg">
                    ${userShare.toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {canManage && (
              <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${expense.title}`}
                  title="Edit expense"
                  onClick={() => onEdit(expense)}
                  className="h-9 w-9 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${expense.title}`}
                  title="Delete expense"
                  onClick={() => onDelete(expense)}
                  className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">
                Paid by
              </p>
              <div className="space-y-2">
                {(expense.payers ?? []).map((payer) => {
                  const paid = parseNum(payer.amount_paid)
                  const isYou = String(payer.user?.id) === String(currentUserId)

                  return (
                    <div key={payer.user?.id} className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">
                        {initials(isYou ? 'You' : payer.user?.name)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 truncate flex-1">
                        {isYou ? 'You' : payer.user?.name || 'Unknown'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ${paid.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">
                Split between
              </p>
              <div className="space-y-2">
                {(expense.participants ?? []).map((participant) => {
                  const owed = parseNum(participant.amount_to_pay)
                  const isYou = String(participant.user?.id) === String(currentUserId)
                  const sharePercent = total > 0 ? (owed / total) * 100 : 0

                  return (
                    <div key={participant.user?.id} className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                        {initials(isYou ? 'You' : participant.user?.name)}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 truncate flex-1">
                        {isYou ? 'You' : participant.user?.name || 'Unknown'}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isYou ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {isYou ? `Your ${yourSharePercent}%` : `${sharePercent.toFixed(1)}%`}
                      </span>
                      <span className="text-sm font-bold text-slate-900 w-16 text-right">
                        ${owed.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}