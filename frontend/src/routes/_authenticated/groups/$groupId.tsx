import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Car,
  Landmark,
  Receipt,
  Utensils,
  Wallet,
  Tag,
} from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  CreateExpenseInput,
  expenseSchema,
} from '@/features/expense/schemas/expenseSchema'
import { useGroupMemberQuery } from '@/features/group/api/useGroupsQuery'
import { useCreateExpenseMutation } from '@/features/expense/api/useExpenseMutation'
import { useExpenseQuery ,useExpenseCategoryQuery} from '@/features/expense/api/useExpenseQuery'

import { ExpenseFormDialog } from './components/ExpenseFormDialog'
import { GroupBalancesCard } from './components/GroupBalancesCard'
import { GroupHeader } from './components/GroupHeader'
import { SummaryCard } from './components/SummaryCard'

export const Route = createFileRoute('/_authenticated/groups/$groupId')({
  component: GroupDetailComponent,
})

const fetchGroupDetails = async (groupId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 400))

  return {
    id: groupId,
    name: 'Kastha Mandap Trip',
    description: 'This is a trip to kasthamandap',
    totalSpend: 2450.0,
    totalExpensesCount: 18,
    userBalance: -125.5,
    settlePeopleCount: 2,
    balances: [
      {
        id: 'u1',
        name: 'Sarah',
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        statusText: 'Gets back',
        amount: 85.5,
        statusType: 'credit',
      },
      {
        id: 'u2',
        name: 'Mike',
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        statusText: 'Gets back',
        amount: 40.0,
        statusType: 'credit',
      },
      {
        id: 'u3',
        name: 'Emma',
        avatarUrl:
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        statusText: 'Settled up',
        amount: 0,
        statusType: 'settled',
      },
    ],
  }
}

// Helper to resolve an icon based on category name
const getCategoryIcon = (categoryName?: string) => {
  const normalized = categoryName?.toLowerCase() || ''
  if (normalized.includes('food') || normalized.includes('dinner')) return Utensils
  if (normalized.includes('travel') || normalized.includes('taxi')) return Car
  if (normalized.includes('sightseeing') || normalized.includes('museum')) return Landmark
  return Receipt
}

function GroupDetailComponent() {
  const { groupId } = Route.useParams()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: group, isLoading: isLoadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroupDetails(groupId),
  })

  const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenseQuery()
  const { data: categories, isLoading: isLoadingCategories } = useExpenseCategoryQuery()
  const { data: members, isLoading: isLoadingMembers } = useGroupMemberQuery()
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

  const {
    control,
    handleSubmit,
    reset,
  } = form

  const watchedAmount = useWatch({ control, name: 'amount' }) || 0

  const onSubmit = (data: CreateExpenseInput) => {
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
          setIsDialogOpen(false)
          reset()
        },
        onError: (err) => {
          console.error('Failed to create expense:', err)
        },
      }
    )
  }

  if (isLoadingGroup) return <GroupDetailSkeleton />
  if (!group) return <div>Group not found</div>

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <GroupHeader
        name={group.name}
        description={group.description}
        onAddExpense={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          icon={<Receipt className="w-4 h-4 text-slate-400" />}
          label="Total Group Spend"
          value={group.totalSpend}
          meta={`Across ${expenses.length || group.totalExpensesCount} expenses`}
          actionLabel="View breakdown"
        />

        <div className="relative overflow-hidden">
          <SummaryCard
            icon={<Wallet className="w-4 h-4 text-slate-400" />}
            label="Your Balance"
            value={Math.abs(group.userBalance)}
            valueClassName="text-orange-600"
            prefixText="You owe"
            meta={`To ${group.settlePeopleCount} people`}
            actionLabel="Settle balances"
          />
          <Wallet className="absolute right-4 bottom-4 w-28 h-28 text-orange-200/40 pointer-events-none" />
        </div>
      </div>

      <ExpenseFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        form={form}
        categories={categories}
        isLoadingCategories={isLoadingCategories}
        members={members}
        isLoadingMembers={isLoadingMembers}
        watchedAmount={watchedAmount}
        isPending={isPending}
        onSubmit={handleSubmit(onSubmit)}
        onCancel={() => {
          setIsDialogOpen(false)
          reset()
        }}
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
                Members ({members?.length || 0})
              </TabsTrigger>
            </TabsList>

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

              {expenses.length > 0 && (
                <div className="pt-4 text-center">
                  <button className="text-sm font-semibold text-blue-600 hover:underline">
                    Load more expenses
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="balances" className="mt-6">
              <Card className="p-6 rounded-2xl border-0 shadow-sm text-slate-500 text-sm">
                Balances breakdown view goes here.
              </Card>
            </TabsContent>

            <TabsContent value="members" className="mt-6">
              <Card className="p-6 rounded-2xl border-0 shadow-sm text-slate-500 text-sm">
                Group members list view goes here.
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <GroupBalancesCard balances={group.balances} />
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