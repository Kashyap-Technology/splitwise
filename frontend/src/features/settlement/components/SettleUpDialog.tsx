import { useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, HandCoins, Loader2 } from 'lucide-react'

import { PersonAvatar } from '@/components/PersonAvatar'
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
import { getErrorMessage } from '@/lib/getErrorMessage'
import { money, parseNum } from '@/lib/initials'
import { cn } from '@/lib/utils'
import { useSettlementCreateMutation } from '@/features/settlement/api/useSettlementMutation'

/** Someone in the group who is owed money by the current user. */
export type SettlePayable = {
  id: number
  name: string
  avatarUrl?: string | null
  outstanding: number
}

/**
 * Everything the dialog needs to name the two sides of a transfer.
 *
 * The old version took a single opaque `target` that callers filled in with
 * whatever id they had lying around. That is exactly how the group page ended
 * up submitting the viewer's own id and getting "Cannot settle with self": the
 * type could not tell a receiver from a payer, so nothing stopped it. Here the
 * receiver is a real member of `payables`, and `payables` is built only from
 * people the viewer actually owes, so an invalid receiver is unrepresentable.
 */
export type SettleTarget = {
  groupId: number
  groupName: string
  payables: SettlePayable[]
  /** Receiver to preselect, e.g. when settling from a specific suggestion row. */
  initialReceiverId?: number | null
}

const CENTS = 0.01

/** Half a cent of slack, matching the tolerance the backend allows. */
const isFullAmount = (amount: number, outstanding: number) =>
  Math.abs(amount - outstanding) < 0.005

function TransferParty({
  role,
  name,
  avatarUrl,
  tone,
}: {
  role: string
  name: string
  avatarUrl?: string | null
  tone: 'blue' | 'emerald'
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <PersonAvatar
        name={name}
        src={avatarUrl}
        size="lg"
        tone={tone}
        className="h-10 w-10 sm:h-11 sm:w-11"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {role}
        </p>
        <p className="font-bold text-slate-900 truncate">{name}</p>
      </div>
    </div>
  )
}

/**
 * Remounted per receiver (via `key`) so the amount always starts at that
 * person's outstanding balance, without an effect or a render-time setState.
 */
function SettleUpForm({
  target,
  payables,
  currentUser,
  onDone,
}: {
  target: SettleTarget
  payables: SettlePayable[]
  currentUser: { name: string; avatarUrl?: string | null }
  onDone: () => void
}) {
  const { mutate: createSettlement, isPending, error, reset } =
    useSettlementCreateMutation(target.groupId)

  const [receiverId, setReceiverId] = useState(
    () => target.initialReceiverId ?? payables[0]?.id ?? 0,
  )
  const receiver = payables.find((person) => person.id === receiverId) ?? payables[0]

  const [amount, setAmount] = useState(() =>
    (receiver?.outstanding ?? 0).toFixed(2),
  )

  const outstanding = receiver?.outstanding ?? 0
  const parsed = parseNum(amount)
  const remaining = outstanding - parsed

  const overAmount = parsed > outstanding + CENTS
  const isValid = parsed > 0 && !overAmount

  const selectReceiver = (person: SettlePayable) => {
    // Clear a previous rejection: it described the old receiver and amount, so
    // leaving it up while the form shows different values reads as a fresh error.
    reset()
    setReceiverId(person.id)
    setAmount(person.outstanding.toFixed(2))
  }

  const editAmount = (value: string) => {
    reset()
    setAmount(value)
  }

  const submit = () => {
    if (!receiver || !isValid) return

    createSettlement(
      { to_user_id: receiver.id, amount: parsed },
      { onSuccess: onDone },
    )
  }

  return (
    <>
      <div className="space-y-5 py-1">
        {/* The two sides of the transfer, stated outright. The previous dialog
            only ever showed an amount, so there was no way to tell from the UI
            who was about to receive the money. */}
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
          {/* Two equal columns on mobile (the "Paying"/"Receiving" roles carry
              the meaning), a single row with an arrow from `sm` up. */}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TransferParty
              role="Paying"
              name={currentUser.name}
              avatarUrl={currentUser.avatarUrl}
              tone="blue"
            />

            <div className="hidden sm:flex flex-col items-center gap-0.5 text-blue-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                pays
              </span>
              <ArrowRight className="h-5 w-5" aria-hidden />
            </div>

            <TransferParty
              role="Receiving"
              name={receiver?.name ?? 'Select someone'}
              avatarUrl={receiver?.avatarUrl}
              tone="emerald"
            />
          </div>

          <p className="text-xs font-medium text-slate-500 sm:border-t sm:border-slate-200 sm:pt-3">
            {receiver
              ? `You owe ${receiver.name} $${money(outstanding)} in ${target.groupName}.`
              : 'Select who you are paying.'}
          </p>
        </div>

        {payables.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-700 mb-1">
              Who are you paying?
            </legend>
            <div className="space-y-2" role="radiogroup" aria-label="Who are you paying?">
              {payables.map((person) => {
                const isSelected = person.id === receiver?.id

                return (
                  <button
                    key={person.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => selectReceiver(person)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <PersonAvatar
                      name={person.name}
                      src={person.avatarUrl}
                      size="md"
                      tone="emerald"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">
                        {person.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        You owe ${money(person.outstanding)}
                      </p>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <div className="space-y-2">
          <Label htmlFor="settle-amount" className="text-base">
            Amount you&apos;re paying
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">
              $
            </span>
            <Input
              id="settle-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => editAmount(event.target.value)}
              className="h-12 rounded-xl border-slate-200 text-xl font-bold pl-7"
            />
          </div>

          {amount !== '' && overAmount && (
            <p className="text-sm text-red-500 font-medium">
              That&apos;s more than the ${money(outstanding)} you owe {receiver?.name}.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => editAmount(outstanding.toFixed(2))}
            >
              Pay in full
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => editAmount((outstanding / 2).toFixed(2))}
            >
              Half
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => editAmount((outstanding / 4).toFixed(2))}
            >
              Quarter
            </Button>
          </div>

          {isValid && remaining > 0.005 && (
            <p className="text-sm text-slate-500 font-medium">
              ${money(remaining)} will still be owed to {receiver?.name} after this
              payment.
            </p>
          )}
          {isValid && isFullAmount(parsed, outstanding) && (
            <p className="text-sm text-emerald-600 font-medium">
              This clears your balance with {receiver?.name}.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5"
          >
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">
              {getErrorMessage(error)}
            </p>
          </div>
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
          disabled={!isValid || isPending || !receiver}
          onClick={submit}
          className="text-base bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {receiver
                ? `Pay ${receiver.name.split(' ')[0]} $${money(parsed)}`
                : 'Record payment'}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

export function SettleUpDialog({
  target,
  currentUser,
  onOpenChange,
}: {
  target: SettleTarget | null
  currentUser: { name: string; avatarUrl?: string | null }
  onOpenChange: (open: boolean) => void
}) {
  const isOpen = Boolean(target)
  const payables = target?.payables ?? []

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HandCoins className="h-5 w-5 text-blue-600" />
            Settle up
          </DialogTitle>
          <DialogDescription className="pt-1 text-base text-slate-600">
            {target ? (
              payables.length > 0 ? (
                <>
                  Record a payment in <span className="font-semibold text-slate-800">{target.groupName}</span>.
                  This marks money you already handed over as settled.
                </>
              ) : (
                <>You are not owed money in {target.groupName}, so there is nothing to settle.</>
              )
            ) : (
              'Record a payment to clear what you owe.'
            )}
          </DialogDescription>
        </DialogHeader>

        {target && payables.length === 0 && (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-slate-900">All settled up</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Nobody in {target.groupName} is waiting on money from you.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}

        {target && payables.length > 0 && (
          <SettleUpForm
            key={`${target.groupId}:${target.initialReceiverId ?? 'auto'}`}
            target={target}
            payables={payables}
            currentUser={currentUser}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}