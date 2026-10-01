import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDownUp,
  CalendarDays,
  Filter,
  Plus,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'

import { useCreateExpenseMutation, useDeleteExpenseMutation } from '@/features/expense/api/useExpenseMutation'
import { useExpenseCategoryQuery, useUserExpenseQuery } from '@/features/expense/api/useExpenseQuery'
import { categoryTheme } from '@/features/expense/categoryTheme'
import { activePayers, expenseSchema, type CreateExpenseInput } from '@/features/expense/schemas/expenseSchema'
import type { UserExpensesResponse } from '@/features/expense/types/expense.types'
import { useGroupMemberQuery, useGroupQuery } from '@/features/group/api/useGroupsQuery'
import type { GroupMember } from '@/routes/_authenticated/groups/components/types'

import { ExpenseFormFields } from './groups/components/ExpenseFormDialog'

export const Route = createFileRoute('/_authenticated/expenses')({
  component: ExpensesPage,
})

type RangeKey = 'all' | 'week' | 'month' | 'quarter'
type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest'
type GroupMode = 'group' | 'date'

// Sentinel for "no filter". Base UI's <SelectValue> resolves a label from its
// `items` prop and falls back to stringifying the raw value, so this constant
// must never reach the trigger's text. An empty string cannot be used instead:
// base-ui treats '' as "nothing selected" and shows the placeholder.
const ALL = '__all__'

const RANGES: Array<{ value: RangeKey; label: string; days: number | null }> = [
  { value: 'all', label: 'All time', days: null },
  { value: 'week', label: 'Last 7 days', days: 7 },
  { value: 'month', label: 'This month', days: 30 },
  { value: 'quarter', label: 'Last 90 days', days: 90 },
]

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' },
]

// Stable identities for the filter selects, so the `items` lookup map is not
// rebuilt on every render.
const rangeOptions = RANGES.map(({ value, label }) => ({ value, label }))
const sortOptions = SORTS.map(({ value, label }) => ({ value, label }))

const SPLIT_BADGE: Record<string, string> = {
  equal: 'bg-slate-100 text-slate-600',
  exact: 'bg-violet-100 text-violet-700',
  percentage: 'bg-blue-100 text-blue-700',
}

const parseNum = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

// Local-calendar day bucket. Using the local getters keeps an expense recorded
// at 11pm on the 1st grouped under the 1st rather than shifting across the
// boundary via UTC parsing.
const dayKey = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const dayLabel = (key: string) => {
  if (!key) return 'Unknown date'

  // Built from parts rather than by re-parsing the key as a date string. The
  // month is already 0-based here (it came from getMonth()), and going through
  // the string form makes correctness depend on whether the format happens to
  // be the padded ISO form that Date parses as UTC.
  const [year, month, day] = key.split('-').map(Number)
  if ([year, month, day].some(Number.isNaN)) return 'Unknown date'

  return new Date(year, month, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const relativeDay = (iso: string, startOfToday: Date) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return null
}

function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [group, setGroup] = useState<string>(ALL)
  const [range, setRange] = useState<RangeKey>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [groupBy, setGroupBy] = useState<GroupMode>('date')
  const [detail, setDetail] = useState<UserExpensesResponse | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserExpensesResponse | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Anchor for date buckets and range cutoffs. Captured once per mount so the
  // "Today" grouping and the rolling windows do not drift when something else
  // triggers a re-render.
  const [now] = useState(() => new Date())

  const { data, isLoading } = useUserExpenseQuery()
  const deleteExpense = useDeleteExpenseMutation()

  const expenses = useMemo(() => data ?? [], [data])

  // Category and group options come from the expenses themselves, so they stay
  // correct no matter which categories exist or which groups are shared.
  const categoryOptions = useMemo(() => {
    const byId = new Map<number, string>()
    for (const expense of expenses) {
      if (expense.category_id && expense.category_name) {
        byId.set(expense.category_id, expense.category_name)
      }
    }
    return Array.from(byId, ([id, name]) => ({
      value: String(id),
      label: name,
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [expenses])

  const groupOptions = useMemo(() => {
    const byId = new Map<number, string>()
    for (const expense of expenses) {
      if (expense.group_id && expense.group_name) {
        byId.set(expense.group_id, expense.group_name)
      }
    }
    return Array.from(byId, ([id, name]) => ({
      value: String(id),
      label: name,
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [expenses])

  const startOfToday = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const days = RANGES.find((option) => option.value === range)?.days ?? null
    const cutoff = days === null ? null : startOfToday.getTime() - days * 86_400_000

    const matched = expenses.filter((expense) => {
      if (category !== ALL && String(expense.category_id) !== category) return false
      if (group !== ALL && String(expense.group_id) !== group) return false

      if (cutoff !== null) {
        const created = new Date(expense.created_at ?? '').getTime()
        // An expense with a missing or unparseable date cannot satisfy a date
        // filter, so it is hidden rather than leaking through the range.
        if (!Number.isFinite(created) || created < cutoff) return false
      }

      if (!term) return true
      return (
        expense.title?.toLowerCase().includes(term) ||
        expense.category_name?.toLowerCase().includes(term) ||
        expense.group_name?.toLowerCase().includes(term)
      )
    })

    const sorted = [...matched]
    switch (sort) {
      case 'oldest':
        sorted.sort(
          (a, b) => Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? ''),
        )
        break
      case 'highest':
        sorted.sort((a, b) => parseNum(b.amount) - parseNum(a.amount))
        break
      case 'lowest':
        sorted.sort((a, b) => parseNum(a.amount) - parseNum(b.amount))
        break
      default:
        sorted.sort(
          (a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''),
        )
    }

    return sorted
  }, [expenses, search, category, group, range, sort, startOfToday])

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, expense) => sum + parseNum(expense.amount), 0)
    const share = filtered.reduce((sum, expense) => sum + parseNum(expense.your_share), 0)
    const paid = filtered.reduce((sum, expense) => sum + parseNum(expense.your_paid), 0)

    return {
      total,
      count: filtered.length,
      yourShare: share,
      net: paid - share,
      categories: new Set(filtered.map((expense) => expense.category_id)).size,
    }
  }, [filtered])

  const sections = useMemo(() => {
    const buckets = new Map<string, UserExpensesResponse[]>()

    for (const expense of filtered) {
      const key =
        groupBy === 'date'
          ? // An expense with no usable date cannot be bucketed by day, so it
            // gets its own trailing "unknown" section instead of being silently
            // folded into today's totals.
            dayKey(expense.created_at ?? '') || 'undated'
          : String(expense.group_id)

      const bucket = buckets.get(key)
      if (bucket) bucket.push(expense)
      else buckets.set(key, [expense])
    }

    return Array.from(buckets, ([key, items]) => ({
      key,
      items,
      total: items.reduce((sum, expense) => sum + parseNum(expense.amount), 0),
    })).sort((a, b) => {
      if (groupBy === 'group') return a.items[0].group_name.localeCompare(b.items[0].group_name)
      return b.key.localeCompare(a.key)
    })
  }, [filtered, groupBy])

  const filtersActive =
    search !== '' || category !== ALL || group !== ALL || range !== 'all'

  const resetFilters = () => {
    setSearch('')
    setCategory(ALL)
    setGroup(ALL)
    setRange('all')
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Everything you paid for or owe across every group.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={stats.total}
          caption={`${stats.count} expense${stats.count === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Your share"
          value={stats.yourShare}
          caption="What you owe of the above"
        />
        <StatCard
          label="You covered"
          value={stats.net > 0 ? stats.net : 0}
          tone="emerald"
          caption={
            stats.net > 0
              ? 'You fronted more than your share'
              : stats.net < 0
                ? 'Owed more than you paid'
                : 'Perfectly even'
          }
        />
        <StatCard
          label="Categories"
          value={stats.categories}
          format="number"
          caption="Used in this view"
        />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-3 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by expense, category or group..."
              aria-label="Search expenses"
              className="h-11 pl-9 rounded-xl border-slate-200 bg-slate-50/60 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              icon={<Filter className="h-4 w-4" />}
              value={category}
              onValueChange={setCategory}
              ariaLabel="Filter by category"
              allLabel="All categories"
              options={categoryOptions}
            />

            <FilterSelect
              icon={<TrendingUp className="h-4 w-4" />}
              value={group}
              onValueChange={setGroup}
              ariaLabel="Filter by group"
              allLabel="All groups"
              options={groupOptions}
            />

            <FilterSelect
              icon={<CalendarDays className="h-4 w-4" />}
              value={range}
              onValueChange={(value) => setRange(value as RangeKey)}
              ariaLabel="Filter by date range"
              options={rangeOptions}
            />

            <FilterSelect
              icon={<ArrowDownUp className="h-4 w-4" />}
              value={sort}
              onValueChange={(value) => setSort(value as SortKey)}
              ariaLabel="Sort expenses"
              options={sortOptions}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { value: 'date', label: 'By day' },
                { value: 'group', label: 'By group' },
              ] as Array<{ value: GroupMode; label: string }>
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGroupBy(option.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  groupBy === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filtersActive ? (
            <span className="flex items-center gap-3 text-sm text-slate-500">
              Showing {filtered.length} of {expenses.length}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 gap-1.5 rounded-lg text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </span>
          ) : (
            expenses.length > 0 && (
              <span className="text-sm text-slate-500">
                {expenses.length} expense{expenses.length === 1 ? '' : 's'} total
              </span>
            )
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-0 shadow-sm bg-white">
          <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-semibold text-slate-700 mb-1">
            {expenses.length === 0 ? 'No expenses yet' : 'No matching expenses'}
          </p>
          <p className="text-base text-slate-500">
            {expenses.length === 0 ? (
              <>
                Expenses you pay for or take part in show up here.{' '}
                <Link
                  to="/groups"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Open a group
                </Link>{' '}
                to add your first one.
              </>
            ) : (
              'Try widening the date range or clearing a filter.'
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.key} className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  {groupBy === 'date' && relativeDay(section.items[0].created_at, startOfToday) ? (
                    relativeDay(section.items[0].created_at, startOfToday)
                  ) : (
                    groupBy === 'group'
                      ? section.items[0].group_name
                      : dayLabel(section.key)
                  )}
                  <span className="font-medium text-slate-400">
                    · {section.items.length}
                  </span>
                </h2>
                <span className="text-sm font-semibold text-slate-900">
                  ${section.total.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                {section.items.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    showGroup={groupBy === 'date'}
                    onOpen={() => setDetail(expense)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AddExpenseDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Expense details</DialogTitle>
          </DialogHeader>

          {detail && <ExpenseDetailBody expense={detail} />}

          <DialogFooter className="flex justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              className="text-white"
              disabled={deleteExpense.isPending}
              onClick={() => {
                deleteExpense.reset()
                setConfirmDelete(detail)
              }}
            >
              Delete
            </Button>
            <Button type="button" onClick={() => setDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteExpense.isPending) setConfirmDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete “{confirmDelete?.title}” and update the
              group balances. Only a group admin can do this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpense.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteExpense.isPending}
              onClick={(event) => {
                // Keep the dialog mounted while the request is in flight so the
                // pending state is visible, and only dismiss once it succeeds.
                event.preventDefault()
                if (!confirmDelete) return

                deleteExpense.mutate(confirmDelete.id, {
                  onSuccess: () => {
                    setConfirmDelete(null)
                    setDetail(null)
                  },
                })
              }}
            >
              {deleteExpense.isPending ? 'Deleting...' : 'Delete expense'}
            </AlertDialogAction>
          </AlertDialogFooter>

          {deleteExpense.isError && (
            <p role="alert" className="text-sm text-red-600">
              Could not delete this expense. Group admins can delete expenses; you may
              not be one, or it may already be gone.
            </p>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  caption,
  format = 'currency',
  tone = 'slate',
}: {
  label: string
  value: number
  caption: string
  format?: 'currency' | 'number'
  tone?: 'slate' | 'emerald'
}) {
  const accent = tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900'

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-extrabold tracking-tight ${accent}`}>
        {format === 'currency' ? '$' : ''}
        {value.toLocaleString('en-US', {
          minimumFractionDigits: format === 'currency' ? 2 : 0,
          maximumFractionDigits: format === 'currency' ? 2 : 0,
        })}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{caption}</p>
    </Card>
  )
}

// Base UI renders the trigger's label by looking the current value up in the
// `items` prop. Without it, the trigger falls back to stringifying the raw
// value, which is how the `__all__` sentinel leaked into the UI. Options are
// declared once here and used both for the popup and for that lookup.
function FilterSelect({
  icon,
  value,
  onValueChange,
  ariaLabel,
  options,
  allLabel,
}: {
  icon: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  ariaLabel: string
  options: Array<{ value: string; label: string }>
  allLabel?: string
}) {
  const items = useMemo(() => {
    const map: Record<string, string> = {}
    if (allLabel) map[ALL] = allLabel
    for (const option of options) map[option.value] = option.label
    return map
  }, [options, allLabel])

  return (
    <Select
      value={value}
      items={items}
      onValueChange={(next) => next && onValueChange(next)}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/60 px-3 text-sm font-medium text-slate-700 sm:w-auto"
      >
        <span className="flex items-center gap-2 text-slate-400">{icon}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ExpenseRow({
  expense,
  showGroup,
  onOpen,
}: {
  expense: UserExpensesResponse
  showGroup: boolean
  onOpen: () => void
}) {
  const { Icon, box } = categoryTheme(expense.category_name)
  const total = parseNum(expense.amount)
  const yourShare = parseNum(expense.your_share)
  const yourPaid = parseNum(expense.your_paid)
  const net = yourPaid - yourShare
  const splitClass = SPLIT_BADGE[expense.split_type] ?? SPLIT_BADGE.equal

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="rounded-2xl border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-2xl shrink-0 ${box}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 truncate">{expense.title}</h3>
          <p className="text-xs font-medium text-slate-500 truncate">
            {showGroup && `${expense.group_name} · `}
            {expense.category_name}
          </p>
        </div>

        <span
          className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize shrink-0 ${splitClass}`}
        >
          {expense.split_type}
        </span>

        <div className="text-right shrink-0">
          <p className="font-extrabold text-slate-900">${total.toFixed(2)}</p>
          <p
            className={`text-xs font-bold ${
              net > 0
                ? 'text-emerald-600'
                : net < 0
                  ? 'text-orange-600'
                  : 'text-slate-400'
            }`}
          >
            {net > 0
              ? `You lent $${net.toFixed(2)}`
              : net < 0
                ? `You owe $${Math.abs(net).toFixed(2)}`
                : 'Not involved'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function ExpenseDetailBody({ expense }: { expense: UserExpensesResponse }) {
  const { Icon, box } = categoryTheme(expense.category_name)
  const yourPaid = parseNum(expense.your_paid)
  const yourShare = parseNum(expense.your_share)
  const net = yourPaid - yourShare

  return (
    <div className="space-y-4 py-1">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl shrink-0 ${box}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate">{expense.title}</p>
          <p className="text-xs font-medium text-slate-500">
            {expense.category_name}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-sm">
        <Row label="Group">
          <Link
            to="/groups/$groupId"
            params={{ groupId: String(expense.group_id) }}
            className="font-semibold text-blue-600 hover:underline"
          >
            {expense.group_name}
          </Link>
        </Row>
        <Row label="Total">
          <span className="font-bold text-slate-900">
            ${parseNum(expense.amount).toFixed(2)}
          </span>
        </Row>
        <Row label="Split type">
          <span className="font-medium capitalize text-slate-900">
            {expense.split_type}
          </span>
        </Row>
        <Row label="You paid">
          <span className="font-semibold text-slate-900">
            ${yourPaid.toFixed(2)}
          </span>
        </Row>
        <Row label="Your share">
          <span className="font-semibold text-slate-900">
            ${yourShare.toFixed(2)}
          </span>
        </Row>
        <Row label="Net">
          <span
            className={`font-bold ${
              net > 0
                ? 'text-emerald-600'
                : net < 0
                  ? 'text-orange-600'
                  : 'text-slate-500'
            }`}
          >
            {net > 0
              ? `You lent $${net.toFixed(2)}`
              : net < 0
                ? `You owe $${Math.abs(net).toFixed(2)}`
                : 'Nothing to settle'}
          </span>
        </Row>
      </div>

      <p className="text-xs text-slate-400">
        Your share is what you owe on this expense. If you paid more than that, the
        difference is owed back to you by the group.
      </p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  )
}



/**
 * Creating an expense needs a group (for its members) plus payers and
 * participants, none of which the feed can infer. This wraps the shared group
 * expense form with a group picker so validation and share previews stay
 * identical to the group page.
 */
function AddExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: groups, isLoading: isLoadingGroups } = useGroupQuery()
  const [groupId, setGroupId] = useState('')

  // Default to the first group so the common case is one click, but let the
  // picker override it. Falls back to '' while the list loads.
  const selectedGroupId = groupId || (groups?.[0] ? String(groups[0].id) : '')

  const { data: members, isLoading: isLoadingMembers } =
    useGroupMemberQuery(selectedGroupId)
  const { data: categories, isLoading: isLoadingCategories } =
    useExpenseCategoryQuery()
  const { mutate: createExpense, isPending, error } = useCreateExpenseMutation()

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: {
      title: '',
      amount: undefined,
      category_id: undefined,
      split_type: 'equal',
      payers: [],
      participants: [],
    },
  })

  const { control, handleSubmit, reset } = form
  const watchedAmount = useWatch({ control, name: 'amount' }) || 0
  const watchedSplitType = useWatch({ control, name: 'split_type' })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  // Switching group changes the member list, so any previously chosen payers or
  // participants are no longer guaranteed to belong to the group and must go.
  const selectGroup = (next: string) => {
    setGroupId(next)
    form.setValue('payers', [])
    form.setValue('participants', [])
  }

  const errorMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
          <DialogDescription>
            Pick the group this belongs to, then record who paid and how it splits.
          </DialogDescription>
        </DialogHeader>

        {(groups?.length ?? 0) === 0 && !isLoadingGroups ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">
              You are not in any group yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Expenses are always shared within a group, so create or join one first.
            </p>
            <Link
              to="/groups"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
            >
              Go to groups
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((data) =>
              createExpense(
                { groupId: selectedGroupId, data: buildPayload(data) },
                { onSuccess: close },
              ),
            )}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label>Group</Label>
              <Select
                value={selectedGroupId}
                onValueChange={(next) => next && selectGroup(next)}
              >
                <SelectTrigger className="w-full" disabled={isLoadingGroups}>
                  <SelectValue placeholder="Select a group">
                    {isLoadingGroups
                      ? 'Loading groups...'
                      : groups?.find((group) => String(group.id) === selectedGroupId)
                          ?.name ?? 'Select a group'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ExpenseFormFields
              form={form}
              categories={categories}
              isLoadingCategories={isLoadingCategories}
              members={members as GroupMember[]}
              isLoadingMembers={isLoadingMembers}
              watchedAmount={watchedAmount}
              watchedSplitType={watchedSplitType}
            />

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {errorMessage || 'Unable to save this expense. Please try again.'}
              </p>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !selectedGroupId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? 'Adding...' : 'Add expense'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function buildPayload(data: CreateExpenseInput) {
  return {
    ...data,
    // Payer amounts are always explicit, and payers who contributed nothing are
    // dropped because ExpensePayer.amount_paid rejects a zero amount.
    payers: activePayers(data.payers).map((payer) => ({
      user_id: Number(payer.user_id),
      amount_paid: Number(payer.amount_paid).toFixed(2),
    })),
    participants: data.participants.map((participant) => ({
      user_id: Number(participant.user_id),
      // `value` is dollars for exact and percent for percentage; the backend
      // ignores it for equal splits.
      ...(data.split_type !== 'equal' ? { value: Number(participant.value ?? 0) } : {}),
    })),
  }
}