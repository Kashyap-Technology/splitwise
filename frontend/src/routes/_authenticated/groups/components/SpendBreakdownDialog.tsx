import { PieChart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { categoryTheme } from '@/features/expense/categoryTheme'
import { useCategoryBreakdown } from '@/features/expense/useCategoryBreakdown'
import type { GroupExpense } from '@/features/group/types/group.types'

const money = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/**
 * Shows where a group's total spend went, by category. Backs the "View
 * breakdown" action on the group summary card, which used to open the add
 * expense dialog and so asked for input when the user only wanted information.
 */
export function SpendBreakdownDialog({
  isOpen,
  onOpenChange,
  groupName,
  expenses,
  totalSpend,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  expenses: GroupExpense[]
  totalSpend: number
}) {
  // Every category is listed here rather than capped, so the bar and the total
// line below it account for the whole group.
const { items: slices, grandTotal: listedTotal } = useCategoryBreakdown(
  expenses,
  Number.MAX_SAFE_INTEGER,
)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spend breakdown</DialogTitle>
          <DialogDescription>
            {slices.length === 0
              ? `No expenses recorded in ${groupName} yet.`
              : `How ${money(totalSpend)} across ${expenses.length} expense${expenses.length === 1 ? '' : 's'} splits down by category.`}
          </DialogDescription>
        </DialogHeader>

        {slices.length === 0 ? (
          <div className="py-8 text-center">
            <PieChart className="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nothing to break down</p>
            <p className="text-xs text-slate-400 mt-1">
              Add an expense and the totals show up here.
            </p>
          </div>
        ) : (
          <>
            {/* Stacked proportional bar. Each segment is a share of the listed
                total so the bar always fills the full width. */}
            <div
              className="flex h-2.5 rounded-full overflow-hidden bg-slate-100"
              role="img"
              aria-label={slices
                .map(
                  (slice) =>
                    `${slice.name} ${Math.round((slice.total / listedTotal) * 100)}%`,
                )
                .join(', ')}
            >
              {slices.map((slice) => (
                <span
                  key={slice.id}
                  className={categoryTheme(slice.name).box.split(' ')[0]}
                  style={{ width: `${(slice.total / listedTotal) * 100}%` }}
                  title={`${slice.name}: $${money(slice.total)}`}
                />
              ))}
            </div>

            <div className="mt-5 space-y-2.5">
              {slices.map((slice) => {
                const { Icon, box } = categoryTheme(slice.name)
                const share = listedTotal > 0 ? slice.total / listedTotal : 0

                return (
                  <div
                    key={slice.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${box}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">
                          {slice.name}
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                          ${money(slice.total)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {slice.count} expense{slice.count === 1 ? '' : 's'} ·{' '}
                        {Math.round(share * 100)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-500">Total</span>
              <span className="font-extrabold text-slate-900">${money(totalSpend)}</span>
            </div>
          </>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}