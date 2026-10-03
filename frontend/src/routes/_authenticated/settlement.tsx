import { useMemo, useState, type CSSProperties } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FolderKanban,
  HandCoins,
  History,
  TrendingUp,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PersonAvatar } from '@/components/PersonAvatar'
import { StatCard } from '@/components/StatCard'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserSettlementQuery } from '@/features/group/api/useGroupsQuery'
import type {
  UserSettlement,
  UserSettlementResponse,
} from '@/features/group/types/group.types'
import {
  SettleUpDialog,
  type SettlePayable,
  type SettleTarget,
} from '@/features/settlement/components/SettleUpDialog'
import { money, parseNum } from '@/lib/initials'

export const Route = createFileRoute('/_authenticated/settlement')({
  component: SettlementPage,
})

// Direction is "paid" when the viewer is the sender, so they owe the receiver.
// Balances are keyed by group because a settlement is recorded against one
// group: settling a debt in "Damak Trip" posts to that group's endpoint.
type GroupBucket = {
  id: number
  name: string
  debts: UserSettlement[]
  credits: UserSettlement[]
  toPay: number
  toReceive: number
}

const bucketKey = (settlement: UserSettlement) =>
  `${settlement.group.id}:${settlement.direction === 'paid' ? settlement.to_user.id : settlement.from_user.id}`

function SettlementPage() {
  const { data, isLoading, isError } = useUserSettlementQuery()
  const { user: currentUser } = useAuth()
  const [settleDraft, setSettleDraft] = useState<SettleTarget | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const settlements = useMemo(() => data?.current_settlements ?? [], [data])
  const history = useMemo(() => data?.settlement_history ?? [], [data])

  const currentUserName = currentUser?.data?.name ?? currentUser?.name ?? 'You'
  const currentUserAvatarUrl =
    currentUser?.data?.profile_image_url ?? currentUser?.profile_image_url ?? null

  const totalToPay = parseNum(data?.summary?.total_to_pay)
  const totalToReceive = parseNum(data?.summary?.total_to_receive)
  const net = totalToReceive - totalToPay

  const groups = useMemo(() => {
    const byId = new Map<number, GroupBucket>()

    for (const settlement of settlements) {
      const groupId = settlement.group.id
      const amount = parseNum(settlement.amount)

      let bucket = byId.get(groupId)
      if (!bucket) {
        bucket = { id: groupId, name: settlement.group.name, debts: [], credits: [], toPay: 0, toReceive: 0 }
        byId.set(groupId, bucket)
      }

      if (settlement.direction === 'paid') {
        bucket.debts.push(settlement)
        bucket.toPay += amount
      } else {
        bucket.credits.push(settlement)
        bucket.toReceive += amount
      }
    }

    // Largest outstanding debt first, so the thing most worth paying is on top.
    return Array.from(byId.values()).sort(
      (a, b) => b.toPay + b.toReceive - (a.toPay + a.toReceive),
    )
  }, [settlements])

  const openDebts = settlements.filter((s) => s.direction === 'paid')
  const groupsOwedMoney = groups.filter((group) => group.toReceive > 0).length

  // Everyone the viewer owes, per group. Passing the whole list (not just the
  // clicked row) is what lets the dialog offer switching between people owed in
  // the same group instead of locking you to whichever row you happened to tap.
  const payablesByGroup = useMemo(() => {
    const map = new Map<number, SettlePayable[]>()

    for (const settlement of settlements) {
      if (settlement.direction !== 'paid') continue

      const groupId = settlement.group.id
      const amount = parseNum(settlement.amount)
      if (amount <= 0.005) continue

      const list = map.get(groupId) ?? []
      const existing = list.find((person) => person.id === settlement.to_user.id)

      if (existing) {
        existing.outstanding += amount
      } else {
        list.push({
          id: settlement.to_user.id,
          name: settlement.to_user.name,
          avatarUrl: settlement.to_user.profile_image_url ?? null,
          outstanding: amount,
        })
      }

      map.set(groupId, list)
    }

    for (const list of map.values()) {
      list.sort((a, b) => b.outstanding - a.outstanding)
    }

    return map
  }, [settlements])

  // The backend rejects a settlement when the sender's balance is positive, so
  // only the debtor can record one. "Owes you" rows are therefore read-only.
  const openSettle = (settlement: UserSettlement) => {
    const groupId = settlement.group.id

    setSettleDraft({
      groupId,
      groupName: settlement.group.name,
      payables: payablesByGroup.get(groupId) ?? [],
      initialReceiverId: settlement.to_user.id,
    })
  }

  if (isError) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
        <h3 className="font-semibold text-lg text-slate-900">Failed to load balances</h3>
        <p className="text-sm text-slate-500">
          Something went wrong fetching your settlements. Please try again.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 anim-rise">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Balances</h1>
          <p className="text-sm text-slate-500 mt-1">
            {openDebts.length === 0 && totalToReceive === 0
              ? 'Everything is settled up across your groups.'
              : net > 0
                ? `You are owed ${money(net)} overall.`
                : net < 0
                  ? `You owe ${money(Math.abs(net))} overall.`
                  : 'You are owed exactly what you owe.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsHistoryOpen(true)}
            className="rounded-xl border-slate-200 text-slate-700 gap-2 font-semibold"
          >
            <History className="w-4 h-4" />
            <span>History</span>
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 rounded-full text-[10px] px-1.5">
                {history.length}
              </Badge>
            )}
          </Button>

          {/* Disabled rather than hidden: with nothing to settle there is no
              target to send, and a dead button is more confusing than a clear
              disabled one. */}
          <Button
            type="button"
            disabled={openDebts.length === 0}
            onClick={() => openDebts[0] && openSettle(openDebts[0])}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-semibold shadow-md shadow-blue-500/20"
          >
            <HandCoins className="w-4 h-4" />
            <span>Settle up</span>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<ArrowUpRight className="w-5 h-5" />}
          label="You owe"
          value={totalToPay}
          tone="rose"
          caption={
            totalToPay > 0
              ? `Across ${openDebts.length} payment${openDebts.length === 1 ? '' : 's'}`
              : 'Nothing outstanding'
          }
          className="anim-rise anim-stagger"
          style={{ '--anim-i': 1 } as CSSProperties}
        />
        <StatCard
          icon={<ArrowDownLeft className="w-5 w-5" />}
          label="Owed to you"
          value={totalToReceive}
          tone="emerald"
          caption={totalToReceive > 0 ? 'Waiting on payments' : 'Nothing incoming'}
          className="anim-rise anim-stagger"
          style={{ '--anim-i': 2 } as CSSProperties}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Net position"
          value={Math.abs(net)}
          className="anim-rise anim-stagger"
          style={{ '--anim-i': 3 } as CSSProperties}
          tone={net > 0 ? 'emerald' : net < 0 ? 'rose' : 'slate'}
          signed
          caption={
            net > 0 ? 'In your favour' : net < 0 ? 'Against you' : 'Square'
          }
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              {[0, 1].map((row) => (
                <Skeleton key={row} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 rounded-2xl shadow-none bg-white/60">
              <CardContent className="p-12 text-center">
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-500 inline-flex mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">All settled up</h3>
                <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm mx-auto">
                  Nobody owes you anything and you owe nobody. Add expenses in a group
                  and balances show up here as they accrue.
                </p>
                <Button
                  render={<Link to="/groups" />}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold gap-2"
                >
                  <FolderKanban className="w-4 h-4" />
                  Go to groups
                </Button>
              </CardContent>
            </Card>
          ) : (
            groups.map((group, groupIndex) => (
              <Card
                key={group.id}
                className="border-slate-100 shadow-sm rounded-2xl overflow-hidden anim-rise anim-stagger"
                style={{ '--anim-i': groupIndex } as CSSProperties}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                        <Users className="w-4 h-4" />
                      </span>
                      <Link
                        to="/groups/$groupId"
                        params={{ groupId: String(group.id) }}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                      >
                        {group.name}
                      </Link>
                    </div>

                    <div className="text-right shrink-0">
                      {group.toPay > 0 ? (
                        <span className="text-xs font-bold text-rose-500">
                          You owe {money(group.toPay)}
                        </span>
                      ) : group.toReceive > 0 ? (
                        <span className="text-xs font-bold text-emerald-600">
                          Owed {money(group.toReceive)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Settled</span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.debts.map((settlement) => (
                      <BalanceRow
                        key={bucketKey(settlement)}
                        party={settlement.to_user}
                        avatarUrl={settlement.to_user.profile_image_url}
                        label="You owe · tap settle up to record a payment"
                        verb="You pay"
                        amount={parseNum(settlement.amount)}
                        tone="owe"
                        onSettle={() => openSettle(settlement)}
                      />
                    ))}

                    {group.credits.map((settlement) => (
                      <BalanceRow
                        key={bucketKey(settlement)}
                        party={settlement.from_user}
                        avatarUrl={settlement.from_user.profile_image_url}
                        label={`${settlement.from_user.name} owes you`}
                        verb="Waiting on"
                        amount={parseNum(settlement.amount)}
                        tone="owed"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <h3 className="font-bold text-slate-900">Group summary</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your standing across {groups.length} group{groups.length === 1 ? '' : 's'}.
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2.5">
                  <span className="text-xs font-semibold text-slate-600">To pay</span>
                  <span className="text-sm font-bold text-rose-600">
                    ${money(totalToPay)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                  <span className="text-xs font-semibold text-slate-600">To receive</span>
                  <span className="text-sm font-bold text-emerald-600">
                    ${money(totalToReceive)}
                  </span>
                </div>
              </div>

              {groupsOwedMoney > 0 && (
                <p className="mt-4 text-xs text-slate-500">
                  {groupsOwedMoney} group{groupsOwedMoney === 1 ? '' : 's'} still owe you
                  money.
                </p>
              )}
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card className="border-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 text-sm">Recent settlements</h3>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-0 h-auto text-xs font-bold text-blue-600 hover:no-underline"
                  >
                    View all
                  </Button>
                </div>

                <div className="space-y-3">
                  {history.slice(0, 4).map((settlement, index) => (
                    <HistoryRow
                      key={settlement.id ?? index}
                      settlement={settlement}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalToPay === 0 && totalToReceive === 0 && (
            <Card className="border-slate-100 border-l-4 border-l-emerald-500 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-start gap-3.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Debt free</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You are all settled up.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SettleUpDialog
        target={settleDraft}
        currentUser={{ name: currentUserName, avatarUrl: currentUserAvatarUrl }}
        onOpenChange={(open) => !open && setSettleDraft(null)}
      />

      <SettlementHistoryDialog
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        history={history}
      />
    </div>
  )
}


function BalanceRow({
  party,
  avatarUrl,
  label,
  verb,
  amount,
  tone,
  onSettle,
}: {
  party: { id: number; name: string }
  avatarUrl?: string | null
  label: string
  verb: string
  amount: number
  tone: 'owe' | 'owed'
  onSettle?: () => void
}) {
  return (
    <div className="p-4 px-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <PersonAvatar
          name={party.name}
          src={avatarUrl}
          size="md"
          tone={tone === 'owe' ? 'rose' : 'emerald'}
        />

        <div className="min-w-0">
          {/* `verb` leads and the party name follows, so "You pay Bob" reads
              unambiguously even out of context. The verb must therefore never
              contain the party's own name: it used to be built as
              `${from_user.name} pays`, and since `party` is the same person that
              rendered "Pawan Shrestha pays Pawan Shrestha" on the balances page.
              The money direction is also on screen rather than implied by colour
              alone. */}
          <p className="font-bold text-slate-900 truncate">
            {verb} <span className="font-extrabold">{party.name}</span>
          </p>
          <p className="text-xs font-medium text-slate-400">{label}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
        <span
          className={`font-extrabold tabular-nums ${
            tone === 'owe' ? 'text-rose-500' : 'text-emerald-600'
          }`}
        >
          ${money(amount)}
        </span>

        {onSettle && (
          <Button
            type="button"
            size="sm"
            onClick={onSettle}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Settle up
          </Button>
        )}
      </div>
    </div>
  )
}

function HistoryRow({ settlement }: { settlement: UserSettlement }) {
  const youPaid = settlement.direction === 'paid'
  const other = youPaid ? settlement.to_user : settlement.from_user

  return (
    <div className="flex items-center gap-2.5">
      <PersonAvatar
        name={other.name}
        src={other.profile_image_url}
        size="sm"
        tone="emerald"
      />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-800 truncate">
          {youPaid ? `You paid ${other.name}` : `${other.name} paid you`}
        </p>
        <p className="text-[11px] text-slate-400 font-medium truncate">
          {settlement.group.name}
          {settlement.created_at
            ? ` · ${new Date(settlement.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}`
            : ''}
        </p>
      </div>

      <span className="text-xs font-bold text-emerald-600 shrink-0 tabular-nums">
        ${money(parseNum(settlement.amount))}
      </span>
    </div>
  )
}

function SettlementHistoryDialog({
  isOpen,
  onOpenChange,
  history,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  history: UserSettlementResponse['settlement_history']
}) {
  const total = history.reduce((sum, item) => sum + parseNum(item.amount), 0)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settlement history</DialogTitle>
          <DialogDescription>
            {history.length === 0
              ? 'No payments have been recorded yet.'
              : `${history.length} payment${history.length === 1 ? '' : 's'} recorded, totalling $${money(total)}.`}
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="py-8 text-center">
            <History className="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nothing recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              Payments you record appear here as an audit trail.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((settlement, index) => (
              <HistoryRow key={settlement.id ?? index} settlement={settlement} />
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}