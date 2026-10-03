import type { GroupSettlementSuggestion } from '@/features/group/types/group.types'
import type { SettlePayable } from '@/features/settlement/components/SettleUpDialog'
import { parseNum } from '@/lib/initials'

/** Half a cent, matching the tolerance used elsewhere for float dust. */
const MIN_AMOUNT = 0.005

type MemberLike = {
  id: number
  name: string
  profile_image_url?: string | null
}

type Direction = 'outgoing' | 'incoming'

/**
 * Collapse a group's settlement suggestions into the counterparties on one side
 * of the viewer, with the amount owed to or by each.
 *
 * A suggestion without ids cannot be attributed to anyone, so it is skipped
 * rather than guessed at with a name comparison.
 */
function collect({
  suggestions,
  currentUserId,
  members,
  direction,
}: {
  suggestions: GroupSettlementSuggestion[]
  currentUserId: number
  members: MemberLike[]
  direction: Direction
}): SettlePayable[] {
  const nameById = new Map(members.map((m) => [String(m.id), m.name]))
  const avatarById = new Map(
    members.map((m) => [String(m.id), m.profile_image_url ?? null]),
  )

  const isMine = (id: number | null | undefined) =>
    id !== null && id !== undefined && String(id) === String(currentUserId)

  const totals = new Map<string, number>()

  for (const suggestion of suggestions) {
    const viewerIsPayer = isMine(suggestion.from_user_id)
    const viewerIsReceiver = isMine(suggestion.to_user_id)

    if (viewerIsPayer === viewerIsReceiver) continue // both or neither
    if (direction === 'outgoing' ? !viewerIsPayer : !viewerIsReceiver) continue

    const counterpartyId = viewerIsPayer ? suggestion.to_user_id : suggestion.from_user_id
    const counterpartyName = viewerIsPayer ? suggestion.to_user : suggestion.from_user
    if (counterpartyId === null || counterpartyId === undefined) continue

    const amount = parseNum(suggestion.amount)
    if (amount <= MIN_AMOUNT) continue

    const key = String(counterpartyId)
    // Accumulate: a non-minimal plan can list the same counterparty twice, and
    // the total shown has to be the real one.
    totals.set(key, (totals.get(key) ?? 0) + amount)

    if (!nameById.has(key)) nameById.set(key, counterpartyName)
    if (!avatarById.has(key)) avatarById.set(key, null)
  }

  return Array.from(totals.entries())
    .filter(([, amount]) => amount > MIN_AMOUNT)
    .map(([id, amount]) => ({
      id: Number(id),
      name: nameById.get(id) ?? 'Someone',
      avatarUrl: avatarById.get(id) ?? null,
      outstanding: amount,
    }))
    .sort((a, b) => b.outstanding - a.outstanding)
}

/**
 * Who the viewer owes, and how much.
 *
 * This is the piece that was missing. The group page used to pass its own
 * logged-in id as the settlement receiver, because a net balance row only says
 * "you owe $200 overall" and never says who to. The suggestions are the only
 * place the pair is stated, so the receiver has to be read off them.
 *
 * Returns an empty list when the viewer owes nobody, which the settle dialog
 * turns into an explicit "all settled up" rather than a request the backend
 * would reject with "You are not owed money in this group".
 */
export function buildPayables({
  suggestions,
  currentUserId,
  members,
}: {
  suggestions: GroupSettlementSuggestion[]
  currentUserId?: number
  members: MemberLike[]
}): SettlePayable[] {
  if (currentUserId === undefined) return []
  return collect({ suggestions, currentUserId, members, direction: 'outgoing' })
}

/** Who owes the viewer, for display only. Never a valid settlement receiver. */
export function buildIncoming({
  suggestions,
  currentUserId,
  members,
}: {
  suggestions: GroupSettlementSuggestion[]
  currentUserId?: number
  members: MemberLike[]
}): SettlePayable[] {
  if (currentUserId === undefined) return []
  return collect({ suggestions, currentUserId, members, direction: 'incoming' })
}