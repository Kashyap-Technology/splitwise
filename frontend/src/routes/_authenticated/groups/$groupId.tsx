import { createFileRoute } from '@tanstack/react-router'
import {
  Receipt,
  Wallet,
  Tag,
  ShieldCheck,
  Mail,
  ArrowRight,
  UserMinus,
  Users as UsersIcon,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { activePayers, expenseSchema } from '../../../features/expense/schemas/expenseSchema'
import type { CreateExpenseInput } from '../../../features/expense/schemas/expenseSchema'
import { useGroupDetailQuery } from '@/features/group/api/useGroupsQuery'
import type { GroupExpense } from '@/features/group/types/group.types'
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useUpdateExpenseMutation,
} from '@/features/expense/api/useExpenseMutation'
import { useExpenseCategoryQuery } from '@/features/expense/api/useExpenseQuery'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useInviteMemberMutation } from '@/features/group/api/useInviteMemberMutation'
import {
  useGroupDeleteMutation,
  useGroupRemoveMemberMutation,
  useGroupUpdateMutation,
} from '@/features/group/api/useGroupMutation'

import { ExpenseFormDialog } from './components/ExpenseFormDialog'
import { DeleteExpenseDialog } from './components/DeleteExpenseDialog'
import { ExpenseListItem } from './components/ExpenseListItem'
import { ExpenseFilters, type ExpenseSort } from './components/ExpenseFilters'
import {
  SettleUpDialog,
  SettlementRow,
  type SettleTarget,
} from './components/SettlementPanel'
import { InviteMemberDialog } from './components/InviteMemberDialog'
import { GroupBalancesCard } from './components/GroupBalancesCard'
import { GroupHeader } from './components/GroupHeader'
import { SummaryCard } from './components/SummaryCard'
import type { GroupBalance } from './components/types'
import { EditGroupDialog } from './components/EditGroupDialog'
import { DeleteGroupDialog } from './components/DeleteGroupDialog'
import { CategoryCreateDialog } from './components/CategoryCreateDialog'
import { SpendBreakdownDialog } from './components/SpendBreakdownDialog'

export interface SettlementSuggestion {
  from_user: string
  to_user: string
  amount: number
}

export const Route = createFileRoute('/_authenticated/groups/$groupId')({
  component: GroupDetailComponent,
})

const getInitials = (name: string) =>
  (name || 'User')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const parseNum = (val: unknown): number => {
  if (val === null || val === undefined) return 0
  const n = typeof val === 'number' ? val : parseFloat(String(val))
  return isNaN(n) ? 0 : n
}

// Reconstructs the form state needed to edit an existing expense.
//
// The group detail payload stores the *resolved* share per person
// (amount_to_pay), not the raw input the user typed, so exact and percentage
// values have to be derived back. For equal splits the backend ignores `value`
// entirely, so the owed amounts are dropped.
function buildExpenseEditValues(expense: GroupExpense): CreateExpenseInput | null {
  const amount = parseNum(expense.amount)
  if (!amount) return null

  const splitType = (expense.split_type ?? 'equal') as CreateExpenseInput['split_type']

  const payers = (expense.payers ?? []).map((payer) => ({
    user_id: Number(payer.user.id),
    amount_paid: parseNum(payer.amount_paid).toFixed(2),
  }))

  const participants = (expense.participants ?? []).map((participant) => {
    const owed = parseNum(participant.amount_to_pay)
    const value =
      splitType === 'percentage' ? (owed / amount) * 100 : owed

    return {
      user_id: Number(participant.user.id),
      value: Math.round(value * 100) / 100,
    }
  })

  if (splitType === 'percentage' && participants.length > 0) {
    const total = participants.reduce((sum, p) => sum + (p.value ?? 0), 0)
    let drift = Math.round((100 - total) * 100) / 100

    // Nudge the largest share to absorb any rounding drift so the form starts
    // in a state the backend will accept (percentages must total exactly 100).
    // Prefer a share that is already non-zero, so nobody gets pushed to 0%.
    if (drift !== 0) {
      const target = [...participants]
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .find((p) => (p.value ?? 0) > 0) ?? participants[participants.length - 1]

      target.value = Math.round(((target.value ?? 0) + drift) * 100) / 100

      // Rounding can overshoot past 0 or 100; fall back to the last participant
      // and give it whatever is still outstanding.
      const remaining = Math.round((100 - participants.reduce((s, p) => s + (p.value ?? 0), 0)) * 100) / 100
      if (remaining !== 0) {
        const last = participants[participants.length - 1]
        last.value = Math.round(((last.value ?? 0) + remaining) * 100) / 100
      }
    }
  }

  return {
    title: expense.title ?? '',
    amount,
    category_id: Number(expense.category_id),
    split_type: splitType,
    payers,
    participants,
  }
}

function normalizeBalanceMap(raw: unknown): Record<string, number> {
  if (!raw) return {}

  if (typeof raw === 'object' && raw !== null && 'data' in raw) {
    return normalizeBalanceMap((raw as any).data)
  }

  if (Array.isArray(raw)) {
    const map: Record<string, number> = {}
    raw.forEach((item) => {
      if (item && typeof item === 'object') {
        const uid = item.user_id ?? item.id
        const bal = parseNum(item.balance ?? item.amount)
        if (uid !== undefined) {
          map[String(uid)] = bal
        }
      }
    })
    return map
  }

  if (typeof raw === 'object' && raw !== null) {
    const map: Record<string, number> = {}
    Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
      map[String(k)] = parseNum(v)
    })
    return map
  }

  return {}
}

export function getGroupBalances(group?: {
  balances?: unknown
  members?: { id: number | string; name: string; avatarUrl?: string; profile_image_url?: string | null }[]
}): GroupBalance[] {
  if (!group?.members?.length) return []

  const balanceMap = normalizeBalanceMap(group.balances)

  return group.members
    .filter((member) => balanceMap[String(member.id)] !== undefined)
    .map((member) => {
      const amount = balanceMap[String(member.id)] ?? 0
      const statusType: GroupBalance['statusType'] =
        amount > 0 ? 'credit' : amount < 0 ? 'debit' : 'settled'
      const statusText =
        statusType === 'credit'
          ? 'Gets back'
          : statusType === 'debit'
            ? 'Owes'
            : 'Settled up'

      const parsedId = Number(member.id)

      return {
        id: Number.isNaN(parsedId) ? 0 : parsedId,
        name: member.name,
        avatarUrl: member.avatarUrl || member.profile_image_url || undefined,
        amount: Math.abs(amount),
        statusType,
        statusText,
      }
    })
}

export function getSettlementSuggestions(group?: {
  settlement_suggestions?: Record<string, any>[]
  summary?: Record<string, any>
}): SettlementSuggestion[] {
  if (!group) return []

  const rawSuggestions =
    group.settlement_suggestions ??
    (group.summary as Record<string, any> | undefined)?.settlement_suggestions ??
    []

  if (!Array.isArray(rawSuggestions)) return []

  return rawSuggestions.map((item) => ({
    from_user: item.from_user || item.from_user_name || 'Someone',
    to_user: item.to_user || item.to_user_name || 'Someone',
    amount: parseNum(item.amount),
  }))
}

function GroupDetailComponent() {
  const { groupId } = Route.useParams()
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false)
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string | number
    name: string
  } | null>(null)
  const [expenseToEdit, setExpenseToEdit] = useState<GroupExpense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<GroupExpense | null>(null)
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null)
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseSort, setExpenseSort] = useState<ExpenseSort>('newest')

  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?.data?.id ?? currentUser?.id
  // The settlement suggestions endpoint returns display names rather than ids,
  // so "you" has to be matched on the name.
  const currentUserName = currentUser?.data?.name ?? currentUser?.name

  const { data: group, isLoading: isLoadingGroup } = useGroupDetailQuery(groupId)
  // `group?.expenses ?? []` allocates a new array on every render, which
  // invalidates every memo downstream. Keyed memos are only worth having if
  // their inputs keep a stable identity between renders.
  const expenses = useMemo(() => group?.expenses ?? [], [group])
  const members = useMemo(() => group?.members ?? [], [group])

  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategoryQuery()
  const { mutate: inviteMember, isPending: isInvitePending } = useInviteMemberMutation()
  const { mutate: createExpense, isPending: isExpensePending } = useCreateExpenseMutation()
  const { mutate: updateExpense, isPending: isExpenseUpdatePending } =
    useUpdateExpenseMutation()
  const { mutate: deleteExpense, isPending: isExpenseDeletePending } =
    useDeleteExpenseMutation()
  const { mutate: deleteGroup, isPending: isGroupDeletePending} = useGroupDeleteMutation(groupId)
  const { mutate: removeMember, isPending: isMemberRemovePending } = useGroupRemoveMemberMutation(groupId)
  const {
    mutate: updateGroup,
    isPending: isUpdateGroupPending,
    error: updateGroupError,
    reset: resetUpdateGroup,
  } = useGroupUpdateMutation(groupId)

  const currentMember = members.find(
    (member) => String(member.id) === String(currentUserId)
  )
  const isGroupAdmin = currentMember?.role === 'admin'
  const canRemoveMembers = isGroupAdmin

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(expenseSchema) as any,
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

  const groupBalances = useMemo(() => getGroupBalances(group), [group])
  const settlementSuggestions = useMemo(() => getSettlementSuggestions(group), [group])

  const yourBalanceRaw = parseNum(group?.summary?.your_balance)
  const yourBalance = Math.abs(yourBalanceRaw)

  const yourBalancePrefix =
    yourBalanceRaw < 0 ? 'You owe' : yourBalanceRaw > 0 ? 'You get back' : 'Settled up'
  const yourBalanceColorClass =
    yourBalanceRaw < 0
      ? 'text-orange-600'
      : yourBalanceRaw > 0
        ? 'text-emerald-600'
        : 'text-slate-400'

  const peopleInvolvedCount = groupBalances.filter(
    (b) => String(b.id) !== String(currentUserId) && b.statusType !== 'settled'
  ).length

  // The filter lists every category the user has created, not just the ones
  // this group happens to have used. Deriving it from `expenses` (as this
  // previously did) hid freshly created categories until an expense referenced
  // them, which left the dropdown looking frozen at whatever was already in use.
  // Category IDs are the filter values so duplicate or case-varied names cannot
  // make two different categories collapse into one entry.
  const expenseCategories = useMemo(() => {
    const byId = new Map<number, string>()

    for (const category of categories ?? []) {
      if (category?.id) byId.set(category.id, category.name)
    }

    // Keep any category referenced by an expense but missing from the list, so a
    // stale or partially failed category query can never hide existing rows.
    for (const expense of expenses) {
      if (expense.category_id && expense.category_name && !byId.has(expense.category_id)) {
        byId.set(expense.category_id, expense.category_name)
      }
    }

    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [categories, expenses])

  const totalCategoryCount = expenseCategories.length
  const categoriesInUse = useMemo(
    () => new Set(expenses.map((expense) => expense.category_id).filter(Boolean)).size,
    [expenses],
  )

  // A category filter can outlive its category (deleted, or the list failed to
  // load on a later render). Treat an unknown value as "no filter" rather than
  // syncing it back with an effect, which would show an empty list with nothing
  // selected in the dropdown to explain why.
  const activeExpenseCategory = expenseCategories.some(
    (category) => String(category.id) === expenseCategory,
  )
    ? expenseCategory
    : ''

  const visibleExpenses = useMemo(() => {
    const term = expenseSearch.trim().toLowerCase()

    const filtered = expenses.filter((expense) => {
      if (activeExpenseCategory && String(expense.category_id) !== activeExpenseCategory) {
        return false
      }
      if (!term) return true
      return (
        expense.title?.toLowerCase().includes(term) ||
        expense.category_name?.toLowerCase().includes(term)
      )
    })

    const sorted = [...filtered]
    switch (expenseSort) {
      case 'oldest':
        sorted.reverse()
        break
      case 'highest':
        sorted.sort((a, b) => parseNum(b.amount) - parseNum(a.amount))
        break
      case 'lowest':
        sorted.sort((a, b) => parseNum(a.amount) - parseNum(b.amount))
        break
      default:
        break
    }
    return sorted
  }, [expenses, expenseSearch, activeExpenseCategory, expenseSort])

  const buildExpensePayload = (data: CreateExpenseInput) => ({
    ...data,
    // amount_paid is always sent explicitly: the backend requires the payer
    // total to equal the expense amount for every split type, and split type
    // only governs the participant distribution. Payers who contributed nothing
    // are dropped, since ExpensePayer.amount_paid rejects a zero amount.
    payers: activePayers(data.payers).map(
      (payer: CreateExpenseInput['payers'][number]) => ({
        user_id: Number(payer.user_id),
        amount_paid: Number(payer.amount_paid).toFixed(2),
      }),
    ),
    participants: data.participants.map(
      (participant: CreateExpenseInput['participants'][number]) => ({
        user_id: Number(participant.user_id),
        // `value` is dollars for exact and percent for percentage; the backend
        // ignores it for equal splits.
        ...(data.split_type !== 'equal'
          ? { value: Number(participant.value ?? 0) }
          : {}),
      }),
    ),
  })

  const onExpenseSubmit = (data: CreateExpenseInput) => {
    createExpense(
      { groupId, data: buildExpensePayload(data) },
      {
        onSuccess: () => {
          setIsExpenseDialogOpen(false)
          reset()
        },
        onError: (err) => {
          console.error('Failed to create expense:', err)
        },
      }
    )
  }

  const onExpenseEditSubmit = (data: CreateExpenseInput) => {
    if (!expenseToEdit) return

    updateExpense(
      { expenseId: expenseToEdit.id, data: buildExpensePayload(data) },
      {
        onSuccess: () => {
          setExpenseToEdit(null)
          reset()
        },
        onError: (err) => {
          console.error('Failed to update expense:', err)
        },
      }
    )
  }

  const onConfirmDeleteExpense = () => {
    if (!expenseToDelete) return

    deleteExpense(expenseToDelete.id, {
      onSuccess: () => setExpenseToDelete(null),
      onError: (err) => {
        console.error('Failed to delete expense:', err)
      },
    })
  }

  const openEditExpense = (expense: GroupExpense) => {
    const values = buildExpenseEditValues(expense)
    if (!values) return

    reset(values)
    setExpenseToEdit(expense)
  }

  const onConfirmDelete = () => {
    deleteGroup()
  }

  const onConfirmRemoveMember = () => {
    if (!memberToRemove) return

    removeMember(memberToRemove.id, {
      onSettled: () => setMemberToRemove(null),
    })
  }

  if (isLoadingGroup) return <GroupDetailSkeleton />
  if (!group) return <div className="p-10 text-center text-slate-500">Group not found</div>

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <GroupHeader
        name={group.name}
        description={group.description || 'No description provided'}
        groupImageUrl={group.group_image_url}
        onEditGroup={() => setIsEditGroupDialogOpen(true)}
        onDeleteGroup={() => setIsDeleteGroupDialogOpen(true)}
        onAddExpense={() => setIsExpenseDialogOpen(true)}
        onAddMember={() => setIsMemberDialogOpen(true)}
        canManage={isGroupAdmin}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          icon={<Receipt className="h-5 w-5" />}
          label="Total Group Spend"
          value={parseNum(group.summary?.total_expenses)}
          meta={`Across ${expenses.length} expense${expenses.length === 1 ? '' : 's'}`}
          actionLabel="View breakdown"
          onAction={() => setIsBreakdownOpen(true)}
          tone="blue"
        />

        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Your Balance"
          value={yourBalance}
          valueClassName={yourBalanceColorClass}
          prefixText={yourBalancePrefix}
          meta={
            peopleInvolvedCount > 0
              ? `With ${peopleInvolvedCount} other${peopleInvolvedCount === 1 ? '' : 's'}`
              : 'All settled up'
          }
          tone="amber"
          badge={
            peopleInvolvedCount > 0 ? 'Needs attention' : 'No dues'
          }
        />

        <SummaryCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Members"
          value={members.length}
          meta={
            expenses.length === 0
              ? 'No expenses recorded yet'
              : `${categoriesInUse} categor${categoriesInUse === 1 ? 'y' : 'ies'} in use · ${(group?.settlements ?? []).length} settlement${(group?.settlements ?? []).length === 1 ? '' : 's'}`
          }
          tone="emerald"
          badge={`${totalCategoryCount} categor${totalCategoryCount === 1 ? 'y' : 'ies'}`}
          valueFormat="number"
        />
      </div>

      <EditGroupDialog
        isOpen={isEditGroupDialogOpen}
        onOpenChange={setIsEditGroupDialogOpen}
        group={{
          name: group.name,
          description: group.description,
          group_image_url: group.group_image_url,
          member_count: members.length,
          expense_count: expenses.length,
        }}
        isPending={isUpdateGroupPending}
        // Surfaced inside the dialog: a rejected save used to close-over
        // silently, leaving the user with no idea why nothing happened.
        error={updateGroupError}
        onSave={(formData) => {
          resetUpdateGroup()
          updateGroup(formData, {
            onSuccess: () => {
              setIsEditGroupDialogOpen(false)
            },
          })
        }}
      />

      <ExpenseFormDialog
        isOpen={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        form={form}
        categories={categories}
        isLoadingCategories={isLoadingCategories}
        members={members}
        isLoadingMembers={isLoadingGroup}
        watchedAmount={watchedAmount}
        watchedSplitType={watchedSplitType}
        isPending={isExpensePending}
        onSubmit={handleSubmit(onExpenseSubmit)}
        onCancel={() => {
          setIsExpenseDialogOpen(false)
          reset()
        }}
        mode="create"
      />

      <ExpenseFormDialog
        isOpen={Boolean(expenseToEdit)}
        onOpenChange={(open) => {
          if (!open) {
            setExpenseToEdit(null)
            reset()
          }
        }}
        form={form}
        categories={categories}
        isLoadingCategories={isLoadingCategories}
        members={members}
        isLoadingMembers={isLoadingGroup}
        watchedAmount={watchedAmount}
        watchedSplitType={watchedSplitType}
        isPending={isExpenseUpdatePending}
        onSubmit={handleSubmit(onExpenseEditSubmit)}
        onCancel={() => {
          setExpenseToEdit(null)
          reset()
        }}
        mode="edit"
      />

      <DeleteExpenseDialog
        isOpen={Boolean(expenseToDelete)}
        onOpenChange={(open) => {
          if (!open) setExpenseToDelete(null)
        }}
        expenseTitle={expenseToDelete?.title}
        isPending={isExpenseDeletePending}
        onConfirm={onConfirmDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      <SettleUpDialog
        groupId={groupId}
        target={settleTarget}
        onOpenChange={(open) => {
          if (!open) setSettleTarget(null)
        }}
      />

      <CategoryCreateDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      />

      <SpendBreakdownDialog
        isOpen={isBreakdownOpen}
        onOpenChange={setIsBreakdownOpen}
        groupName={group.name}
        expenses={expenses}
        totalSpend={parseNum(group.summary?.total_expenses)}
      />

      <InviteMemberDialog
        isOpen={isMemberDialogOpen}
        onOpenChange={setIsMemberDialogOpen}
        onInvite={(selectedUser) => {
          inviteMember(
            { groupId, userId: selectedUser.id },
            {
              onSuccess: () => {
                setIsMemberDialogOpen(false)
              },
            }
          )
        }}
        isPending={isInvitePending}
      />

      <DeleteGroupDialog
        isOpen={isDeleteGroupDialogOpen}
        onOpenChange={setIsDeleteGroupDialogOpen}
        groupName={group.name}
        isPending={isGroupDeletePending}
        onConfirm={onConfirmDelete}
        onCancel={() => setIsDeleteGroupDialogOpen(false)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="expenses" className="w-full">
            <div className="flex items-end justify-between gap-3 border-b border-slate-200">
              <TabsList className="bg-transparent p-0 h-auto gap-8 justify-start rounded-none">
                <TabsTrigger
                  value="expenses"
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-base"
                >
                  Expenses ({expenses.length})
                </TabsTrigger>
                <TabsTrigger
                  value="balances"
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-base"
                >
                  Balances
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-base"
                >
                  Members ({members.length})
                </TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryDialogOpen(true)}
                className="mb-1 gap-2 border-slate-200 px-3 text-slate-600 hover:text-slate-900"
                aria-label="Add an expense category"
                title="Create a category for organizing group expenses"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Add expense category</span>
              </Button>
            </div>

            {/* EXPENSES TAB */}
            <TabsContent value="expenses" className="mt-6 space-y-4">
              {expenses.length === 0 ? (
                <Card className="p-10 text-center text-slate-500 rounded-2xl border-slate-100 shadow-sm bg-white">
                  <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-lg font-semibold text-slate-700 mb-1">
                    No expenses added yet
                  </p>
                  <p className="text-base text-slate-500">
                    Click &quot;Add Expense&quot; to record your first shared cost.
                  </p>
                </Card>
              ) : (
                <>
                  <ExpenseFilters
                    search={expenseSearch}
                    onSearchChange={setExpenseSearch}
                    category={activeExpenseCategory}
                    categories={expenseCategories}
                    onCategoryChange={setExpenseCategory}
                    sort={expenseSort}
                    onSortChange={setExpenseSort}
                    resultCount={visibleExpenses.length}
                    totalCount={expenses.length}
                  />

                  {visibleExpenses.length === 0 ? (
                    <Card className="p-10 text-center text-slate-500 rounded-2xl border-slate-100 shadow-sm bg-white">
                      <p className="text-lg font-semibold text-slate-700 mb-1">
                        No matching expenses
                      </p>
                      <p className="text-base text-slate-500">
                        Try a different search term or category filter.
                      </p>
                    </Card>
                  ) : (
                    visibleExpenses.map((expense) => (
                      <ExpenseListItem
                        key={expense.id}
                        expense={expense}
                        currentUserId={currentUserId}
                        canManage={isGroupAdmin}
                        onEdit={openEditExpense}
                        onDelete={setExpenseToDelete}
                      />
                    ))
                  )}
                </>
              )}
            </TabsContent>

            {/* BALANCES TAB */}
            <TabsContent value="balances" className="mt-6 space-y-6">
              {settlementSuggestions.length > 0 && (
                <Card className="rounded-2xl border-slate-100 border-l-4 border-l-blue-500 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          Optimal Settlement Payments
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Minimizes the number of transactions needed to clear all
                          debts.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <div className="divide-y divide-slate-100">
                    {settlementSuggestions.map((s, idx) => (
                      <SettlementRow
                        key={`${s.from_user}-${s.to_user}-${idx}`}
                        fromUser={
                          s.from_user === currentUserName ? 'You' : s.from_user
                        }
                        toUser={
                          s.to_user === currentUserName ? 'You' : s.to_user
                        }
                        amount={s.amount}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {groupBalances.length === 0 ? (
                <Card className="p-10 text-center text-slate-500 rounded-2xl border-slate-100 shadow-sm bg-white">
                  <Wallet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-lg font-semibold text-slate-700 mb-1">
                    No balance data yet
                  </p>
                  <p className="text-base text-slate-500">
                    Add an expense and balances will appear here.
                  </p>
                </Card>
              ) : (
                <Card className="rounded-2xl border-slate-100 border-l-4 border-l-emerald-500 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <Wallet className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          Net Balances
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Who is owed money, and who owes it.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <div className="divide-y divide-slate-100">
                    {groupBalances.map((b) => {
                      const isYou = String(b.id) === String(currentUserId)

                      return (
                        <div
                          key={b.id}
                          className="p-4 px-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-11 w-11 rounded-full border shrink-0">
                              {b.avatarUrl && (
                                <AvatarImage
                                  src={b.avatarUrl}
                                  alt={b.name}
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-sm">
                                {getInitials(b.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 text-base block truncate">
                                {isYou ? 'You' : b.name}
                              </span>
                              <span className="text-sm font-semibold text-slate-500">
                                {b.statusText}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 text-base font-extrabold px-3.5 py-1.5 rounded-full ${
                                b.statusType === 'credit'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : b.statusType === 'settled'
                                    ? 'bg-slate-100 text-slate-400'
                                    : 'bg-orange-50 text-orange-600'
                              }`}
                            >
                              {b.statusType !== 'settled' && (
                                <span>${b.amount.toFixed(2)}</span>
                              )}
                              {b.statusText}
                            </span>

                            {isYou && b.statusType === 'debit' && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  setSettleTarget({
                                    id: b.id,
                                    name: 'this group',
                                    amount: b.amount,
                                  })
                                }
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Settle up
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* MEMBERS TAB */}
            <TabsContent value="members" className="mt-6">
              {members.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-slate-100 shadow-sm bg-white">
                  No members found in this group.
                </Card>
              ) : (
                <Card className="rounded-2xl border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-5 pb-3">
                    <h3 className="font-bold text-slate-900 text-lg">Group Roster</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Manage who has access to this shared ledger.
                    </p>
                  </CardContent>

                  <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 border-y border-slate-100 bg-slate-50/60">
                    <span>Name / Email</span>
                    <span>Role</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-4 px-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 rounded-full border shrink-0">
                            {member.profile_image_url && (
                              <AvatarImage
                                src={member.profile_image_url}
                                alt={member.name}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-base truncate">
                                {member.name}
                              </h4>
                              {member.role === 'admin' && (
                                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                              )}
                              {String(member.id) === String(currentUserId) && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white shrink-0">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-bold px-3 py-1.5 rounded-full capitalize ${
                              member.role === 'admin'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {member.role || 'member'}
                          </span>
                          {canRemoveMembers && member.role !== 'admin' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-red-200 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                setMemberToRemove({ id: member.id, name: member.name })
                              }
                              disabled={isMemberRemovePending}
                              aria-label={`Remove ${member.name} from group`}
                              title={`Remove ${member.name}`}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">Remove</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <GroupBalancesCard balances={groupBalances} isLoading={isLoadingGroup} />
      </div>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !isMemberRemovePending) setMemberToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member from group?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.name} will lose access to this group and its expenses.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMemberRemovePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmRemoveMember}
              disabled={isMemberRemovePending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isMemberRemovePending ? 'Removing...' : 'Remove member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function GroupDetailSkeleton() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  )
}