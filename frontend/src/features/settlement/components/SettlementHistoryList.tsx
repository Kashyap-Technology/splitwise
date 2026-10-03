import { HandCoins } from 'lucide-react'

import { PersonAvatar } from '@/components/PersonAvatar'
import { parseNum } from '@/lib/initials'
import type { GroupSettlementRecord } from '@/features/group/types/group.types'

/**
 * Recorded payments for one group, newest first.
 *
 * The group payload already carried these settlements but nothing rendered them;
 * they were only counted in a summary card's sub-label. Without them a settled
 * group and an unsettled one look identical, which is exactly the "is this
 * actually working?" question that settles get asked.
 */
export function SettlementHistoryList({
  settlements,
  currentUserId,
  emptyHint = 'Payments recorded in this group will show up here.',
}: {
  settlements: GroupSettlementRecord[]
  currentUserId?: number
  emptyHint?: string
}) {
  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-2 py-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <HandCoins className="h-5 w-5" />
        </span>
        <p className="text-sm font-bold text-slate-700">No payments recorded yet</p>
        <p className="text-xs text-slate-400 max-w-xs">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {settlements.map((settlement) => {
        const fromIsViewer = String(settlement.from_user?.id) === String(currentUserId)
        const toIsViewer = String(settlement.to_user?.id) === String(currentUserId)

        const payerName = fromIsViewer ? 'You' : settlement.from_user?.name ?? 'Someone'
        const receiverName = toIsViewer ? 'You' : settlement.to_user?.name ?? 'Someone'

        return (
          <div
            key={settlement.id}
            className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <PersonAvatar
                name={settlement.from_user?.name}
                src={settlement.from_user?.profile_image_url}
                size="sm"
                tone="blue"
              />
              <span className="font-bold text-slate-900 truncate">{payerName}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                paid
              </span>
              <PersonAvatar
                name={settlement.to_user?.name}
                src={settlement.to_user?.profile_image_url}
                size="sm"
                tone="emerald"
              />
              <span className="font-bold text-slate-900 truncate">{receiverName}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
              <span className="text-xs font-medium text-slate-400">
                {formatDate(settlement.created_at)}
              </span>
              <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                ${parseNum(settlement.amount).toFixed(2)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}