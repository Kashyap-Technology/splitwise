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
} from 'lucide-react'
import { useState } from 'react'
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
import {
  useGroupDetailQuery,
  useGroupMemberQuery,
  useGroupBalanceQuery,
} from '@/features/group/api/useGroupsQuery'
import { useCreateExpenseMutation } from '@/features/expense/api/useExpenseMutation'
import {
  useExpenseQuery,
  useExpenseCategoryQuery,
} from '@/features/expense/api/useExpenseQuery'
import { useAuth } from '@/features/auth/hooks/useAuth' 

import { ExpenseFormDialog } from './components/ExpenseFormDialog'
import {InviteMemberDialog} from './components/InviteMemberDialog'
import { GroupBalancesCard } from './components/GroupBalancesCard'
import { GroupHeader } from './components/GroupHeader'
import { SummaryCard } from './components/SummaryCard'
import type { GroupBalance } from './components/types'
import {useInviteMemberMutation} from '@/features/group/api/useInviteMemberMutation'

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
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

// balanceMap = { "1": 480.16, "2": -469.84, "3": -10.32 }
// key is user_id (string), value is that user's net balance in the group
function normalizeBalanceMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  if ('data' in raw && typeof (raw as any).data === 'object') {
    return (raw as any).data as Record<string, number>
  }
  return raw as Record<string, number>
}

function buildGroupBalances(
  balanceMap: Record<string, number>,
  members: { id: number; name: string; avatarUrl?: string }[]
): GroupBalance[] {
  return members
    .filter((member) => balanceMap[String(member.id)] !== undefined)
    .map((member) => {
      const amount = balanceMap[String(member.id)]
      const statusType: GroupBalance['statusType'] =
        amount > 0 ? 'credit' : amount < 0 ? 'debit' : 'settled'
      const statusText =
        statusType === 'credit'
          ? 'Gets back'
          : statusType === 'debit'
            ? 'Owes'
            : 'Settled up'

      return {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        amount: Math.abs(amount),
        statusType,
        statusText,
      }
    })
}

function GroupDetailComponent() {
  const { groupId } = Route.useParams()
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)

  const { user: currentUser } = useAuth()
  console.log('current User',currentUser)

  const { data: group, isLoading: isLoadingGroup } = useGroupDetailQuery(groupId)
  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenseQuery()
  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategoryQuery()
  const { data: members = [], isLoading: isLoadingMembers } = useGroupMemberQuery(groupId)
  const { data: balance, isLoading: isLoadingBalance } = useGroupBalanceQuery(groupId)
  const {mutate:inviteMember,isPending:isInvitePending}=useInviteMemberMutation()

  const { mutate, isPending } = useCreateExpenseMutation()

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

  const totalSpend = expenses.reduce(
    (acc, exp) => acc + (Number(exp.amount) || 0),
    0
  )

  // balance = { success, message, data: { "1": 480.16, ... } }
const balanceMap = normalizeBalanceMap(balance)
console.log('balanceMap', balanceMap)

const groupBalances = buildGroupBalances(balanceMap, members)

const yourBalanceRaw = currentUser ? balanceMap[String(currentUser.data.id)] ?? 0 : 0
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
    (b) => b.id !== currentUser?.id && b.statusType !== 'settled'
  ).length


  //expse onSubmit
  const onExpenseSubmit = (data: CreateExpenseInput) => {
    const payerCount = data.payers.length
    const share =
      payerCount > 0 ? Number((data.amount / payerCount).toFixed(2)) : 0

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

    mutate(
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

   const onMemberSubmit= ( ) => {
    console.log('hello invite memebers here')
  }
  if (isLoadingGroup) return <GroupDetailSkeleton />
  if (!group) return <div className="p-10 text-center text-slate-500">Group not found</div>

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <GroupHeader
        name={group.name}
        description={group.description || 'No description provided'}
        onAddExpense={() => setIsExpenseDialogOpen(true)}
        onAddMember={() => setIsMemberDialogOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          icon={<Receipt className="w-4 h-4 text-slate-400" />}
          label="Total Group Spend"
          value={totalSpend}
          meta={`Across ${expenses.length} expenses`}
          actionLabel="View breakdown"
        />

        <div className="relative overflow-hidden">
          <SummaryCard
            icon={<Wallet className="w-4 h-4 text-slate-400" />}
            label="Your Balance"
            value={isLoadingBalance ? 0 : yourBalance}
            valueClassName={yourBalanceColorClass}
            prefixText={yourBalancePrefix}
            meta={`To ${peopleInvolvedCount} people`}
            actionLabel="Settle balances"
          />
          <Wallet className="absolute right-4 bottom-4 w-28 h-28 text-orange-200/40 pointer-events-none" />
        </div>
      </div>

      <ExpenseFormDialog
        isOpen={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        form={form}
        categories={categories}
        isLoadingCategories={isLoadingCategories}
        members={members}
        isLoadingMembers={isLoadingMembers}
        watchedAmount={watchedAmount}
        isPending={isPending}
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
              {isLoadingExpenses ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : expenses.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-0 shadow-sm bg-white">
                  No expenses added yet. Click "Add Expense" to get started!
                </Card>
              ) : (
                expenses.map((expense) => {
                  const IconComponent = getCategoryIcon(expense.category_name)
                  const parsedAmount = Number(expense.amount) || 0

                  return (
                    <Card
                      key={expense.id}
                      className="rounded-2xl border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-100 rounded-full text-slate-600 shrink-0">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {expense.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 capitalize">
                              <Tag className="w-3 h-3 inline" />
                              {expense.category_name || 'Uncategorized'} • Split: {expense.split_type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Total
                            </span>
                            <span className="font-bold text-slate-900 text-sm">
                              ${parsedAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>

            {/* BALANCES TAB */}
            <TabsContent value="balances" className="mt-6">
              {isLoadingBalance ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              ) : groupBalances.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-0 shadow-sm bg-white">
                  No balance data yet.
                </Card>
              ) : (
                <div className="space-y-3">
                  {groupBalances.map((b) => (
                    <Card key={b.id} className="rounded-2xl border-0 shadow-sm bg-white">
                      <CardContent className="p-4 flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-sm">
                          {b.name}
                        </span>
                        <span
                          className={`font-bold text-sm ${
                            b.statusType === 'credit'
                              ? 'text-emerald-600'
                              : b.statusType === 'settled'
                                ? 'text-slate-400'
                                : 'text-orange-600'
                          }`}
                        >
                          {b.statusText}
                          {b.statusType !== 'settled' && `: $${b.amount.toFixed(2)}`}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* MEMBERS TAB */}
            <TabsContent value="members" className="mt-6">
              {isLoadingMembers ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              ) : members.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 rounded-2xl border-0 shadow-sm bg-white">
                  No members found in this group.
                </Card>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <Card
                      key={member.id}
                      className="rounded-2xl border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-sm">
                                {member.name}
                              </h4>
                              {member.role === 'admin' && (
                                <ShieldCheck className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                            member.role === 'admin'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {member.role || 'member'}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <GroupBalancesCard balances={groupBalances} isLoading={isLoadingBalance} />
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