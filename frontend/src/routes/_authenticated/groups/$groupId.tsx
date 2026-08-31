import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Receipt,
  Wallet,
  Utensils,
  Car,
  Landmark,
  Lightbulb,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/groups/$groupId')({
  component: GroupDetailComponent,
})

// Mock API Fetcher (Replace with your actual API call)
const fetchGroupDetails = async (groupId: string) => {
  // Simulating API delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  return {
    id: groupId,
    name: 'Kastha Mandap Trip',
    description: 'This is a trip to kasthamandap',
    totalSpend: 2450.0,
    totalExpensesCount: 18,
    userBalance: -125.5, // Negative = owes, Positive = lent
    settlePeopleCount: 2,
    expenses: [
      {
        id: '1',
        title: 'Dinner at Patan',
        date: 'Oct 12',
        paidBy: 'Sarah',
        icon: Utensils,
        totalAmount: 180.0,
        yourAmount: -45.0, // Owe
      },
      {
        id: '2',
        title: 'Taxi to Temple',
        date: 'Oct 11',
        paidBy: 'You',
        icon: Car,
        totalAmount: 24.0,
        yourAmount: 18.0, // Lent
      },
      {
        id: '3',
        title: 'Museum Tickets',
        date: 'Oct 11',
        paidBy: 'Mike',
        icon: Landmark,
        totalAmount: 60.0,
        yourAmount: -15.0, // Owe
      },
    ],
    balances: [
      {
        id: 'u1',
        name: 'Sarah',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        statusText: 'Gets back',
        amount: 85.5,
        statusType: 'credit',
      },
      {
        id: 'u2',
        name: 'Mike',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        statusText: 'Gets back',
        amount: 40.0,
        statusType: 'credit',
      },
      {
        id: 'u3',
        name: 'Emma',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        statusText: 'Settled up',
        amount: 0,
        statusType: 'settled',
      },
    ],
  }
}

function GroupDetailComponent() {
  const { groupId } = Route.useParams()

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroupDetails(groupId),
  })

  if (isLoading) {
    return <GroupDetailSkeleton />
  }

  if (!group) return <div>Group not found</div>

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {group.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{group.description}</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 h-11 flex items-center gap-2 font-medium shadow-sm shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Group Spend Card */}
        <Card className="rounded-3xl border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Receipt className="w-4 h-4 text-slate-400" />
              <span>Total Group Spend</span>
            </div>
            <div className="mt-4 text-4xl font-extrabold text-slate-900">
              ${group.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50 text-xs">
            <span className="text-slate-500">Across {group.totalExpensesCount} expenses</span>
            <button className="text-blue-600 font-semibold hover:underline">
              View breakdown
            </button>
          </div>
        </Card>

        {/* Your Balance Card */}
        <Card className="rounded-3xl border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Wallet className="w-4 h-4 text-slate-400" />
              <span>Your Balance</span>
            </div>
            <div className="mt-3">
              <span className="text-sm font-semibold text-slate-500">You owe</span>
              <div className="text-4xl font-extrabold text-orange-600 mt-0.5">
                ${Math.abs(group.userBalance).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Decorative Wallet Icon Background */}
          <Wallet className="absolute right-4 bottom-2 w-28 h-28 text-orange-200/40 pointer-events-none" />

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50 text-xs relative z-10">
            <span className="text-slate-500">To {group.settlePeopleCount} people</span>
            <button className="text-blue-600 font-semibold hover:underline">
              Settle balances
            </button>
          </div>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (Expenses Tab & List) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="bg-transparent p-0 h-auto gap-8 border-b border-slate-200 w-full justify-start rounded-none">
              <TabsTrigger
                value="expenses"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-0 pb-3 font-semibold text-slate-500 data-[state=active]:text-blue-600 text-sm"
              >
                Expenses
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
                Members (4)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="mt-6 space-y-3">
              {group.expenses.map((expense) => {
                const IconComponent = expense.icon
                const isOwe = expense.yourAmount < 0

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
                          <p className="text-xs text-slate-400 mt-0.5">
                            {expense.date} • Paid by {expense.paidBy}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Total
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            ${expense.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="min-w-[70px]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isOwe ? 'You owe' : 'You lent'}
                          </span>
                          <span
                            className={`font-bold text-sm ${
                              isOwe ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            ${Math.abs(expense.yourAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              <div className="pt-4 text-center">
                <button className="text-sm font-semibold text-blue-600 hover:underline">
                  Load more expenses
                </button>
              </div>
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

        {/* Right Sidebar (Group Balances & Pro Tip) */}
        <div className="space-y-6">
          {/* Group Balances Sidebar Card */}
          <Card className="rounded-3xl border-0 shadow-sm bg-slate-100/70 p-6 space-y-6">
            <h3 className="font-bold text-slate-900 text-base">Group Balances</h3>

            <div className="space-y-4">
              {group.balances.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-slate-800">
                      {member.name}
                    </span>
                  </div>

                  <div className="text-right">
                    {member.statusType === 'settled' ? (
                      <span className="text-slate-400 text-[11px]">Settled up</span>
                    ) : (
                      <>
                        <span className="text-slate-400 text-[10px] block">
                          {member.statusText}
                        </span>
                        <span className="font-bold text-emerald-600">
                          ${member.amount.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full rounded-2xl border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold h-11 text-xs"
            >
              Record a Payment
            </Button>
          </Card>

          {/* Pro Tip Card */}
          <Card className="rounded-3xl border-0 shadow-sm bg-blue-50/70 p-5 flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600 shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-xs">Pro Tip</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect your bank account to settle balances directly through Splitsy
                without switching apps.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Skeleton state while query is loading
function GroupDetailSkeleton() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    </div>
  )
}