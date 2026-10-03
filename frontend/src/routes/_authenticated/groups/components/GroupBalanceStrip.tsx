import { CheckCircle2, HandCoins, TrendingDown, TrendingUp } from 'lucide-react'

import { PersonAvatar } from '@/components/PersonAvatar'
import { Button } from '@/components/ui/button'
import type { SettlePayable } from '@/features/settlement/components/SettleUpDialog'
import { money } from '@/lib/initials'

type Counterparty = SettlePayable & { direction: 'owes' | 'owed' }

/**
 * States the viewer's real outstanding position for a group, and who it is with.
 *
 * The expense list's per-row "You owe $X" is a share of a single expense and is
 * correct to keep showing after a settlement, but next to a freshly paid-up
 * balance it reads as a contradiction. This strip gives the number that actually
 * moved, so the two are never confused.
 */
export function GroupBalanceStrip({
  yourBalanceRaw,
  counterparties,
  onSettle,
}: {
  yourBalanceRaw: number
  counterparties: Counterparty[]
  onSettle?: () => void
}) {
  const settled = Math.abs(yourBalanceRaw) < 0.005
  const youOwe = yourBalanceRaw < 0
  const amount = Math.abs(yourBalanceRaw)

  const headline = settled
    ? 'You are settled up in this group'
    : youOwe
      ? `You owe $${money(amount)}`
      : `You are owed $${money(amount)}`

  const detail = settled
    ? 'Every expense here has been paid back. Nothing outstanding.'
    : `${youOwe ? 'Owed to' : 'Owed by'} ${describe(counterparties, 'anyone')} · per-expense shares below`

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${
        settled
          ? 'border-emerald-100 bg-emerald-50/60'
          : youOwe
            ? 'border-orange-100 bg-orange-50/60'
            : 'border-blue-100 bg-blue-50/60'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              settled
                ? 'bg-emerald-100 text-emerald-600'
                : youOwe
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-blue-100 text-blue-600'
            }`}
          >
            {settled ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : youOwe ? (
              <TrendingDown className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )}
          </span>

          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-base">{headline}</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{detail}</p>
          </div>
        </div>

        {onSettle && (
          <Button
            type="button"
            onClick={onSettle}
            className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 self-start sm:self-auto"
          >
            <HandCoins className="h-4 w-4" />
            Settle up
          </Button>
        )}
      </div>

      {/* Everyone in the viewer's debt chain, with faces, so the group is
          recognisable at a glance instead of a wall of names. */}
      {counterparties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200/70">
          {counterparties.map((person) => (
            <span
              key={`${person.direction}-${person.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 max-w-full"
            >
              <PersonAvatar
                name={person.name}
                src={person.avatarUrl}
                size="xs"
                tone={person.direction === 'owes' ? 'amber' : 'blue'}
                className="border-0"
              />
              <span className="truncate max-w-[7rem]">{person.name}</span>
              <span
                className={`tabular-nums ${
                  person.direction === 'owes' ? 'text-orange-600' : 'text-emerald-600'
                }`}
              >
                {person.direction === 'owes' ? '-' : '+'}
                {money(person.outstanding)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function describe(people: Counterparty[], fallback: string): string {
  const names = people.map((person) => person.name)

  if (names.length === 0) return fallback
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
}