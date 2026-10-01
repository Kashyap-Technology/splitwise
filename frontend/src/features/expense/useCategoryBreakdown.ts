import { useMemo } from 'react'

const DEFAULT_LIMIT = 6

const parseNum = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

export type CategorySlice = {
  id: number
  name: string
  total: number
  count: number
  /** Share of the top-N total, so a stacked bar built from `items` fills the row. */
  share: number
}

export type CategoryBreakdown = {
  items: CategorySlice[]
  /** Categories beyond the limit, which are summarised rather than listed. */
  overflow: number
  grandTotal: number
  /** Every category with no limit applied. */
  all: Array<Omit<CategorySlice, 'share'>>
}

/**
 * Totals an expense list by category.
 *
 * Grouped by category id rather than name: categories are user-created, so "Food"
 * and "food" are two rows in the database and merging them by name would quietly
 * combine two separate totals.
 *
 * `share` is a fraction of the top-N total rather than of the grand total,
 * otherwise a long tail of small categories leaves the bars mostly empty and
 * every percentage rounds to zero.
 */
export function useCategoryBreakdown(
  expenses: Array<{
    category_id: number
    category_name: string
    amount: string | number
  }>,
  limit: number = DEFAULT_LIMIT,
): CategoryBreakdown {
  return useMemo(() => {
    const byId = new Map<number, { name: string; total: number; count: number }>()

    for (const expense of expenses) {
      if (!expense.category_id || !expense.category_name) continue

      const amount = parseNum(expense.amount)
      const existing = byId.get(expense.category_id)

      if (existing) {
        existing.total += amount
        existing.count += 1
      } else {
        byId.set(expense.category_id, {
          name: expense.category_name,
          total: amount,
          count: 1,
        })
      }
    }

    const sorted = Array.from(byId, ([id, value]) => ({ id, ...value })).sort(
      (a, b) => b.total - a.total,
    )

    const top = sorted.slice(0, limit)
    const topTotal = top.reduce((sum, item) => sum + item.total, 0)

    return {
      items: top.map((item) => ({
        ...item,
        share: topTotal > 0 ? item.total / topTotal : 0,
      })),
      overflow: Math.max(sorted.length - top.length, 0),
      grandTotal: sorted.reduce((sum, item) => sum + item.total, 0),
      all: sorted,
    }
  }, [expenses, limit])
}