import { createFileRoute } from '@tanstack/react-router'
import {
  Car,
  Landmark,
  Receipt,
  Utensils,
  Wallet,
  Tag,
  ShieldCheck,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import {
  CreateExpenseInput,
  expenseSchema,
} from '@/features/expense/schemas/expenseSchema'
import { useGroupDetailQuery } from '@/features/group/api/useGroupsQuery'
import { useCreateExpenseMutation } from '@/features/expense/api/useExpenseMutation'
import { useExpenseCategoryQuery } from '@/features/expense/api/useExpenseQuery'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useInviteMemberMutation } from '@/features/group/api/useInviteMemberMutation'
import { useGroupUpdateMutation } from '@/features/group/api/useGroupMutation'

import { ExpenseFormDialog } from './components/ExpenseFormDialog'
import { InviteMemberDialog } from './components/InviteMemberDialog'
import { GroupBalancesCard } from './components/GroupBalancesCard'
import { GroupHeader } from './components/GroupHeader'
import { SummaryCard } from './components/SummaryCard'
import type { GroupBalance } from './components/types'
import { EditGroupDialog } from './components/EditGroupDialog'

export interface SettlementSuggestion {
  from_user: string
  to_user: string
  amount: number
}

export const Route = createFileRoute('/_authenticated/groups/$groupId')({
  component: GroupDetailComponent,
})

const getCategoryIcon = (categoryName?: string) => {
  const normalized = categoryName?.toLowerCase() || ''
  if (normalized.includes('food') || normalized.includes('dinner')) return Utensils
  if (normalized.includes('travel') || normalized.includes('taxi')) return Car
  if (normalized.includes('sightseeing') || normalized.includes('museum')) return Landmark
  return Receipt
}

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

// Helper to normalize settlement suggestions from root payload or nested summary
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
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)

  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?.data?.id ?? currentUser?.id

  const { data: group, isLoading: isLoadingGroup } = useGroupDetailQuery(groupId)
  const expenses = group?.expenses ?? []
  const members = group?.members ?? []

  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategoryQuery()
  const { mutate: inviteMember, isPending: isInvitePending } = useInviteMemberMutation()
  const { mutate: createExpense, isPending: isExpensePending } = useCreateExpenseMutation()
  const { mutate: updateGroup, isPending: isUpdateGroupPending } = useGroupUpdateMutation(groupId)

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

  const onExpenseSubmit = (data: CreateExpenseInput) => {
    const payerCount = data.payers.length
    const share = payerCount > 0 ? Number((data.amount / payerCount).toFixed(2)) : 0

    const payload = {
      ...data,
      payers: data.payers.map((payer) => ({
        user_id: Number(payer.user_id),
        amount_paid: String(share),
      })),
      participants: data.participants.map((participant) => ({
        user_id: Number(participant.user_id),
      })),
    }

    createExpense(
      { groupId, data: payload },
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

  if (isLoadingGroup) return <GroupDetailSkeleton />
  if (!group) return <div className="p-10 text-center text-slate-500">Group not found</div>

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <GroupHeader
        name={group.name}
        description={group.description || 'No description provided'}
        groupImageUrl={group.group_image_url}
        onEditGroup={()=>setIsEditGroupDialogOpen(true)}
        onAddExpense={() => setIsExpenseDialogOpen(true)}
        onAddMember={() => setIsMemberDialogOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          icon={<Receipt className="w-4 h-4 text-slate-400" />}
          label="Total Group Spend"
          value={parseNum(group.summary?.total_expenses)}
          meta={`Across ${expenses.length} expenses`}
          actionLabel="View breakdown"
        />

        <div className="relative overflow-hidden">
          <SummaryCard
            icon={<Wallet className="w-4 h-4 text-slate-400" />}
            label="Your Balance"
            value={yourBalance}
            valueClassName={yourBalanceColorClass}
            prefixText={yourBalancePrefix}
            meta={`To ${peopleInvolvedCount} people`}
            actionLabel="Settle balances"
          />
          <Wallet className="absolute right-4 bottom-4 w-28 h-28 text-orange-200/40 pointer-events-none" />
        </div>
      </div>
      <EditGroupDialog
        isOpen={isEditGroupDialogOpen}
        onOpenChange={setIsEditGroupDialogOpen}
        group={group}
        isPending={isUpdateGroupPending}
        onSave={(formData) => {
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
        isPending={isExpensePending}
        onSubmit={handleSubmit(onExpenseSubmit)}
        onCancel={() => {
          setIsExpenseDialogOpen(false)
          reset()
        }}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="bg-transparent p-0 h-auto gap-8 border-b border-slate-200 w-full justify-start rounded-none">
              <TabsTrigger
                value="expenses"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-sm"
              >
                Expenses ({expenses.length})
              </TabsTrigger>
              <TabsTrigger
                value="balances"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-sm"
              >
                Balances
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-sm"
              >
                Members ({members.length})
              </TabsTrigger>
            </TabsList>

            {/* EXPENSES TAB */}
            <TabsContent value="expenses" className="mt-6 space-y-3">
              {expenses.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-0 shadow-sm bg-white">
                  No expenses added yet. Click &quot;Add Expense&quot; to get started!
                </Card>
              ) : (
                expenses.map((expense) => {
                  const IconComponent = getCategoryIcon(expense.category_name)
                  const parsedTotal = parseNum(expense.amount)

                  // Calculate the current user's personal net share for this expense
                  const primaryPayer = expense.payers?.[0]?.user
                  const isPaidByCurrentUser = String(primaryPayer?.id) === String(currentUserId)
                  const payerName = isPaidByCurrentUser
                    ? 'You'
                    : primaryPayer?.name || 'Unknown'

                  const userParticipant = expense.participants?.find(
                    (p) => String(p.user?.id) === String(currentUserId)
                  )
                  const userPayer = expense.payers?.find(
                    (p) => String(p.user?.id) === String(currentUserId)
                  )

                  const userPaidAmount = parseNum(userPayer?.amount_paid)
                  const userShareAmount = parseNum(userParticipant?.amount_to_pay)
                  const netUserAmount = userPaidAmount - userShareAmount

                  const formattedDate = expense.created_at
                    ? new Date(expense.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                    : ''

                  return (
                    <Card
                      key={expense.id}
                      className="rounded-2xl border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        {/* Left Section: Icon + Title/Metadata */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-3 bg-slate-100 rounded-full text-slate-500 shrink-0">
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="font-semibold text-slate-900 text-lg truncate">
                              {expense.title}
                            </h4>
                            <p className=" text-slate-400  truncate">
                              {formattedDate && `${formattedDate} · `}Paid by {payerName}
                            </p>
                          </div>
                        </div>

                        {/* Right Section: Total & Personal Balance Split */}
                        <div className="flex items-center gap-4 shrink-0 pl-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Total
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              ${parsedTotal.toFixed(2)}
                            </span>
                          </div>

                          <div className="h-7 w-[1px] bg-slate-200" />

                          <div className="text-right min-w-[70px]">
                            {netUserAmount > 0 ? (
                              <>
                                <span className="text-[10px] text-emerald-600 font-medium block">
                                  You lent
                                </span>
                                <span className="font-bold text-emerald-600 text-sm">
                                  ${netUserAmount.toFixed(2)}
                                </span>
                              </>
                            ) : netUserAmount < 0 ? (
                              <>
                                <span className="text-[10px] text-orange-600 font-medium block">
                                  You owe
                                </span>
                                <span className="font-bold text-orange-600 text-sm">
                                  ${Math.abs(netUserAmount).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  Not involved
                                </span>
                                <span className="font-bold text-slate-400 text-sm">
                                  $0.00
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>

            {/* BALANCES TAB */}
            <TabsContent value="balances" className="mt-6 space-y-6">
              {/* SETTLEMENT SUGGESTIONS */}
              {settlementSuggestions.length > 0 && (
                <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-5 pb-2">
                    <h3 className="font-bold text-slate-900 text-base">Optimal Settlement Payments</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Minimizes total transactions needed to clear debts.
                    </p>
                  </CardContent>
                  <div className="divide-y divide-slate-100">
                    {settlementSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-4 px-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-sm text-slate-800 min-w-0">
                          <span className="font-bold text-slate-900 truncate">{s.from_user}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                            pays <ArrowRight className="w-3.5 h-3.5 text-blue-500 inline" />
                          </span>
                          <span className="font-bold text-slate-900 truncate">{s.to_user}</span>
                        </div>

                        <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full shrink-0">
                          ${s.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* INDIVIDUAL BALANCES */}
              {groupBalances.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-0 shadow-sm bg-white">
                  No balance data yet.
                </Card>
              ) : (
                <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-5 pb-2">
                    <h3 className="font-bold text-slate-900 text-base">Net Balances</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Individual balance summary for all members.
                    </p>
                  </CardContent>
                  <div className="divide-y divide-slate-100">
                    {groupBalances.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 px-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 rounded-full border shrink-0">
                            {b.avatarUrl && (
                              <AvatarImage
                                src={b.avatarUrl}
                                alt={b.name}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xs">
                              {getInitials(b.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-slate-800 text-sm truncate">
                            {String(b.id) === String(currentUserId) ? 'You' : b.name}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${b.statusType === 'credit'
                              ? 'bg-emerald-50 text-emerald-600'
                              : b.statusType === 'settled'
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-orange-50 text-orange-600'
                            }`}
                        >
                          {b.statusText}
                          {b.statusType !== 'settled' && ` $${b.amount.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* MEMBERS TAB */}
            <TabsContent value="members" className="mt-6">
              {members.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-0 shadow-sm bg-white">
                  No members found in this group.
                </Card>
              ) : (
                <Card className="rounded-2xl border-0 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-5 pb-3">
                    <h3 className="font-bold text-slate-900 text-base">Group Roster</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manage who has access to this shared ledger.
                    </p>
                  </CardContent>

                  <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-y border-slate-100 bg-slate-50/60">
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
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {member.name}
                              </h4>
                              {member.role === 'admin' && (
                                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                              )}
                              {String(member.id) === String(currentUserId) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${member.role === 'admin'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                        >
                          {member.role || 'member'}
                        </span>
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
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  )
}