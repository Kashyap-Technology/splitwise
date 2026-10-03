import { useMemo, useState, type CSSProperties } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  PieChart,
  Plus,
  Receipt,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserExpenseQuery } from '@/features/expense/api/useExpenseQuery'
import { categoryTheme } from '@/features/expense/categoryTheme'
import { useCategoryBreakdown } from '@/features/expense/useCategoryBreakdown'
import { useGroupQuery, useUserSettlementQuery } from '@/features/group/api/useGroupsQuery'
import type { UserGroupResponse } from '@/features/group/types/group.types'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

// How many recent expenses to list. The feed is already ordered newest-first by
// the API, so this is a straight slice.
const RECENT_LIMIT = 5

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

const initials = (name?: string | null) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const monthKey = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${date.getMonth()}`
}

// "Oct" for the trend axis, with the year appended when it is not the current
// one so a 12-month window spanning a boundary is still unambiguous.
const monthLabel = (key: string, referenceYear: number) => {
  const [year, month] = key.split('-').map(Number)
  const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short' })
  return year === referenceYear ? label : `${label} '${String(year).slice(-2)}`
}

const TREND_MONTHS = 6
const CATEGORY_LIMIT = 6

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardPage() {
  const [search, setSearch] = useState('')

  const { user } = useAuth()
  const { data: groups, isLoading: isLoadingGroups } = useGroupQuery()
  const { data: expenseData, isLoading: isLoadingExpenses } = useUserExpenseQuery()
  const { data: settlementData, isLoading: isLoadingSettlements } =
    useUserSettlementQuery()

  const summary = settlementData?.summary
  const totalToPay = parseNum(summary?.total_to_pay)
  const totalToReceive = parseNum(summary?.total_to_receive)

  // A positive net means the group owes the user money overall. These two can
  // legitimately disagree in sign per group, so the headline is the difference
  // rather than either figure alone.
  const netBalance = totalToReceive - totalToPay

  const settledUp = Math.abs(netBalance) < 0.005

  const allExpenses = useMemo(() => expenseData ?? [], [expenseData])

  const recentExpenses = useMemo(() => {
    const term = search.trim().toLowerCase()

    const matched = allExpenses.filter((expense) => {
      if (!term) return true
      return (
        expense.title?.toLowerCase().includes(term) ||
        expense.category_name?.toLowerCase().includes(term) ||
        expense.group_name?.toLowerCase().includes(term)
      )
    })

    return matched.slice(0, RECENT_LIMIT)
  }, [allExpenses, search])

  // Totals are computed over the whole feed, not the visible slice, so the
  // headline numbers do not jump around while the user types in the search box.
  const lifetimeSpend = useMemo(
    () => allExpenses.reduce((sum, expense) => sum + parseNum(expense.amount), 0),
    [allExpenses],
  )

  const thisMonthSpend = useMemo(() => {
    const now = new Date()
    return allExpenses
      .filter((expense) => monthKey(expense.created_at) === `${now.getFullYear()}-${now.getMonth()}`)
      .reduce((sum, expense) => sum + parseNum(expense.amount), 0)
  }, [allExpenses])

  const categoryBreakdown = useCategoryBreakdown(allExpenses, CATEGORY_LIMIT)

  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const buckets: Array<{ key: string; total: number; count: number }> = []

    // Walk backwards from the current month so the axis always has a fixed
    // length and empty months show as real zeroes instead of collapsing.
    for (let offset = TREND_MONTHS - 1; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      buckets.push({ key: `${date.getFullYear()}-${date.getMonth()}`, total: 0, count: 0 })
    }

    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))

    for (const expense of allExpenses) {
      const bucket = byKey.get(monthKey(expense.created_at))
      if (!bucket) continue

      bucket.total += parseNum(expense.amount)
      bucket.count += 1
    }

    const peak = Math.max(...buckets.map((bucket) => bucket.total), 0)

    return {
      buckets: buckets.map((bucket) => ({
        ...bucket,
        // Normalised height for the bar. A zero-spend month gets a floor rather
        // than 0 so it still reads as a tracked month.
        ratio: peak > 0 ? bucket.total / peak : 0,
      })),
      peak,
      year: now.getFullYear(),
      hasAnyActivity: buckets.some((bucket) => bucket.count > 0),
    }
  }, [allExpenses])

  // Per-person totals for the settlement list, split by who owes whom.
  const openBalances = useMemo(() => {
    const settlements = settlementData?.current_settlements ?? []

    const owedToYou: Array<{ name: string; group: string; amount: number }> = []
    const youOwe: Array<{ name: string; group: string; amount: number }> = []

    for (const settlement of settlements) {
      const amount = parseNum(settlement.amount)

      // `direction` is "paid" when the viewer is the sender, i.e. they owe.
      if (settlement.direction === 'received') {
        owedToYou.push({
          name: settlement.from_user.name,
          group: settlement.group.name,
          amount,
        })
      } else {
        youOwe.push({
          name: settlement.to_user.name,
          group: settlement.group.name,
          amount,
        })
      }
    }

    const bySize = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount

    return {
      owedToYou: owedToYou.sort(bySize),
      youOwe: youOwe.sort(bySize),
    }
  }, [settlementData])

  const recentSettlements = useMemo(
    () => (settlementData?.settlement_history ?? []).slice(0, 4),
    [settlementData],
  )

  const yourGroups = useMemo(() => groups ?? [], [groups])
  const totalGroupSpend = useMemo(
    () => yourGroups.reduce((sum, group) => sum + parseNum(group.total_expenses), 0),
    [yourGroups],
  )
  const totalMembers = useMemo(
    () => yourGroups.reduce((sum, group) => sum + (group.member_count ?? 0), 0),
    [yourGroups],
  )
  const groupsNeedingSettling = useMemo(
    () =>
      yourGroups.filter((group) => {
        const balance = parseNum(group.your_balance)
        return balance < -0.005
      }).length,
    [yourGroups],
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] min-h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl mx-auto w-full">
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 anim-rise">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {greeting()}
                {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {settledUp
                  ? 'Everything is settled up across your groups.'
                  : netBalance > 0
                    ? `You are owed ${money(netBalance)} overall.`
                    : `You owe ${money(Math.abs(netBalance))} overall.`}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search expenses..."
                  aria-label="Search your expenses"
                  className="pl-10 bg-white border-slate-200 rounded-xl text-sm h-11"
                />
              </div>

              <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm border border-slate-100">
                <AvatarImage src={user?.profile_image_url} alt={user?.name ?? 'You'} />
                <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xs">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <Card className="bg-gradient-to-b from-blue-50/40 to-indigo-50/20 border-slate-200/70 rounded-2xl sm:rounded-[28px] shadow-sm anim-rise">
            <CardContent className="p-5 sm:p-6">
              {isLoadingSettlements ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-9 w-48 rounded-lg" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Total balance
                    </span>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span
                        className={`text-3xl sm:text-4xl font-black tracking-tight ${
                          netBalance > 0
                            ? 'text-emerald-500'
                            : netBalance < 0
                              ? 'text-rose-500'
                              : 'text-slate-500'
                        }`}
                      >
                        {settledUp ? '$0.00' : `${netBalance > 0 ? '+' : '-'}$${money(Math.abs(netBalance))}`}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border-0 ${
                          netBalance > 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : netBalance < 0
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {settledUp ? (
                          'All settled'
                        ) : netBalance > 0 ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5" /> Overall positive
                          </>
                        ) : (
                          'Overall negative'
                        )}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
                    <Card className="shadow-sm border-slate-100 rounded-2xl anim-rise anim-stagger" style={{ '--anim-i': 1 } as CSSProperties}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-400">
                            You are owed
                          </span>
                          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                            ${money(totalToReceive)}
                          </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0">
                          <ArrowDown className="w-4 h-4 text-emerald-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-100 rounded-2xl anim-rise anim-stagger" style={{ '--anim-i': 2 } as CSSProperties}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-400">You owe</span>
                          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                            ${money(totalToPay)}
                          </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-rose-100/80 flex items-center justify-center shrink-0">
                          <ArrowUp className="w-4 h-4 text-rose-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
                    <Button
                      render={<Link to="/expenses" />}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl gap-2 shadow-md shadow-blue-500/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add an Expense</span>
                    </Button>

                    <Button
                      render={<Link to="/settlement" />}
                      variant="outline"
                      className="border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold h-11 rounded-xl gap-2 shadow-sm"
                    >
                      <Wallet className="w-4 h-4 text-slate-600" />
                      <span>Settle Up</span>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="anim-rise anim-stagger" style={{ '--anim-i': 3 } as CSSProperties}>
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Recent Activity
              </h2>
              <Button
                render={<Link to="/expenses" />}
                variant="link"
                className="p-0 h-auto text-xs font-bold text-blue-600 hover:no-underline"
              >
                View All
              </Button>
            </div>

            <Card className="shadow-sm border-slate-100 rounded-2xl overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {isLoadingExpenses ? (
                  <div className="space-y-4 p-4">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="flex items-center gap-3.5">
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-1/2 rounded" />
                          <Skeleton className="h-3 w-1/3 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentExpenses.length === 0 ? (
                  <div className="py-12 px-6 text-center">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      {allExpenses.length === 0 ? 'No expenses yet' : 'No matching expenses'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {allExpenses.length === 0 ? (
                        <>
                          Expenses you pay for or take part in will show up here.{' '}
                          <Link
                            to="/groups"
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            Open a group
                          </Link>{' '}
                          to add one.
                        </>
                      ) : (
                        'Try a different search term.'
                      )}
                    </p>
                  </div>
                ) : (
                  recentExpenses.map((expense, index) => {
                    const { Icon, box } = categoryTheme(expense.category_name)
                    const total = parseNum(expense.amount)
                    const net = parseNum(expense.your_paid) - parseNum(expense.your_share)

                    return (
                      <Link
                        key={expense.id}
                        to="/groups/$groupId"
                        params={{ groupId: String(expense.group_id) }}
                        className="block anim-rise anim-stagger"
                        style={{ '--anim-i': index } as CSSProperties}
                      >
                        <div className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${box}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <h3 className="text-sm font-bold text-slate-900 truncate">
                                {expense.title}
                              </h3>
                              <p className="text-xs text-slate-400 font-medium truncate">
                                {expense.group_name} · {expense.category_name}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-slate-900">
                              ${money(total)}
                            </span>
                            <p
                              className={`text-[11px] font-semibold ${
                                net > 0
                                  ? 'text-emerald-500'
                                  : net < 0
                                    ? 'text-rose-500'
                                    : 'text-slate-400'
                              }`}
                            >
                              {net > 0
                                ? `You lent ${money(net)}`
                                : net < 0
                                  ? `You owe ${money(Math.abs(net))}`
                                  : 'Your share only'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <SpendingTrend
            buckets={monthlyTrend.buckets}
            peak={monthlyTrend.peak}
            year={monthlyTrend.year}
            isLoading={isLoadingExpenses}
            hasAnyActivity={monthlyTrend.hasAnyActivity}
          />

          <CategoryBreakdown
            items={categoryBreakdown.items}
            overflow={categoryBreakdown.overflow}
            grandTotal={categoryBreakdown.grandTotal}
            isLoading={isLoadingExpenses}
          />
        </div>

        <div className="lg:col-span-4 space-y-4 anim-rise anim-stagger" style={{ '--anim-i': 4 } as CSSProperties}>
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Your Groups</h2>
            <Button
              render={<Link to="/groups" />}
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-lg"
              aria-label="Create or view all groups"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <MiniStat
              icon={<Users className="w-4 h-4 text-blue-600" />}
              label="Members"
              value={totalMembers}
            />
            <MiniStat
              icon={<Receipt className="w-4 h-4 text-emerald-600" />}
              label="Group spend"
              value={`$${money(totalGroupSpend)}`}
            />
            <MiniStat
              icon={<CalendarDays className="w-4 h-4 text-violet-600" />}
              label="This month"
              value={`$${money(thisMonthSpend)}`}
            />
            <MiniStat
              icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
              label="All time"
              value={`$${money(lifetimeSpend)}`}
            />
          </div>

          <div className="space-y-3">
            {isLoadingGroups ? (
              <>
                {[0, 1, 2].map((row) => (
                  <Card key={row} className="border-slate-100 shadow-sm rounded-2xl">
                    <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-2/3 rounded" />
                        <Skeleton className="h-3 w-1/3 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : yourGroups.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 rounded-2xl shadow-none bg-white/60">
                <CardContent className="p-10 text-center">
                  <div className="p-3 bg-slate-100 rounded-full text-slate-400 inline-flex mb-3">
                    <FolderKanban className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No groups yet</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Create a group to start splitting expenses.
                  </p>
                  <Button
                    render={<Link to="/groups" />}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Create Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              yourGroups.map((group, index) => (
                <div
                  key={group.id}
                  className="anim-rise anim-stagger"
                  style={{ '--anim-i': index } as CSSProperties}
                >
                  <GroupCard group={group} />
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-3">
            <MiniStat
              icon={<Users className="w-4 h-4 text-blue-600" />}
              label="Members"
              value={totalMembers}
            />
            <MiniStat
              icon={<Receipt className="w-4 h-4 text-emerald-600" />}
              label="Group spend"
              value={`$${money(totalGroupSpend)}`}
            />
            <MiniStat
              icon={<CalendarDays className="w-4 h-4 text-violet-600" />}
              label="This month"
              value={`$${money(thisMonthSpend)}`}
            />
            <MiniStat
              icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
              label="All time"
              value={`$${money(lifetimeSpend)}`}
            />
          </div>

          {groupsNeedingSettling > 0 && (
            <Card className="border-slate-100 border-l-4 border-l-orange-400 shadow-sm rounded-2xl">
              <CardContent className="p-4 flex items-start gap-3">
                <Wallet className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {groupsNeedingSettling} group
                    {groupsNeedingSettling === 1 ? '' : 's'} need settling
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    You owe money in {groupsNeedingSettling === 1 ? 'one of your groups' : `${groupsNeedingSettling} of your groups`}.
                  </p>
                  <Button
                    render={<Link to="/settlement" />}
                    variant="link"
                    className="p-0 h-auto mt-1.5 text-[11px] font-bold text-blue-600 hover:no-underline"
                  >
                    Review balances <ArrowRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <OpenBalances
            owedToYou={openBalances.owedToYou}
            youOwe={openBalances.youOwe}
            isLoading={isLoadingSettlements}
          />

          {recentSettlements.length > 0 && (
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Settled recently</h3>
                  <Button
                    render={<Link to="/settlement" />}
                    variant="link"
                    className="p-0 h-auto text-[11px] font-bold text-blue-600 hover:no-underline"
                  >
                    History
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {recentSettlements.map((settlement, index) => {
                    const amount = parseNum(settlement.amount)
                    const youPaid = settlement.direction === 'paid'
                    const other = youPaid ? settlement.to_user : settlement.from_user

                    return (
                      <div key={settlement.id ?? index} className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8 shrink-0 border border-slate-100">
                          <AvatarFallback className="bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                            {initials(other.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {youPaid ? `Paid ${other.name}` : `${other.name} paid you`}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {settlement.group.name}
                          </p>
                        </div>

                        <span className="text-xs font-bold text-emerald-600 shrink-0">
                          ${money(amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <Card className="border-slate-100 shadow-sm rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
            {icon}
          </span>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase truncate">
            {label}
          </span>
        </div>
        <p className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{value}</p>
      </CardContent>
    </Card>
  )
}

function SpendingTrend({
  buckets,
  peak,
  year,
  isLoading,
  hasAnyActivity,
}: {
  buckets: Array<{ key: string; total: number; count: number; ratio: number }>
  peak: number
  year: number
  isLoading: boolean
  hasAnyActivity: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">Spending trend</h2>
        <span className="text-xs font-semibold text-slate-400">Last {TREND_MONTHS} months</span>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-5">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : !hasAnyActivity ? (
            <div className="py-10 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No spending yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Once you record expenses, a monthly breakdown shows up here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 sm:gap-3 h-40">
                {buckets.map((bucket, index) => {
                  const isCurrent = index === buckets.length - 1

                  return (
                    <div
                      key={bucket.key}
                      className="flex-1 flex flex-col items-center justify-end gap-2 h-full min-w-0"
                    >
                      <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                        {bucket.total > 0 ? `$${bucket.total.toFixed(0)}` : ''}
                      </span>

                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          isCurrent ? 'bg-blue-500' : 'bg-blue-200 hover:bg-blue-300'
                        }`}
                        // A floor keeps zero-spend months visible as tracked
                        // months instead of vanishing from the axis.
                        style={{
                          height: `${Math.max(bucket.ratio * 100, bucket.total > 0 ? 6 : 2)}%`,
                        }}
                        title={`${money(bucket.total)} across ${bucket.count} expense${bucket.count === 1 ? '' : 's'}`}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mt-2">
                {buckets.map((bucket) => (
                  <span
                    key={bucket.key}
                    className="flex-1 text-center text-[10px] font-semibold text-slate-400 truncate"
                  >
                    {monthLabel(bucket.key, year)}
                  </span>
                ))}
              </div>

              {peak > 0 && (
                <p className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  Busiest month was <span className="font-bold text-slate-900">${money(peak)}</span>.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CategoryBreakdown({
  items,
  overflow,
  grandTotal,
  isLoading,
}: {
  items: Array<{ id: number; name: string; total: number; count: number; share: number }>
  overflow: number
  grandTotal: number
  isLoading: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">Where it goes</h2>
        <Button
          render={<Link to="/expenses" />}
          variant="link"
          className="p-0 h-auto text-xs font-bold text-blue-600 hover:no-underline"
        >
          Breakdown
        </Button>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-5">
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-3.5 w-1/3 rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <PieChart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Nothing to break down</p>
              <p className="text-xs text-slate-400 mt-1">
                Category totals appear once you have recorded expenses.
              </p>
            </div>
          ) : (
            <>
              {/* Stacked proportional bar. Each segment takes its share of the
                  top-N total so the bar always fills the full width. */}
              <div
                className="flex h-2 rounded-full overflow-hidden bg-slate-100"
                role="img"
                aria-label={items
                  .map((item) => `${item.name} ${Math.round(item.share * 100)}%`)
                  .join(', ')}
              >
                {items.map((item) => (
                  <span
                    key={item.id}
                    className={categoryTheme(item.name).box.split(' ')[0]}
                    style={{ width: `${item.share * 100}%` }}
                    title={`${item.name}: $${money(item.total)}`}
                  />
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {items.map((item) => {
                  const { Icon, box } = categoryTheme(item.name)

                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${box}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                            ${money(item.total)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {item.count} expense{item.count === 1 ? '' : 's'} ·{' '}
                          {Math.round(item.share * 100)}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {grandTotal > 0 && (
                <p className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <span className="font-bold text-slate-900">${money(grandTotal)}</span>{' '}
                  across {items.length} categor{items.length === 1 ? 'y' : 'ies'}
                  {overflow > 0 && ` · ${overflow} more not shown`}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function OpenBalances({
  owedToYou,
  youOwe,
  isLoading,
}: {
  owedToYou: Array<{ name: string; group: string; amount: number }>
  youOwe: Array<{ name: string; group: string; amount: number }>
  isLoading: boolean
}) {
  const rows: Array<{
    name: string
    group: string
    amount: number
    label: string
    tone: 'owed' | 'owing'
  }> = [
    ...owedToYou.map((item) => ({ ...item, label: 'Owes you', tone: 'owed' as const })),
    ...youOwe.map((item) => ({ ...item, label: 'You owe', tone: 'owing' as const })),
  ]

  if (isLoading) {
    return (
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card className="border-slate-100 border-l-4 border-l-emerald-500 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-900">Debt free</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nobody owes you anything, and you owe nobody.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-100 shadow-sm rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Open balances</h3>
          <Button
            render={<Link to="/settlement" />}
            variant="link"
            className="p-0 h-auto text-[11px] font-bold text-blue-600 hover:no-underline"
          >
            Settle
          </Button>
        </div>

        <div className="space-y-2.5">
          {rows.slice(0, 6).map((row, index) => (
            <div key={`${row.group}-${row.name}-${index}`} className="flex items-center gap-2.5">
              <Avatar className="w-8 h-8 shrink-0 border border-slate-100">
                <AvatarFallback
                  className={`text-[10px] font-bold ${
                    row.tone === 'owed'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {initials(row.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{row.name}</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">{row.group}</p>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-xs font-bold ${
                    row.tone === 'owed' ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  ${money(row.amount)}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">{row.label}</p>
              </div>
            </div>
          ))}
        </div>

        {rows.length > 6 && (
          <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {rows.length - 6} more open balance{rows.length - 6 === 1 ? '' : 's'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function GroupCard({ group }: { group: UserGroupResponse }) {
  const balance = parseNum(group.your_balance)
  const memberCount = group.member_count ?? 0

  return (
    <Link
      to="/groups/$groupId"
      params={{ groupId: String(group.id) }}
      className="block group"
    >
      <Card className="border-slate-100 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
        <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
          <Avatar className="w-11 h-11 rounded-xl shrink-0">
            <AvatarImage src={group.group_image_url ?? undefined} alt={group.name} className="rounded-none" />
            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xs rounded-xl">
              {initials(group.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {group.name}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">
              {balance < 0 ? 'You owe' : balance > 0 ? 'You get' : 'Balance'}
            </span>
            <span
              className={`text-sm font-bold ${
                balance < 0
                  ? 'text-rose-500'
                  : balance > 0
                    ? 'text-emerald-600'
                    : 'text-slate-400'
              }`}
            >
              {balance === 0 ? 'Settled' : `$${money(Math.abs(balance))}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}