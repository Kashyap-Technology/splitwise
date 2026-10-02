import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Grid, Plus, Receipt, TrendingUp, Wallet } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import { useExpenseCategoryQuery } from '@/features/expense/api/useExpenseQuery'
import { categoryTheme } from '@/features/expense/categoryTheme'
import type { ExpenseCategoryResponse } from '@/features/expense/types/expense.types'

import { CategoryCreateDialog } from './groups/components/CategoryCreateDialog'

export const Route = createFileRoute('/_authenticated/categories')({
  component: CategoriesPage,
})

type SortKey = 'spend' | 'name' | 'usage'

const parseNum = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

const money = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'spend', label: 'Most spend' },
  { value: 'usage', label: 'Most used' },
  { value: 'name', label: 'A to Z' },
]

/**
 * Categories are a shared vocabulary rather than per-group settings, so this is
 * a catalogue with live usage stats rather than a management form: names are
 * globally unique and `Expense.category` is `on_delete=PROTECT`, so a category
 * that has ever been used cannot be deleted at all. There is no delete endpoint
 * to wire up, and faking one would be worse than not offering it.
 */
function CategoriesPage() {
  const { data, isLoading, isError } = useExpenseCategoryQuery()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('spend')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const categories = useMemo(() => data ?? [], [data])

  const totals = useMemo(() => {
    const spend = categories.reduce((sum, c) => sum + parseNum(c.your_spend), 0)
    const used = categories.filter((c) => c.expense_count > 0).length

    return {
      spend,
      used,
      unused: categories.length - used,
      expenses: categories.reduce((sum, c) => sum + c.expense_count, 0),
    }
  }, [categories])

  // Sorted against the full list, then filtered, so searching doesn't reorder
  // results out from under the user.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    const matched = categories.filter(
      (category) => !term || category.name.toLowerCase().includes(term),
    )

    return [...matched].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'usage') return b.expense_count - a.expense_count
      return parseNum(b.your_spend) - parseNum(a.your_spend)
    })
  }, [categories, search, sort])

  const maxSpend = useMemo(
    () => Math.max(...categories.map((c) => parseNum(c.your_spend)), 0),
    [categories],
  )

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            The shared labels you can tag expenses with, and what each has cost you.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New category</span>
        </Button>
      </header>

      {isError ? (
        <Card className="border-l-4 border-l-red-400 rounded-2xl">
          <CardContent className="p-10 text-center">
            <AlertTriangle className="w-9 h-9 mx-auto mb-2 text-red-400" />
            <h2 className="text-base font-bold text-slate-800">Could not load categories</h2>
            <p className="text-sm text-slate-500 mt-1">
              Something went wrong fetching the list. Please try again.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              tone="emerald"
              label="Your spend"
              value={totals.spend}
              caption="Across every category"
            />
            <StatCard
              icon={<Grid className="w-5 h-5" />}
              tone="blue"
              label="Categories"
              value={categories.length}
              caption={`${totals.used} in use`}
            />
            <StatCard
              icon={<Receipt className="w-5 h-5" />}
              tone="amber"
              label="Expenses tagged"
              value={totals.expenses}
              caption="Total across all groups"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              tone="slate"
              label="Unused"
              value={totals.unused}
              caption={
                totals.unused > 0
                  ? 'Available for new expenses'
                  : 'Every category has been used'
              }
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories..."
                aria-label="Search categories"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {SORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    sort === option.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {search && (
              <span className="text-sm text-slate-500 shrink-0">
                {visible.length} of {categories.length}
              </span>
            )}
          </section>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 rounded-2xl shadow-none bg-white/60">
              <CardContent className="p-12 text-center">
                <div className="p-3 bg-slate-100 rounded-full text-slate-400 inline-flex mb-3">
                  <Grid className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold text-slate-800">No categories yet</h2>
                <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm mx-auto">
                  Categories are the labels you tag expenses with, like Food or Rent.
                  Create your first one to get started.
                </p>
                <Button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create a category
                </Button>
              </CardContent>
            </Card>
          ) : visible.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center">
                <p className="text-base font-bold text-slate-700">
                  No categories match "{search}"
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Try a different name, or create it as a new category.
                </p>
              </CardContent>
            </Card>
          ) : (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  // Relative to the biggest category, so the bars stay
                  // comparable. Guards the zero case, where every share is 0.
                  share={maxSpend > 0 ? parseNum(category.your_spend) / maxSpend : 0}
                />
              ))}
            </section>
          )}

          <p className="text-xs text-slate-400 max-w-2xl">
            Categories are shared across every group and names are unique. Once an
            expense uses a category it cannot be deleted, so the list only grows.
          </p>
        </>
      )}

      <CategoryCreateDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  )
}

function CategoryCard({
  category,
  share,
}: {
  category: ExpenseCategoryResponse
  share: number
}) {
  const { Icon, box } = categoryTheme(category.name, category.icon)
  const spend = parseNum(category.your_spend)
  const unused = category.expense_count === 0

  return (
    <Card className="border-slate-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-2xl shrink-0 ${box}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 truncate leading-tight pt-0.5">
                {category.name}
              </h3>
              {unused && (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500"
                >
                  Unused
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {category.expense_count} expense{category.expense_count === 1 ? '' : 's'}
              {category.created_by && ` · by ${category.created_by}`}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Your share</span>
            <span className="text-sm font-extrabold text-slate-900">
              ${money(spend)}
            </span>
          </div>

          {/* Zero-spend categories get a faint track so the row does not look
              broken, but no filled bar. */}
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            {spend > 0 && (
              <div
                className={`h-full rounded-full ${box.split(' ')[0]}`}
                style={{ width: `${Math.max(share * 100, 3)}%` }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
