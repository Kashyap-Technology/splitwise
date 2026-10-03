import { ArrowRight, Check } from 'lucide-react'

import { PersonAvatar } from '@/components/PersonAvatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SettlementParty = {
  id: number
  name: string
  avatarUrl?: string | null
  /** True when this party is the viewer, for the "You" substitution. */
  isViewer?: boolean
}

/**
 * One "who pays whom" line.
 *
 * The previous version rendered two bold names separated by the word "pays",
 * which is unreadable on a phone and gave no indication of who the current user
 * was in the middle of the sentence. Each side now carries its own avatar and
 * role label, and the viewer is called out as "You".
 */
export function SettlementRow({
  from,
  to,
  amount,
  onSettle,
  settleLabel = 'Settle',
  className,
}: {
  from: SettlementParty
  to: SettlementParty
  amount: number
  onSettle?: () => void
  settleLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'p-4 px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50/60 transition-colors',
        className,
      )}
    >
      {/* Stacks on mobile so both faces stay readable instead of being squeezed
          into two truncated one-word columns. */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <PartyChip party={from} tone="blue" />
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
          pays
          <ArrowRight className="h-3.5 w-3.5 text-blue-500" aria-hidden />
        </span>
        <PartyChip party={to} tone="emerald" />
      </div>

      <div className="flex items-center gap-3 shrink-0 sm:justify-end">
        <span className="text-base font-extrabold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full tabular-nums">
          ${amount.toFixed(2)}
        </span>
        {onSettle && (
          <Button
            type="button"
            size="sm"
            onClick={onSettle}
            className="rounded-xl text-base bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <Check className="h-4 w-4" />
            {settleLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

function PartyChip({
  party,
  tone,
}: {
  party: SettlementParty
  tone: 'blue' | 'emerald'
}) {
  const label = party.isViewer ? 'You' : party.name

  return (
    <div className="flex items-center gap-2 min-w-0">
      <PersonAvatar
        name={party.name}
        src={party.avatarUrl}
        size="sm"
        tone={tone}
        className="h-8 w-8"
      />
      <span className="font-bold text-slate-900 truncate" title={party.name}>
        {label}
      </span>
    </div>
  )
}