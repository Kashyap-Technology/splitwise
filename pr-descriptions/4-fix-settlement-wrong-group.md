# PR 4 — `fix/settlement-wrong-group` → `feat/expense-api-fields`

> Base is PR 3, not `main` — these branches are stacked.

## Bug: settlements recorded against the wrong group

The mutation posts to `/settlements/{group_id}/create/`, but `groupId` was taken
from the **first debt in the list** while the dropdown let you pick **any**:

```ts
const activeGroupId = debtsIOwe[0]?.group.id || currentSettlements[0]?.group.id || 1
```

Settling a debt in a second group therefore debited the **first** one —
silently, with a `201` and `"Settlement recorded successfully"`.

Reproduced against a scratch group: with a $15 debt in group 8 and $175 in
group 1, posting to group 1 returned 201 and moved **group 1's** balance.

When there were no debts at all the fallback was a hardcoded `|| 1` — an
arbitrary group the user may not even belong to.

Each row now carries its own group, so settling posts to the right one. The
fallback is gone rather than replaced with another guess.

## Page rebuilt around that

- Balances grouped **per group** with per-group totals, instead of one flat
  list mixing groups.
- Each row settles independently, reusing the group page's `SettleUpDialog`, so
  partial payments and the "pay in full" / "half" shortcuts behave identically
  on both pages.
- `settlement_history` was fetched and **never displayed**. There is now a
  history dialog plus a recent-settlements card.
- Stats cards for you-owe / owed-to-you / net.
- Real empty and error states.
- Settle up is **disabled** rather than active when there's nothing to settle.

### Dead control removed

The bell icon on "Owes you" rows did nothing. The backend rejects a settlement
when the sender's balance is positive, so only the **debtor** can record one —
that icon could never work. Those rows are read-only now and say so.

## Testing

97 tests, all passing. `tsc` and `vite build` clean.

The wrong-group behaviour was verified against the live API before and after;
the page layouts are **not visually verified** — no browser was connected.

---
**Next:** `feat/page-overhauls`