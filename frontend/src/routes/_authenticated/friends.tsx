import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Wallet,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  Info,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/_authenticated/friends')({
  component: RouteComponent,
})

interface FriendBalance {
  id: string
  name: string
  subtitle: string
  avatar: string
  fallback: string
  status: 'owe' | 'owed'
  amount: string
}

const initialBalances: FriendBalance[] = [
  {
    id: '1',
    name: 'Alice Cooper',
    subtitle: 'Last active 2 hrs ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    fallback: 'AC',
    status: 'owe',
    amount: '$45.00',
  },
  {
    id: '2',
    name: 'Bob Builder',
    subtitle: 'Settled 3 days ago',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    fallback: 'BB',
    status: 'owed',
    amount: '$120.50',
  },
  {
    id: '3',
    name: 'Charlie Day',
    subtitle: "In 'Weekend Trip'",
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
    fallback: 'CD',
    status: 'owe',
    amount: '$100.50',
  },
]

function RouteComponent() {
  const [balances, setBalances] = useState<FriendBalance[]>(initialBalances)
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<string>('Alice Cooper')

  const handleSettleUp = (e: React.FormEvent) => {
    e.preventDefault()
    setBalances(balances.filter((b) => b.name !== selectedFriend))
    setIsSettleModalOpen(false)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols) - Balances List Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Balances</h1>
              <p className="text-sm text-slate-500 mt-1">
                You owe <span className="font-bold text-rose-500">$145.50</span> in total
              </p>
            </div>

            <Dialog open={isSettleModalOpen} onOpenChange={setIsSettleModalOpen}>
              <DialogTrigger render={
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2.5 flex items-center gap-2 shadow-md shadow-blue-500/20">
                  <Wallet className="w-4 h-4" />
                  <span className="font-semibold text-sm">Settle Up</span>
                </Button>
              }/>
              <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Settle Balance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSettleUp} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="friend">Select Friend</Label>
                    <select
                      id="friend"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      value={selectedFriend}
                      onChange={(e) => setSelectedFriend(e.target.value)}
                    >
                      {balances.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} ({b.amount})
                        </option>
                      ))}
                    </select>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsSettleModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Confirm Settlement
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-100">
            {balances.length > 0 ? (
              balances.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3.5">
                    <Avatar className="w-11 h-11 border border-slate-100">
                      <AvatarImage src={item.avatar} alt={item.name} />
                      <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                        {item.fallback}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  {/* Right: Status, Amount & Action */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {item.status === 'owe' ? (
                        <span className="text-xs font-bold text-rose-500 block">
                          You owe <span className="text-sm ml-1">{item.amount}</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-500 block">
                          Owes you <span className="text-sm ml-1">{item.amount}</span>
                        </span>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setSelectedFriend(item.name)
                        setIsSettleModalOpen(true)
                      }}
                    >
                      {item.status === 'owe' ? (
                        <ArrowRightLeft className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4 text-blue-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                🎉 All balances are settled up!
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col) - Widgets */}
        <div className="space-y-6">
          {/* Simplification Blue Banner Card */}
          <div className="relative bg-blue-600 rounded-3xl p-6 text-white overflow-hidden shadow-lg shadow-blue-500/20">
            {/* Background Watermark Icon */}
            <Info className="absolute top-4 right-4 w-16 h-16 text-white/10 pointer-events-none" />

            <h3 className="font-bold text-lg">Simplification</h3>
            <p className="text-xs text-blue-100 mt-1 max-w-[220px] leading-relaxed">
              We found an easier way to settle all debts in the group.
            </p>

            {/* Steps Container */}
            <div className="my-5 space-y-2">
              <div className="bg-blue-500/50 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                <span>You pay Alice</span>
                <span className="font-bold text-sm">$25.00</span>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-3.5 h-3.5 text-blue-200" />
              </div>

              <div className="bg-blue-500/50 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                <span>Bob pays you</span>
                <span className="font-bold text-sm">$100.00</span>
              </div>
            </div>

            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl py-2.5 text-xs">
              View Details
            </Button>
          </div>

          {/* Debt Free Status Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 border-l-4 border-l-emerald-500 shadow-sm flex items-start gap-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-900">Debt Free</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                You are all settled up in 'Dinner at Mario's'. Great job!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}