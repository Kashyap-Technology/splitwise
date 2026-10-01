import { useState } from 'react'
import { ArrowRight, Check, HandCoins, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettlementCreateMutation } from '@/features/settlement/api/useSettlementMutation'

export type SettleTarget = { id: number | string; name: string; amount: number }

const parseNum = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(n) ? 0 : n
}

// Remounted per target (via `key`) so the amount always starts at the full
// outstanding balance without an effect or a render-time setState.
function SettleUpForm({
  groupId,
  target,
  onDone,
}: {
  groupId: string
  target: SettleTarget
  onDone: () => void
}) {
  const { mutate: createSettlement, isPending } = useSettlementCreateMutation(
    Number(groupId),
  )

  const [amount, setAmount] = useState(() => target.amount.toFixed(2))

  const parsed = parseNum(amount)
  const isValid = parsed > 0 && parsed <= target.amount + 0.001
  const remaining = target.amount - parsed

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="settle-amount" className="text-base">
            Amount you&apos;re paying
          </Label>
          <Input
            id="settle-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-12 rounded-xl border-slate-200 text-xl font-bold"
          />
          {amount !== '' && !isValid && (
            <p className="text-sm text-red-500 font-medium">
              Enter an amount between $0.01 and ${target.amount.toFixed(2)}.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setAmount(target.amount.toFixed(2))}
          >
            Pay in full
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setAmount((target.amount / 2).toFixed(2))}
          >
            Half
          </Button>
        </div>

        {isValid && remaining > 0.001 && (
          <p className="text-sm text-slate-500 font-medium">
            ${remaining.toFixed(2)} will still be owed after this payment.
          </p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isPending}
          className="text-base"
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!isValid || isPending}
          onClick={() =>
            createSettlement(
              { to_user_id: Number(target.id), amount: parsed },
              { onSuccess: onDone },
            )
          }
          className="text-base bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Record payment
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

export function SettleUpDialog({
  groupId,
  target,
  onOpenChange,
}: {
  groupId: string
  target: SettleTarget | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HandCoins className="h-5 w-5 text-blue-600" />
            Settle your balance
          </DialogTitle>
          <DialogDescription className="pt-1 text-base text-slate-600">
            You currently owe {target ? `$${target.amount.toFixed(2)}` : '$0.00'}.
            Record a payment to reduce that balance.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <SettleUpForm
            key={String(target.id)}
            groupId={groupId}
            target={target}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SettlementRow({
  fromUser,
  toUser,
  amount,
  onSettle,
}: {
  fromUser: string
  toUser: string
  amount: number
  onSettle?: () => void
}) {
  return (
    <div className="p-4 px-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-center gap-2.5 font-semibold text-base text-slate-800 min-w-0">
        <span className="font-bold text-slate-900 truncate">{fromUser}</span>
        <span className="text-sm text-slate-400 flex items-center gap-1 shrink-0">
          pays <ArrowRight className="h-4 w-4 text-blue-500 inline" />
        </span>
        <span className="font-bold text-slate-900 truncate">{toUser}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-base font-extrabold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full">
          ${amount.toFixed(2)}
        </span>
        {onSettle && (
          <Button
            type="button"
            size="sm"
            onClick={onSettle}
            className="rounded-xl text-base bg-blue-600 hover:bg-blue-700 text-white"
          >
            Settle up
          </Button>
        )}
      </div>
    </div>
  )
}