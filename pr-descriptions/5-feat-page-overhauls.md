# PR 5 — `feat/page-overhauls` → `fix/settlement-wrong-group`

> Base is PR 4, not `main` — these branches are stacked. 7 commits.

## Four screens were rendering hardcoded data

The dashboard's entire surface was fabricated: `+$452.80`, "Alex Chen", an
Unsplash avatar, five invented transactions, three invented groups.
`/categories` was a `Hello` div. `/expenses` had working markup wired to dead
controls — "Add Expense" cleared its own form and never called the API, and
"Filter" and "This Month" had no handlers at all.

They now read from the endpoints added in PR 3.

- **Dashboard** — net balance, you-owe/you're-owed, recent activity with
  per-expense lent/owe, live group cards, 6-month spending trend, category
  breakdown. Greets the signed-in user and uses their real avatar.
- **/expenses** — working category/group/date-range filters, four sort orders,
  grouping by day or group with subtotals, stats strip. Filter options derive
  from the data so they cannot go stale.
- **/categories** — usage stats per category, search, three sort orders, icon
  picker.
- **Group page** — the category filter listed only categories this group had
  *used*, so newly created ones stayed hidden until an expense referenced them.
  Members card counts are dynamic and pluralise correctly. "View breakdown"
  opened the add-expense dialog.

## Three smaller bugs

**`__all__` rendered into the UI.** Base UI resolves a Select's trigger label
from its `items` prop; without one it stringifies the raw value, so the filter
sentinel was visible.

**Hardcoded sidebar badges.** "3" groups and "2 Owed" regardless of truth, and
"Settings" pointed at `/settings`, which is not a route and 404'd.

**Day-bucket labels** were rebuilt by re-parsing the key as a date string,
making correctness depend on the format happening to be padded ISO that `Date`
treats as UTC.

## Client-side split validation

Frontend counterpart to the split engine in PR 1. The schema accepted payer and
participant totals the server rejects, so users filled in a form, submitted, and
got a generic error after the fact.

- `activePayers` drops $0 payers — `MinValueValidator` rejects them server-side,
  but "Alice paid all of it, Bob paid nothing" is legitimate
- exact/percentage totals validated here too, with an epsilon for float noise
- negative owed amounts rejected — the model rejects them, and a negative share
  silently flips who owes whom
- duplicate payers/participants caught early, since the backend keys by
  `user_id` and a repeat would collapse and lose money

> This is a **separate commit** rather than folded into PR 1: it has to land
> before the pages compile, so it sits here. If you'd prefer it in PR 1 that's an
> interactive rebase.

## Testing

97 → 98 tests, all passing. `tsc -b --force`, `vite build` and `ruff` clean;
`oxlint` 0 errors.

Each branch in this series was verified individually — checked out, suite run,
`tsc` and `vite build` — not just the tip.

## ⚠️ Not visually verified

**No browser was connected during this work.** Layout and responsive behaviour
are unconfirmed across the dashboard, expenses, settlement, categories, and the
breakdown and edit-group dialogs. Compile checks and unit tests pass; nobody has
looked at these pages. Worth a manual pass before merging.

---
All five PRs merged → deploy. Remember migration `0008` from PR 1 rewrites two
tables on first run — see that PR before deploying.