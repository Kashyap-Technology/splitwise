import { ArrowDownUp, Search, SlidersHorizontal } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type ExpenseSort = 'newest' | 'oldest' | 'highest' | 'lowest'

const SORTS: Array<{ value: ExpenseSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' },
]

export function ExpenseFilters({
  search,
  onSearchChange,
  category,
  categories,
  onCategoryChange,
  sort,
  onSortChange,
  resultCount,
  totalCount,
}: {
  search: string
  onSearchChange: (value: string) => void
  category: string
  categories: Array<{ id: number; name: string }>
  onCategoryChange: (value: string) => void
  sort: ExpenseSort
  onSortChange: (value: ExpenseSort) => void
  resultCount: number
  totalCount: number
}) {
  const cycleSort = () => {
    const index = SORTS.findIndex((s) => s.value === sort)
    onSortChange(SORTS[(index + 1) % SORTS.length].value)
  }

  const currentSortLabel = SORTS.find((s) => s.value === sort)?.label ?? ''

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-2xl border-0 shadow-sm p-3">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search expenses..."
          aria-label="Search expenses"
          className="h-11 pl-9 rounded-xl border-slate-200 bg-slate-50/60 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <SlidersHorizontal className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            aria-label="Filter by category"
            className="h-11 appearance-none rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={cycleSort}
          className="h-11 rounded-xl border-slate-200 bg-slate-50/60 px-3 text-sm font-semibold text-slate-700"
        >
          <ArrowDownUp className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{currentSortLabel}</span>
          <span className="sm:hidden">Sort</span>
        </Button>
      </div>

      {resultCount !== totalCount && (
        <span className="text-sm font-semibold text-slate-500 sm:ml-1">
          Showing {resultCount} of {totalCount}
        </span>
      )}
    </div>
  )
}