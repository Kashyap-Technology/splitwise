import { Lightbulb } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'

import type { GroupBalance } from './types'

export function GroupBalancesCard({ balances }: { balances: GroupBalance[] }) {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm bg-slate-100/70 p-6 space-y-6">
        <h3 className="font-bold text-slate-900 text-base">Group Balances</h3>

        <div className="space-y-4">
          {balances.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>{member.name[0]}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-slate-800">{member.name}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {member.statusText}
                </span>
                <span
                  className={`font-bold text-sm ${
                    member.statusType === 'credit'
                      ? 'text-emerald-600'
                      : member.statusType === 'settled'
                        ? 'text-slate-400'
                        : 'text-orange-600'
                  }`}
                >
                  {member.amount > 0 ? `$${member.amount.toFixed(2)}` : 'Settled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-0 shadow-sm bg-amber-50/50 p-6 flex gap-3 items-start">
        <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900/80 leading-relaxed">
          <span className="font-semibold block text-amber-950 mb-0.5">Pro Tip</span>
          Expenses added with equal splits are automatically recalculated based on
          selected payers and participants.
        </div>
      </Card>
    </div>
  )
}
