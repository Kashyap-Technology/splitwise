import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Wallet,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUserSettlementQuery } from '@/features/group/api/useGroupsQuery'
import { useSettlementCreateMutation } from '@/features/settlement/api/useSettlementMutation'

export const Route = createFileRoute('/_authenticated/settlement')({
  component: RouteComponent,
})

// --- TYPES MATCHING YOUR API RESPONSE ---
interface User {
  id: number
  name: string
  email: string
}

interface Group {
  id: number
  name: string
}

interface Settlement {
  id: number | null
  group: Group
  from_user: User
  to_user: User
  amount: string
  direction: 'paid' | 'received'
  status: string
  created_at: string | null
}

interface SettlementSummary {
  current_settlement_count: number
  history_count: number
  total_to_pay: number | string
  total_to_receive: number | string
}

// Helper to get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Dynamic Zod Schema for validation
const formSchema = z
  .object({
    friendId: z.string().min(1, 'Please select a friend.'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  })

function RouteComponent() {
  const { data, isLoading } = useUserSettlementQuery()
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false)
  
  const currentSettlements = data?.current_settlements || []
  
  const summary: SettlementSummary = data?.summary || { 
    current_settlement_count: 0, 
    history_count: 0, 
    total_to_pay: 0, 
    total_to_receive: 0 
  }

  const debtsIOwe = currentSettlements.filter((s) => s.direction === 'paid')
  const activeGroupId = debtsIOwe[0]?.group.id || currentSettlements[0]?.group.id || 1

  const { mutate, isPending } = useSettlementCreateMutation(activeGroupId)

  const form = useForm<z.input<typeof formSchema>, any, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      friendId: '',
      amount: 0,
    },
  })

  // Refine schema validation for max limit dynamically using form values
  const onSubmit = (values: z.output<typeof formSchema>) => {
    const settlement = debtsIOwe.find((s) => s.to_user.id.toString() === values.friendId)
    if (settlement) {
      const maxAmount = parseFloat(settlement.amount)
      if (values.amount > maxAmount) {
        form.setError('amount', {
          type: 'custom',
          message: `Amount cannot exceed the $${maxAmount.toFixed(2)} you owe.`,
        })
        return
      }
    }

    mutate(
      {
        to_user_id: Number(values.friendId),
        amount: values.amount,
      },
      {
        onSuccess: () => {
          setIsSettleModalOpen(false)
          form.reset()
        },
      }
    )
  }

  const handleQuickSettle = (userId: number, maxAmount: number) => {
    form.setValue('friendId', userId.toString())
    form.setValue('amount', maxAmount)
    setIsSettleModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const totalToPayNum = Number(summary.total_to_pay) || 0
  const totalToReceiveNum = Number(summary.total_to_receive) || 0

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column - Balances List Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Balances</h1>
              <p className="text-sm text-slate-500 mt-1">
                You owe <span className="font-bold text-rose-500">${totalToPayNum.toFixed(2)}</span> in total
              </p>
            </div>

            <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
              <DialogTrigger render={

                <Button 
                  onClick={() => form.reset()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2.5 flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="font-semibold text-sm">Settle Up</span>
                </Button>
              }/>
              <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Settle Balance</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                  <Field>
                    <FieldLabel>Select Friend</FieldLabel>
                    <Controller
                      control={form.control}
                      name="friendId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600">
                            <SelectValue placeholder="Who are you paying?" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {debtsIOwe.map((s) => {
                              const amountNum = parseFloat(s.amount)
                              return (
                                <SelectItem key={s.to_user.id} value={s.to_user.id.toString()}>
                                  {s.to_user.name} (Owe ${amountNum.toFixed(2)})
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.friendId && (
                      <FieldError>{form.formState.errors.friendId.message}</FieldError>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel>Amount to Settle</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500">$</span>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="pl-7 h-10 rounded-xl border-slate-200 focus-visible:ring-blue-600"
                        {...form.register('amount')} 
                      />
                    </div>
                    {form.formState.errors.amount && (
                      <FieldError>{form.formState.errors.amount.message}</FieldError>
                    )}
                  </Field>

                  <DialogFooter className="pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsSettleModalOpen(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Confirm Settlement'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="divide-y divide-slate-100">
            {currentSettlements.length > 0 ? (
              currentSettlements.map((item, idx) => {
                const isOwe = item.direction === 'paid'
                const displayUser = isOwe ? item.to_user : item.from_user
                const amountNum = parseFloat(item.amount)

                return (
                  <div key={item.id ?? idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <Avatar className="w-11 h-11 border border-slate-100">
                        <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                          {getInitials(displayUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{displayUser.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">In '{item.group.name}'</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {isOwe ? (
                          <span className="text-xs font-bold text-rose-500 block">
                            You owe <span className="text-sm ml-1">${amountNum.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-500 block">
                            Owes you <span className="text-sm ml-1">${amountNum.toFixed(2)}</span>
                          </span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          if (isOwe) {
                            handleQuickSettle(displayUser.id, amountNum)
                          }
                        }}
                      >
                        {isOwe ? (
                          <ArrowRightLeft className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                🎉 All balances are settled up!
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-6">
          <div className="relative bg-blue-600 rounded-3xl p-6 text-white overflow-hidden shadow-lg shadow-blue-500/20">
            <Info className="absolute top-4 right-4 w-16 h-16 text-white/10 pointer-events-none" />
            <h3 className="font-bold text-lg">Group Summary</h3>
            <p className="text-xs text-blue-100 mt-1 max-w-[220px] leading-relaxed">
              Your overall standing in current active groups.
            </p>

            <div className="my-5 space-y-2">
              <div className="bg-blue-500/50 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                <span>Total to pay</span>
                <span className="font-bold text-sm text-rose-200">${totalToPayNum.toFixed(2)}</span>
              </div>
              
              <div className="bg-blue-500/50 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                <span>Total to receive</span>
                <span className="font-bold text-sm text-emerald-200">${totalToReceiveNum.toFixed(2)}</span>
              </div>
            </div>

            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl py-2.5 text-xs">
              View History ({summary.history_count})
            </Button>
          </div>

          {totalToPayNum === 0 && totalToReceiveNum === 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-100 border-l-4 border-l-emerald-500 shadow-sm flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-slate-900">Debt Free</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  You are all settled up! Great job.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}