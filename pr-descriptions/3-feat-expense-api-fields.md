# PR 3 — `feat/expense-api-fields` → `fix/group-edit-permissions`

> Base is PR 2, not `main` — these branches are stacked.

## Why

The authenticated screens had nothing to render from. The user expense feed
carried only a group total, so no page could show what *you* personally owe
rather than the sum of everyone's expenses. The category list carried only
names.

## `UserExpenseListApi` gains `created_at`, `your_paid`, `your_share`

The two money fields are computed with **correlated subqueries**, not a joined
aggregate, on purpose:

```python
Q(expense_payers__user=request.user) | Q(expense_participants__user=request.user)
```

That filter spans two relations. A single joined `Sum` would multiply each
expense's payer rows against the other relation's participant rows and inflate
both figures.

## `CategoryListApi` gains `expense_count` and `your_spend`

These answer deliberately different questions on **different scopes**:

| Field | Scope | Answers |
|---|---|---|
| `expense_count` | global | "is this category in use at all?" |
| `your_spend` | requester | "what has this cost me?" |

The global scope matters because `Expense.category` is `on_delete=PROTECT` — a
category with any expense on it can never be deleted.

`your_spend` sums the viewer's *participant share*, which is what they actually
owe, rather than the full expense total which may be mostly other people's.

## Frontend

**`categoryTheme.ts`** centralises icon and tint inference, previously duplicated
in `ExpenseListItem`. Each theme gets a stable key.

`Category.icon` existed in the model but was **never written** — every category
had a guessed icon. Themes can now be chosen explicitly while keyword inference
stays the default, so existing categories render unchanged.

**`useCategoryBreakdown`** extracts category totals, grouping by category **id**
rather than name so `Food` and `food` stay separate.

## Testing

81 → 97 tests, all passing. 11 new for category stats (unused categories,
global-vs-per-user scoping, per-viewer differences on the same expense,
non-participants owing zero, the payer-who-is-also-participant case that
inflates under a naive join, icon persistence, and the `PROTECT` guarantee) plus
5 for the expense feed contract.

---
**Next:** `fix/settlement-wrong-group`